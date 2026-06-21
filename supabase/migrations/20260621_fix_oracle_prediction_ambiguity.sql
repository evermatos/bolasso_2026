-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create or replace function public.get_oracle_prediction(target_match_id bigint)
returns table (
  match_id bigint,
  pick text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_pick text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1 from public.matches where id = target_match_id
  ) then
    raise exception 'Jogo não encontrado.';
  end if;

  selected_pick := (
    array['home', 'draw', 'away']
  )[1 + floor(random() * 3)::integer];

  insert into public.oracle_predictions (user_id, match_id, pick)
  values (auth.uid(), target_match_id, selected_pick)
  on conflict on constraint oracle_predictions_pkey do nothing;

  return query
  select
    op.match_id,
    op.pick,
    op.created_at
  from public.oracle_predictions op
  where op.user_id = auth.uid()
    and op.match_id = target_match_id;
end;
$$;

revoke all on function public.get_oracle_prediction(bigint) from public;
grant execute on function public.get_oracle_prediction(bigint) to authenticated;

commit;
