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
  hash_value text;
  hash_slot integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1 from public.matches where id = target_match_id
  ) then
    raise exception 'Jogo não encontrado.';
  end if;

  hash_value := md5(auth.uid()::text || ':' || target_match_id::text);
  hash_slot := mod(
    ((position(substr(hash_value, 1, 1) in '0123456789abcdef') - 1) * 16)
    + (position(substr(hash_value, 2, 1) in '0123456789abcdef') - 1),
    3
  );
  selected_pick := (array['home', 'draw', 'away'])[hash_slot + 1];

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

with hashes as (
  select
    op.user_id,
    op.match_id,
    md5(op.user_id::text || ':' || op.match_id::text) as hash_value
  from public.oracle_predictions op
),
deterministic_picks as (
  select
    hashes.user_id,
    hashes.match_id,
    (array['home', 'draw', 'away'])[
      mod(
        ((position(substr(hashes.hash_value, 1, 1) in '0123456789abcdef') - 1) * 16)
        + (position(substr(hashes.hash_value, 2, 1) in '0123456789abcdef') - 1),
        3
      ) + 1
    ] as pick
  from hashes
)
update public.oracle_predictions op
set pick = deterministic_picks.pick
from deterministic_picks
where op.user_id = deterministic_picks.user_id
  and op.match_id = deterministic_picks.match_id
  and op.pick <> deterministic_picks.pick;

revoke all on function public.get_oracle_prediction(bigint) from public;
grant execute on function public.get_oracle_prediction(bigint) to authenticated;

commit;
