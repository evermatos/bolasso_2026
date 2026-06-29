-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Corrige placares exatos que estavam somando indevidamente +1 ponto.

begin;

create or replace function public.calculate_points(
  predicted_home integer,
  predicted_away integer,
  final_home integer,
  final_away integer,
  predicted_qualifier text default null,
  final_home_penalty_score integer default null,
  final_away_penalty_score integer default null
)
returns integer
language plpgsql
immutable
as $$
declare
  outcome_points integer := 0;
  one_score_point integer := 0;
  qualifier_points integer := 0;
  final_qualifier text := null;
begin
  if predicted_home = final_home and predicted_away = final_away then
    outcome_points := 7;
  else
    if sign(predicted_home - predicted_away) = sign(final_home - final_away) then
      outcome_points := 3;
    end if;

    if predicted_home = final_home or predicted_away = final_away then
      one_score_point := 1;
    end if;

    if outcome_points = 3 and one_score_point = 1 then
      outcome_points := 5;
      one_score_point := 0;
    end if;
  end if;

  if final_home = final_away
    and predicted_home = predicted_away
    and predicted_qualifier in ('home', 'away')
    and final_home_penalty_score is not null
    and final_away_penalty_score is not null
    and final_home_penalty_score <> final_away_penalty_score then
    final_qualifier := case
      when final_home_penalty_score > final_away_penalty_score then 'home'
      else 'away'
    end;

    if predicted_qualifier = final_qualifier then
      qualifier_points := 2;
    end if;
  end if;

  return outcome_points + one_score_point + qualifier_points;
end;
$$;

update public.predictions pr
set points = public.calculate_points(
  pr.home_score,
  pr.away_score,
  m.home_score,
  m.away_score,
  pr.predicted_qualifier,
  m.home_penalty_score,
  m.away_penalty_score
)
from public.matches m
where m.id = pr.match_id
  and m.status = 'finished'
  and m.home_score is not null
  and m.away_score is not null;

select public.refresh_ranking_movements();
select public.refresh_knockout_ranking_movements();

commit;
