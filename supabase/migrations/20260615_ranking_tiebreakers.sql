-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create or replace function public.refresh_ranking_movements()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  with totals as (
    select
      p.id as user_id,
      coalesce(sum(pr.points), 0)::bigint as total_points,
      count(*) filter (where pr.points = 7)::bigint as exact_scores,
      count(*) filter (where pr.points = 5)::bigint as five_point_scores,
      count(*) filter (where pr.points = 3)::bigint as three_point_scores,
      count(*) filter (where pr.points = 1)::bigint as one_point_scores
    from public.profiles p
    left join public.predictions pr on pr.user_id = p.id
    group by p.id
  ),
  ranked as (
    select
      user_id,
      rank() over (
        order by
          total_points desc,
          exact_scores desc,
          five_point_scores desc,
          three_point_scores desc,
          one_point_scores desc
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

-- Reinicia a fotografia usando os novos critérios, sem gerar movimentos falsos.
with totals as (
  select
    p.id as user_id,
    coalesce(sum(pr.points), 0)::bigint as total_points,
    count(*) filter (where pr.points = 7)::bigint as exact_scores,
    count(*) filter (where pr.points = 5)::bigint as five_point_scores,
    count(*) filter (where pr.points = 3)::bigint as three_point_scores,
    count(*) filter (where pr.points = 1)::bigint as one_point_scores
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  group by p.id
),
ranked as (
  select
    user_id,
    rank() over (
      order by
        total_points desc,
        exact_scores desc,
        five_point_scores desc,
        three_point_scores desc,
        one_point_scores desc
    )::integer as ranking_position
  from totals
)
insert into public.ranking_movements (
  user_id,
  previous_position,
  current_position,
  updated_at
)
select user_id, ranking_position, ranking_position, now()
from ranked
on conflict (user_id) do update
set previous_position = excluded.previous_position,
    current_position = excluded.current_position,
    updated_at = excluded.updated_at;

drop function if exists public.get_ranking();

create function public.get_ranking()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  ranking_position integer,
  position_change integer,
  is_tied boolean,
  total_points bigint,
  exact_scores bigint,
  five_point_scores bigint,
  three_point_scores bigint,
  one_point_scores bigint,
  predictions_count bigint
)
language sql
stable
security definer set search_path = ''
as $$
  with totals as (
    select
      p.id as user_id,
      p.display_name,
      p.avatar_key,
      coalesce(sum(pr.points), 0)::bigint as total_points,
      count(*) filter (where pr.points = 7)::bigint as exact_scores,
      count(*) filter (where pr.points = 5)::bigint as five_point_scores,
      count(*) filter (where pr.points = 3)::bigint as three_point_scores,
      count(*) filter (where pr.points = 1)::bigint as one_point_scores,
      count(pr.match_id)::bigint as predictions_count
    from public.profiles p
    left join public.predictions pr on pr.user_id = p.id
    group by p.id, p.display_name, p.avatar_key
  ),
  ranked as (
    select
      totals.*,
      rank() over (
        order by
          total_points desc,
          exact_scores desc,
          five_point_scores desc,
          three_point_scores desc,
          one_point_scores desc
      )::integer as ranking_position,
      count(*) over (
        partition by
          total_points,
          exact_scores,
          five_point_scores,
          three_point_scores,
          one_point_scores
      ) > 1 as is_tied
    from totals
  )
  select
    ranked.user_id,
    ranked.display_name,
    ranked.avatar_key,
    ranked.ranking_position,
    coalesce(
      movements.previous_position - movements.current_position,
      0
    )::integer as position_change,
    ranked.is_tied,
    ranked.total_points,
    ranked.exact_scores,
    ranked.five_point_scores,
    ranked.three_point_scores,
    ranked.one_point_scores,
    ranked.predictions_count
  from ranked
  left join public.ranking_movements movements
    on movements.user_id = ranked.user_id
  order by ranked.ranking_position, ranked.display_name asc;
$$;

revoke all on function public.refresh_ranking_movements() from public;
revoke all on function public.refresh_ranking_movements() from authenticated;
revoke all on function public.get_ranking() from public;
grant execute on function public.get_ranking() to authenticated;

commit;
