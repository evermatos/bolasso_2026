-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

update public.matches
set home_team = data.home_team,
    away_team = data.away_team,
    home_flag = data.home_flag,
    away_flag = data.away_flag,
    kickoff_at = data.kickoff_at,
    venue = data.venue
from (
  values
    (73, 'África do Sul', 'Canadá', '🇿🇦', '🇨🇦', '2026-06-28 19:00:00+00'::timestamptz, 'Los Angeles Stadium · Los Angeles'),
    (74, 'Alemanha', 'Paraguai', '🇩🇪', '🇵🇾', '2026-06-29 20:30:00+00'::timestamptz, 'Boston Stadium · Boston'),
    (75, 'Países Baixos', 'Marrocos', '🇳🇱', '🇲🇦', '2026-06-30 01:00:00+00'::timestamptz, 'Monterrey Stadium · Monterrey'),
    (76, 'Brasil', 'Japão', '🇧🇷', '🇯🇵', '2026-06-29 17:00:00+00'::timestamptz, 'Houston Stadium · Houston'),
    (77, 'França', 'Suécia', '🇫🇷', '🇸🇪', '2026-06-30 21:00:00+00'::timestamptz, 'New York/New Jersey Stadium · New Jersey'),
    (78, 'Costa do Marfim', 'Noruega', '🇨🇮', '🇳🇴', '2026-06-30 17:00:00+00'::timestamptz, 'Dallas Stadium · Dallas'),
    (79, 'México', 'Equador', '🇲🇽', '🇪🇨', '2026-07-01 01:00:00+00'::timestamptz, 'Mexico City Stadium · Mexico City'),
    (80, 'Inglaterra', 'RD Congo', '🏴', '🇨🇩', '2026-07-01 16:00:00+00'::timestamptz, 'Atlanta Stadium · Atlanta'),
    (81, 'Estados Unidos', 'Bósnia e Herzegovina', '🇺🇸', '🇧🇦', '2026-07-02 00:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium · San Francisco Bay Area'),
    (82, 'Bélgica', 'Senegal', '🇧🇪', '🇸🇳', '2026-07-01 20:00:00+00'::timestamptz, 'Seattle Stadium · Seattle'),
    (83, 'Portugal', 'Croácia', '🇵🇹', '🇭🇷', '2026-07-02 23:00:00+00'::timestamptz, 'Toronto Stadium · Toronto'),
    (84, 'Espanha', 'Áustria', '🇪🇸', '🇦🇹', '2026-07-02 19:00:00+00'::timestamptz, 'Los Angeles Stadium · Los Angeles'),
    (85, 'Suíça', 'Argélia', '🇨🇭', '🇩🇿', '2026-07-03 03:00:00+00'::timestamptz, 'BC Place Vancouver · Vancouver'),
    (86, 'Argentina', 'Cabo Verde', '🇦🇷', '🇨🇻', '2026-07-03 22:00:00+00'::timestamptz, 'Miami Stadium · Miami'),
    (87, 'Colômbia', 'Gana', '🇨🇴', '🇬🇭', '2026-07-04 01:30:00+00'::timestamptz, 'Kansas City Stadium · Kansas City'),
    (88, 'Austrália', 'Egito', '🇦🇺', '🇪🇬', '2026-07-03 18:00:00+00'::timestamptz, 'Dallas Stadium · Dallas')
) as data(
  match_number,
  home_team,
  away_team,
  home_flag,
  away_flag,
  kickoff_at,
  venue
)
where public.matches.match_number = data.match_number
  and public.matches.status = 'scheduled';

commit;
