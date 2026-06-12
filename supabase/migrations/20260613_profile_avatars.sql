-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

alter table public.profiles
  add column if not exists avatar_key text not null default 'classic-ball';

alter table public.profiles
  drop constraint if exists profiles_avatar_key_check;

alter table public.profiles
  add constraint profiles_avatar_key_check
  check (avatar_key in (
    'classic-ball',
    'golden-cup',
    'goalkeeper',
    'football-boot',
    'supporter-horn',
    'stadium-drum',
    'goal-net',
    'brazil'
  ));

create or replace function public.update_profile_avatar(new_avatar_key text)
returns text
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if new_avatar_key not in (
    'classic-ball',
    'golden-cup',
    'goalkeeper',
    'football-boot',
    'supporter-horn',
    'stadium-drum',
    'goal-net',
    'brazil'
  ) then
    raise exception 'Imagem de perfil inválida.';
  end if;

  update public.profiles
  set avatar_key = new_avatar_key
  where id = auth.uid();

  return new_avatar_key;
end;
$$;

drop function if exists public.get_ranking();

create function public.get_ranking()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  total_points bigint,
  exact_scores bigint,
  predictions_count bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select
    p.id as user_id,
    p.display_name,
    p.avatar_key,
    coalesce(sum(pr.points), 0)::bigint as total_points,
    count(*) filter (where pr.points = 7)::bigint as exact_scores,
    count(pr.match_id)::bigint as predictions_count
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  group by p.id, p.display_name, p.avatar_key
  order by total_points desc, exact_scores desc, p.display_name asc;
$$;

revoke all on function public.update_profile_avatar(text) from public;
grant execute on function public.update_profile_avatar(text) to authenticated;
revoke all on function public.get_ranking() from public;
grant execute on function public.get_ranking() to authenticated;

commit;
