-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

drop function if exists public.get_participant_predictions(uuid);

create function public.get_participant_predictions(
  target_user_id uuid
)
returns table (
  match_id bigint,
  match_number smallint,
  home_team text,
  away_team text,
  home_flag text,
  away_flag text,
  kickoff_at timestamptz,
  status text,
  final_home_score smallint,
  final_away_score smallint,
  predicted_home_score smallint,
  predicted_away_score smallint,
  predicted_qualifier text,
  points smallint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    m.id,
    m.match_number,
    m.home_team,
    m.away_team,
    m.home_flag,
    m.away_flag,
    m.kickoff_at,
    m.status,
    m.home_score,
    m.away_score,
    pr.home_score,
    pr.away_score,
    pr.predicted_qualifier,
    pr.points
  from public.matches m
  join public.predictions pr on pr.match_id = m.id
  where pr.user_id = target_user_id
    and m.kickoff_at - interval '5 minutes' <= now()
  order by m.match_number desc;
$$;

revoke all on function public.get_participant_predictions(uuid) from public;
grant execute on function public.get_participant_predictions(uuid) to authenticated;

commit;
