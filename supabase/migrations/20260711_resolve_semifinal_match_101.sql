-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche o jogo 101 com os vencedores das quartas 97 e 98 e libera odds do polvo.

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
  where m.match_number in (97, 98)
),
resolved_match as (
  select 101::smallint as match_number,
         w97.team as home_team,
         w98.team as away_team,
         w97.flag as home_flag,
         w98.flag as away_flag
  from source_winners w97
  join source_winners w98 on w98.match_number = 98
  where w97.match_number = 97
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
  and m.match_number = 101
  and m.status = 'scheduled';

insert into public.match_odds (
  match_id,
  provider,
  provider_sport_key,
  provider_event_id,
  home_odds,
  draw_odds,
  away_odds,
  favorite_pick,
  favorite_odds,
  implied_home_probability,
  implied_draw_probability,
  implied_away_probability,
  bookmakers_count,
  fetched_at,
  updated_at,
  raw
)
select
  m.id,
  'manual-public-odds',
  'soccer_fifa_world_cup',
  'world-cup-2026-match-101',
  2.180,
  3.100,
  3.400,
  'home',
  2.180,
  0.458716,
  0.322581,
  0.294118,
  0,
  now(),
  now(),
  jsonb_build_object(
    'note', 'Fallback manual para liberar o polvo: Franca levemente favorita contra Espanha.',
    'sources', jsonb_build_array(
      'AS confirmou Espanha x Franca na semifinal apos Espanha 2-1 Belgica.',
      'talkSPORT listou Franca como favorita geral do torneio e Espanha logo atras no mercado atualizado.'
    )
  )
from public.matches m
where m.match_number = 101
  and m.status = 'scheduled'
  and m.home_team is not null
  and m.away_team is not null
on conflict (match_id) do update
set provider = excluded.provider,
    provider_sport_key = excluded.provider_sport_key,
    provider_event_id = excluded.provider_event_id,
    home_odds = excluded.home_odds,
    draw_odds = excluded.draw_odds,
    away_odds = excluded.away_odds,
    favorite_pick = excluded.favorite_pick,
    favorite_odds = excluded.favorite_odds,
    implied_home_probability = excluded.implied_home_probability,
    implied_draw_probability = excluded.implied_draw_probability,
    implied_away_probability = excluded.implied_away_probability,
    bookmakers_count = excluded.bookmakers_count,
    fetched_at = excluded.fetched_at,
    updated_at = excluded.updated_at,
    raw = excluded.raw;

commit;
