-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create unique index if not exists profiles_username_idx
  on public.profiles (
    regexp_replace(lower(trim(display_name)), '[[:space:]]+', '_', 'g')
  );

create or replace function public.update_username(new_username text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  normalized_username text;
  clean_username text;
  technical_email text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  clean_username := trim(new_username);
  normalized_username := regexp_replace(
    lower(clean_username),
    '[[:space:]]+',
    '_',
    'g'
  );

  if normalized_username !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
    raise exception 'Use de 3 a 24 caracteres: letras sem acento, números, espaços, ponto, hífen ou sublinhado.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id <> auth.uid()
      and regexp_replace(
        lower(trim(display_name)),
        '[[:space:]]+',
        '_',
        'g'
      ) = normalized_username
  ) then
    raise exception 'Este username já está em uso.';
  end if;

  technical_email := normalized_username || '@bolasso.invalid';

  update public.profiles
  set display_name = clean_username
  where id = auth.uid();

  update auth.users
  set email = technical_email,
      raw_user_meta_data = jsonb_set(
        coalesce(raw_user_meta_data, '{}'::jsonb),
        '{display_name}',
        to_jsonb(clean_username)
      ),
      updated_at = now()
  where id = auth.uid();

  update auth.identities
  set identity_data = jsonb_set(
    identity_data,
    '{email}',
    to_jsonb(technical_email)
  ),
      updated_at = now()
  where user_id = auth.uid()
    and provider = 'email';

  return clean_username;
end;
$$;

create or replace function public.get_participant_predictions(
  target_user_id uuid
)
returns table (
  match_id bigint,
  match_number smallint,
  home_team text,
  away_team text,
  home_flag text,
  away_flag text,
  kickoff_at timestamptz,
  status text,
  final_home_score smallint,
  final_away_score smallint,
  predicted_home_score smallint,
  predicted_away_score smallint,
  points smallint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    m.id,
    m.match_number,
    m.home_team,
    m.away_team,
    m.home_flag,
    m.away_flag,
    m.kickoff_at,
    m.status,
    m.home_score,
    m.away_score,
    pr.home_score,
    pr.away_score,
    pr.points
  from public.matches m
  join public.predictions pr on pr.match_id = m.id
  where pr.user_id = target_user_id
    and m.kickoff_at - interval '5 minutes' <= now()
  order by m.kickoff_at desc;
$$;

revoke all on function public.update_username(text) from public;
grant execute on function public.update_username(text) to authenticated;
revoke all on function public.get_participant_predictions(uuid) from public;
grant execute on function public.get_participant_predictions(uuid) to authenticated;

commit;
