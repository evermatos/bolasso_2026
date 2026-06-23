-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create table if not exists public.match_odds (
  match_id bigint primary key references public.matches(id) on delete cascade,
  provider text not null default 'the-odds-api',
  provider_sport_key text,
  provider_event_id text,
  home_odds numeric(8,3),
  draw_odds numeric(8,3),
  away_odds numeric(8,3),
  favorite_pick text check (favorite_pick in ('home', 'draw', 'away')),
  favorite_odds numeric(8,3),
  implied_home_probability numeric(8,6),
  implied_draw_probability numeric(8,6),
  implied_away_probability numeric(8,6),
  bookmakers_count integer not null default 0 check (bookmakers_count >= 0),
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw jsonb
);

create index if not exists match_odds_favorite_pick_idx
  on public.match_odds(favorite_pick);

alter table public.match_odds enable row level security;

drop policy if exists "Admins can see match odds"
  on public.match_odds;

create policy "Admins can see match odds"
  on public.match_odds for select
  to authenticated
  using (public.is_admin());

commit;
