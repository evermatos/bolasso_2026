-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

alter table public.predictions
  drop constraint if exists predictions_points_check;

alter table public.predictions
  add constraint predictions_points_check
  check (points between 0 and 7);

create or replace function public.calculate_points(
  predicted_home integer,
  predicted_away integer,
  final_home integer,
  final_away integer
)
returns integer
language plpgsql
immutable
as $$
declare
  outcome_points integer := 0;
  one_score_point integer := 0;
begin
  if predicted_home = final_home and predicted_away = final_away then
    return 7;
  end if;

  if sign(predicted_home - predicted_away) = sign(final_home - final_away) then
    outcome_points := 3;
  end if;

  if predicted_home = final_home or predicted_away = final_away then
    one_score_point := 1;
  end if;

  if outcome_points = 3 and one_score_point = 1 then
    return 5;
  end if;

  return outcome_points + one_score_point;
end;
$$;

create or replace function public.get_ranking()
returns table (
  user_id uuid,
  display_name text,
  total_points bigint,
  exact_scores bigint,
  predictions_count bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    p.id as user_id,
    p.display_name,
    coalesce(sum(pr.points), 0)::bigint as total_points,
    count(*) filter (where pr.points = 7)::bigint as exact_scores,
    count(pr.match_id)::bigint as predictions_count
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  group by p.id, p.display_name
  order by total_points desc, exact_scores desc, p.display_name asc;
$$;

alter table public.predictions disable trigger protect_prediction_values;

update public.predictions as prediction
set points = public.calculate_points(
  prediction.home_score,
  prediction.away_score,
  match.home_score,
  match.away_score
)
from public.matches as match
where match.id = prediction.match_id
  and match.status = 'finished'
  and match.home_score is not null
  and match.away_score is not null;

alter table public.predictions enable trigger protect_prediction_values;

commit;
