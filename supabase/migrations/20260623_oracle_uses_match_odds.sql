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
  favorite_pick text;
  hash_value text;
  hash_roll integer;
  fallback_slot integer;
  remaining_picks text[];
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1 from public.matches where id = target_match_id
  ) then
    raise exception 'Jogo não encontrado.';
  end if;

  select mo.favorite_pick
  into favorite_pick
  from public.match_odds mo
  where mo.match_id = target_match_id;

  hash_value := md5(auth.uid()::text || ':' || target_match_id::text);
  hash_roll := mod(
    ((position(substr(hash_value, 1, 1) in '0123456789abcdef') - 1) * 4096)
    + ((position(substr(hash_value, 2, 1) in '0123456789abcdef') - 1) * 256)
    + ((position(substr(hash_value, 3, 1) in '0123456789abcdef') - 1) * 16)
    + (position(substr(hash_value, 4, 1) in '0123456789abcdef') - 1),
    100
  );

  if favorite_pick in ('home', 'draw', 'away') then
    remaining_picks := array(
      select candidate.pick
      from unnest(array['home', 'draw', 'away']) as candidate(pick)
      where candidate.pick <> favorite_pick
      order by candidate.pick
    );

    selected_pick := case
      when hash_roll < 50 then favorite_pick
      when hash_roll < 75 then remaining_picks[1]
      else remaining_picks[2]
    end;
  else
    fallback_slot := mod(hash_roll, 3);
    selected_pick := (array['home', 'draw', 'away'])[fallback_slot + 1];
  end if;

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

delete from public.oracle_predictions op
using public.matches m
where m.id = op.match_id
  and m.status = 'scheduled'
  and m.kickoff_at > now();

revoke all on function public.get_oracle_prediction(bigint) from public;
grant execute on function public.get_oracle_prediction(bigint) to authenticated;

commit;
