-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche os jogos 89, 90 e 91 com os vencedores dos 16 avos.

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
  where m.match_number in (73, 74, 75, 76, 77, 78)
),
resolved_matches as (
  select 90::smallint as match_number,
         w73.team as home_team,
         w75.team as away_team,
         w73.flag as home_flag,
         w75.flag as away_flag
  from source_winners w73
  join source_winners w75 on w75.match_number = 75
  where w73.match_number = 73

  union all

  select 89::smallint,
         w74.team,
         w77.team,
         w74.flag,
         w77.flag
  from source_winners w74
  join source_winners w77 on w77.match_number = 77
  where w74.match_number = 74

  union all

  select 91::smallint,
         w76.team,
         w78.team,
         w76.flag,
         w78.flag
  from source_winners w76
  join source_winners w78 on w78.match_number = 78
  where w76.match_number = 76
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
  and m.match_number in (89, 90, 91)
  and m.status = 'scheduled';

delete from public.match_odds mo
using public.matches m
where m.id = mo.match_id
  and m.match_number in (89, 90, 91)
  and m.status = 'scheduled';

commit;
