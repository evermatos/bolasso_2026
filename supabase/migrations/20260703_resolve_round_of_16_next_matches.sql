-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche os jogos 92, 93 e 94 com os vencedores dos 16 avos.

begin;

with source_winners as (
  select
    m.match_number,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.home_team
      when m.away_score > m.home_score then m.away_team
      when m.home_penalty_score > m.away_penalty_score then m.home_team
      when m.away_penalty_score > m.home_penalty_score then m.away_team
      else null
    end as team,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.home_flag
      when m.away_score > m.home_score then m.away_flag
      when m.home_penalty_score > m.away_penalty_score then m.home_flag
      when m.away_penalty_score > m.home_penalty_score then m.away_flag
      else null
    end as flag
  from public.matches m
  where m.match_number in (79, 80, 81, 82, 83, 84)
),
resolved_matches as (
  select 92::smallint as match_number,
         w79.team as home_team,
         w80.team as away_team,
         w79.flag as home_flag,
         w80.flag as away_flag
  from source_winners w79
  join source_winners w80 on w80.match_number = 80
  where w79.match_number = 79

  union all

  select 93::smallint,
         w83.team,
         w84.team,
         w83.flag,
         w84.flag
  from source_winners w83
  join source_winners w84 on w84.match_number = 84
  where w83.match_number = 83

  union all

  select 94::smallint,
         w81.team,
         w82.team,
         w81.flag,
         w82.flag
  from source_winners w81
  join source_winners w82 on w82.match_number = 82
  where w81.match_number = 81
)
update public.matches m
set home_team = resolved_matches.home_team,
    away_team = resolved_matches.away_team,
    home_flag = resolved_matches.home_flag,
    away_flag = resolved_matches.away_flag
from resolved_matches
where m.match_number = resolved_matches.match_number
  and m.status = 'scheduled'
  and resolved_matches.home_team is not null
  and resolved_matches.away_team is not null;

delete from public.oracle_predictions op
using public.matches m
where m.id = op.match_id
  and m.match_number in (92, 93, 94)
  and m.status = 'scheduled';

delete from public.match_odds mo
using public.matches m
where m.id = mo.match_id
  and m.match_number in (92, 93, 94)
  and m.status = 'scheduled';

commit;
