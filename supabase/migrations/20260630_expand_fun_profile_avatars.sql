-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

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
    'brazil',
    'argentina-ten',
    'portugal-seven',
    'penguin-striker',
    'var-alien',
    'capybara-fan',
    'ball-wizard',
    'angry-referee',
    'octopus-oracle',
    'lucky-socks',
    'tactical-board',
    'vuvuzela-chaos',
    'wizard-staff',
    'pizza-var',
    'dragon-goalie',
    'ninja-winger',
    'rocket-shot',
    'trophy-ghost',
    'robot-coach',
    'unicorn-fan',
    'king-ball',
    'hotdog-stadium',
    'sleepy-striker',
    'fortune-cookie',
    'thunder-cleat',
    'space-referee'
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
    'brazil',
    'argentina-ten',
    'portugal-seven',
    'penguin-striker',
    'var-alien',
    'capybara-fan',
    'ball-wizard',
    'angry-referee',
    'octopus-oracle',
    'lucky-socks',
    'tactical-board',
    'vuvuzela-chaos',
    'wizard-staff',
    'pizza-var',
    'dragon-goalie',
    'ninja-winger',
    'rocket-shot',
    'trophy-ghost',
    'robot-coach',
    'unicorn-fan',
    'king-ball',
    'hotdog-stadium',
    'sleepy-striker',
    'fortune-cookie',
    'thunder-cleat',
    'space-referee'
  ) then
    raise exception 'Imagem de perfil inválida.';
  end if;

  update public.profiles
  set avatar_key = new_avatar_key
  where id = auth.uid();

  return new_avatar_key;
end;
$$;

revoke all on function public.update_profile_avatar(text) from public;
grant execute on function public.update_profile_avatar(text) to authenticated;

commit;
