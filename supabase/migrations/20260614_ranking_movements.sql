-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create table if not exists public.ranking_movements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  previous_position integer not null check (previous_position > 0),
  current_position integer not null check (current_position > 0),
  updated_at timestamptz not null default now()
);

alter table public.ranking_movements enable row level security;

create or replace function public.refresh_ranking_movements()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  with totals as (
    select
      p.id as user_id,
      p.display_name,
      coalesce(sum(pr.points), 0)::bigint as total_points,
      count(*) filter (where pr.points = 7)::bigint as exact_scores
    from public.profiles p
    left join public.predictions pr on pr.user_id = p.id
    group by p.id, p.display_name
  ),
  ranked as (
    select
      user_id,
      row_number() over (
        order by total_points desc, exact_scores desc, display_name asc
      )::integer as ranking_position
    from totals
  )
  insert into public.ranking_movements (
    user_id,
    previous_position,
    current_position,
    updated_at
  )
  select
    ranked.user_id,
    coalesce(movements.current_position, ranked.ranking_position),
    ranked.ranking_position,
    now()
  from ranked
  left join public.ranking_movements movements
    on movements.user_id = ranked.user_id
  on conflict (user_id) do update
  set previous_position = public.ranking_movements.current_position,
      current_position = excluded.current_position,
      updated_at = excluded.updated_at;
end;
$$;

-- Cria a fotografia inicial sem mostrar movimentos retroativos.
with totals as (
  select
    p.id as user_id,
    p.display_name,
    coalesce(sum(pr.points), 0)::bigint as total_points,
    count(*) filter (where pr.points = 7)::bigint as exact_scores
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  group by p.id, p.display_name
),
ranked as (
  select
    user_id,
    row_number() over (
      order by total_points desc, exact_scores desc, display_name asc
    )::integer as ranking_position
  from totals
)
insert into public.ranking_movements (
  user_id,
  previous_position,
  current_position
)
select user_id, ranking_position, ranking_position
from ranked
on conflict (user_id) do nothing;

create or replace function public.finish_match(
  target_match_id bigint,
  final_home_score integer,
  final_away_score integer
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem publicar resultados.';
  end if;

  if final_home_score not between 0 and 99
    or final_away_score not between 0 and 99 then
    raise exception 'Placar inválido.';
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

drop function if exists public.get_ranking();

create function public.get_ranking()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  position_change integer,
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
    coalesce(
      movements.previous_position - movements.current_position,
      0
    )::integer as position_change,
    coalesce(sum(pr.points), 0)::bigint as total_points,
    count(*) filter (where pr.points = 7)::bigint as exact_scores,
    count(pr.match_id)::bigint as predictions_count
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  left join public.ranking_movements movements on movements.user_id = p.id
  group by
    p.id,
    p.display_name,
    p.avatar_key,
    movements.previous_position,
    movements.current_position
  order by total_points desc, exact_scores desc, p.display_name asc;
$$;

revoke all on function public.refresh_ranking_movements() from public;
revoke all on function public.refresh_ranking_movements() from authenticated;
revoke all on function public.finish_match(bigint, integer, integer) from public;
grant execute on function public.finish_match(bigint, integer, integer)
  to authenticated;
revoke all on function public.get_ranking() from public;
grant execute on function public.get_ranking() to authenticated;

commit;
