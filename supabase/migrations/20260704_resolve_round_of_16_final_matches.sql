-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche os jogos 95 e 96 com os vencedores dos 16 avos.

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
  where m.match_number in (85, 86, 87, 88)
),
resolved_matches as (
  select 95::smallint as match_number,
         w86.team as home_team,
         w88.team as away_team,
         w86.flag as home_flag,
         w88.flag as away_flag
  from source_winners w86
  join source_winners w88 on w88.match_number = 88
  where w86.match_number = 86

  union all

  select 96::smallint,
         w85.team,
         w87.team,
         w85.flag,
         w87.flag
  from source_winners w85
  join source_winners w87 on w87.match_number = 87
  where w85.match_number = 85
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
  and m.match_number in (95, 96)
  and m.status = 'scheduled';

delete from public.match_odds mo
using public.matches m
where m.id = mo.match_id
  and m.match_number in (95, 96)
  and m.status = 'scheduled';

commit;
