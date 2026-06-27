-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

insert into public.matches
  (match_number, home_team, away_team, home_flag, away_flag, stage, kickoff_at, venue)
values
  (73, '2A', '2B', '⚽', '⚽', '16 avos', '2026-06-28 19:00:00+00', 'Los Angeles Stadium · Los Angeles'),
  (74, '1E', '3ABCDF', '⚽', '⚽', '16 avos', '2026-06-29 20:30:00+00', 'Boston Stadium · Boston'),
  (75, '1F', '2C', '⚽', '⚽', '16 avos', '2026-06-30 01:00:00+00', 'Monterrey Stadium · Monterrey'),
  (76, '1C', '2F', '⚽', '⚽', '16 avos', '2026-06-29 17:00:00+00', 'Houston Stadium · Houston'),
  (77, '1I', '3CDFGH', '⚽', '⚽', '16 avos', '2026-06-30 21:00:00+00', 'New York/New Jersey Stadium · New Jersey'),
  (78, '2E', '2I', '⚽', '⚽', '16 avos', '2026-06-30 17:00:00+00', 'Dallas Stadium · Dallas'),
  (79, '1A', '3CEFHI', '⚽', '⚽', '16 avos', '2026-07-01 01:00:00+00', 'Mexico City Stadium · Mexico City'),
  (80, '1L', '3EHIJK', '⚽', '⚽', '16 avos', '2026-07-01 16:00:00+00', 'Atlanta Stadium · Atlanta'),
  (81, '1D', '3BEFIJ', '⚽', '⚽', '16 avos', '2026-07-02 00:00:00+00', 'San Francisco Bay Area Stadium · San Francisco Bay Area'),
  (82, '1G', '3AEHIJ', '⚽', '⚽', '16 avos', '2026-07-01 20:00:00+00', 'Seattle Stadium · Seattle'),
  (83, '2K', '2L', '⚽', '⚽', '16 avos', '2026-07-02 23:00:00+00', 'Toronto Stadium · Toronto'),
  (84, '1H', '2J', '⚽', '⚽', '16 avos', '2026-07-02 19:00:00+00', 'Los Angeles Stadium · Los Angeles'),
  (85, '1B', '3EFGIJ', '⚽', '⚽', '16 avos', '2026-07-03 03:00:00+00', 'BC Place Vancouver · Vancouver'),
  (86, '1J', '2H', '⚽', '⚽', '16 avos', '2026-07-03 22:00:00+00', 'Miami Stadium · Miami'),
  (87, '1K', '3DEIJL', '⚽', '⚽', '16 avos', '2026-07-04 01:30:00+00', 'Kansas City Stadium · Kansas City'),
  (88, '2D', '2G', '⚽', '⚽', '16 avos', '2026-07-03 18:00:00+00', 'Dallas Stadium · Dallas'),
  (89, 'W74', 'W77', '⚽', '⚽', 'Oitavas', '2026-07-04 21:00:00+00', 'Philadelphia Stadium · Philadelphia'),
  (90, 'W73', 'W75', '⚽', '⚽', 'Oitavas', '2026-07-04 17:00:00+00', 'Houston Stadium · Houston'),
  (91, 'W76', 'W78', '⚽', '⚽', 'Oitavas', '2026-07-05 20:00:00+00', 'New York/New Jersey Stadium · New Jersey'),
  (92, 'W79', 'W80', '⚽', '⚽', 'Oitavas', '2026-07-06 00:00:00+00', 'Mexico City Stadium · Mexico City'),
  (93, 'W83', 'W84', '⚽', '⚽', 'Oitavas', '2026-07-06 19:00:00+00', 'Dallas Stadium · Dallas'),
  (94, 'W81', 'W82', '⚽', '⚽', 'Oitavas', '2026-07-07 00:00:00+00', 'Seattle Stadium · Seattle'),
  (95, 'W86', 'W88', '⚽', '⚽', 'Oitavas', '2026-07-07 16:00:00+00', 'Atlanta Stadium · Atlanta'),
  (96, 'W85', 'W87', '⚽', '⚽', 'Oitavas', '2026-07-07 20:00:00+00', 'BC Place Vancouver · Vancouver'),
  (97, 'W89', 'W90', '⚽', '⚽', 'Quartas', '2026-07-09 20:00:00+00', 'Boston Stadium · Boston'),
  (98, 'W93', 'W94', '⚽', '⚽', 'Quartas', '2026-07-10 19:00:00+00', 'Los Angeles Stadium · Los Angeles'),
  (99, 'W91', 'W92', '⚽', '⚽', 'Quartas', '2026-07-11 21:00:00+00', 'Miami Stadium · Miami'),
  (100, 'W95', 'W96', '⚽', '⚽', 'Quartas', '2026-07-12 01:00:00+00', 'Kansas City Stadium · Kansas City'),
  (101, 'W97', 'W98', '⚽', '⚽', 'Semifinais', '2026-07-14 19:00:00+00', 'Dallas Stadium · Dallas'),
  (102, 'W99', 'W100', '⚽', '⚽', 'Semifinais', '2026-07-15 19:00:00+00', 'Atlanta Stadium · Atlanta'),
  (103, 'RU101', 'RU102', '⚽', '⚽', '3º lugar', '2026-07-18 21:00:00+00', 'Miami Stadium · Miami'),
  (104, 'W101', 'W102', '⚽', '⚽', 'Final', '2026-07-19 19:00:00+00', 'New York/New Jersey Stadium · New Jersey')
on conflict (match_number) do nothing;

create or replace function public.finish_match(
  target_match_id bigint,
  final_home_score integer,
  final_away_score integer
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  target_match_number smallint;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem publicar resultados.';
  end if;

  if final_home_score not between 0 and 99
    or final_away_score not between 0 and 99 then
    raise exception 'Placar inválido.';
  end if;

  select match_number
  into target_match_number
  from public.matches
  where id = target_match_id;

  if target_match_number is null then
    raise exception 'Jogo não encontrado.';
  end if;

  if target_match_number >= 73 and final_home_score = final_away_score then
    raise exception 'Jogo de mata-mata precisa ter um vencedor para atualizar a chave.';
  end if;

  update public.matches
  set home_score = final_home_score,
      away_score = final_away_score,
      status = 'finished'
  where id = target_match_id
    and kickoff_at <= now();

  if not found then
    raise exception 'O jogo ainda não começou ou não foi encontrado.';
  end if;

  update public.predictions
  set points = public.calculate_points(
    home_score,
    away_score,
    final_home_score,
    final_away_score
  )
  where match_id = target_match_id;

  perform public.refresh_ranking_movements();
end;
$$;

revoke all on function public.finish_match(bigint, integer, integer) from public;
grant execute on function public.finish_match(bigint, integer, integer) to authenticated;

commit;
