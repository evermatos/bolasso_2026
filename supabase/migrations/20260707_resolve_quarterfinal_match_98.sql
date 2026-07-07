-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche o jogo 98 com os vencedores das oitavas 93 e 94.

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
  where m.match_number in (93, 94)
),
resolved_match as (
  select 98::smallint as match_number,
         w93.team as home_team,
         w94.team as away_team,
         w93.flag as home_flag,
         w94.flag as away_flag
  from source_winners w93
  join source_winners w94 on w94.match_number = 94
  where w93.match_number = 93
)
update public.matches m
set home_team = resolved_match.home_team,
    away_team = resolved_match.away_team,
    home_flag = resolved_match.home_flag,
    away_flag = resolved_match.away_flag
from resolved_match
where m.match_number = resolved_match.match_number
  and m.status = 'scheduled'
  and resolved_match.home_team is not null
  and resolved_match.away_team is not null;

delete from public.oracle_predictions op
using public.matches m
where m.id = op.match_id
  and m.match_number = 98
  and m.status = 'scheduled';

delete from public.match_odds mo
using public.matches m
where m.id = mo.match_id
  and m.match_number = 98
  and m.status = 'scheduled';

commit;
