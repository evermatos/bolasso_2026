-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Preenche os jogos 103 e 104 com perdedores/vencedores das semifinais e libera odds do polvo.

begin;

with source_results as (
  select
    m.match_number,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.home_team
      when m.away_score > m.home_score then m.away_team
      when m.home_penalty_score > m.away_penalty_score then m.home_team
      when m.away_penalty_score > m.home_penalty_score then m.away_team
      else null
    end as winner_team,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.home_flag
      when m.away_score > m.home_score then m.away_flag
      when m.home_penalty_score > m.away_penalty_score then m.home_flag
      when m.away_penalty_score > m.home_penalty_score then m.away_flag
      else null
    end as winner_flag,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.away_team
      when m.away_score > m.home_score then m.home_team
      when m.home_penalty_score > m.away_penalty_score then m.away_team
      when m.away_penalty_score > m.home_penalty_score then m.home_team
      else null
    end as loser_team,
    case
      when m.status <> 'finished' then null
      when m.home_score > m.away_score then m.away_flag
      when m.away_score > m.home_score then m.home_flag
      when m.home_penalty_score > m.away_penalty_score then m.away_flag
      when m.away_penalty_score > m.home_penalty_score then m.home_flag
      else null
    end as loser_flag
  from public.matches m
  where m.match_number in (101, 102)
),
resolved_matches as (
  select 103::smallint as match_number,
         s101.loser_team as home_team,
         s102.loser_team as away_team,
         s101.loser_flag as home_flag,
         s102.loser_flag as away_flag
  from source_results s101
  join source_results s102 on s102.match_number = 102
  where s101.match_number = 101

  union all

  select 104::smallint,
         s101.winner_team,
         s102.winner_team,
         s101.winner_flag,
         s102.winner_flag
  from source_results s101
  join source_results s102 on s102.match_number = 102
  where s101.match_number = 101
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
  and m.match_number in (103, 104)
  and m.status = 'scheduled';

with odds_by_match as (
  select
    103::smallint as match_number,
    'world-cup-2026-match-103'::text as provider_event_id,
    2.350::numeric as home_odds,
    3.250::numeric as draw_odds,
    2.900::numeric as away_odds,
    'home'::text as favorite_pick,
    2.350::numeric as favorite_odds,
    0.425532::numeric as implied_home_probability,
    0.307692::numeric as implied_draw_probability,
    0.344828::numeric as implied_away_probability,
    jsonb_build_object(
      'note', 'Fallback manual para liberar o polvo: Franca levemente favorita contra Inglaterra no terceiro lugar.',
      'sources', jsonb_build_array(
        'AP confirmou que Argentina venceu Inglaterra por 2-1 e enfrentara Espanha na final.',
        'talkSPORT confirmou Inglaterra x Franca no jogo de terceiro lugar.'
      )
    ) as raw

  union all

  select
    104::smallint,
    'world-cup-2026-match-104',
    2.200::numeric,
    3.000::numeric,
    3.750::numeric,
    'home'::text,
    2.200::numeric,
    0.454545::numeric,
    0.333333::numeric,
    0.266667::numeric,
    jsonb_build_object(
      'note', 'Odds iniciais publicadas pela AP para a final: Espanha favorita contra Argentina.',
      'sources', jsonb_build_array(
        'AP informou Espanha +120, empate +200 e Argentina +275 para a final.'
      )
    )
)
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
  odds.provider_event_id,
  odds.home_odds,
  odds.draw_odds,
  odds.away_odds,
  odds.favorite_pick,
  odds.favorite_odds,
  odds.implied_home_probability,
  odds.implied_draw_probability,
  odds.implied_away_probability,
  0,
  now(),
  now(),
  odds.raw
from public.matches m
join odds_by_match odds on odds.match_number = m.match_number
where m.match_number in (103, 104)
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
