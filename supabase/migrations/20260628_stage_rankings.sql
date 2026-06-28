-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create or replace function public.get_ranking_by_match_range(
  min_match_number smallint,
  max_match_number smallint
)
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
  with scoped_predictions as (
    select pr.*
    from public.predictions pr
    join public.matches m on m.id = pr.match_id
    where m.match_number between min_match_number and max_match_number
  ),
  totals as (
    select
      p.id as user_id,
      p.display_name,
      p.avatar_key,
      coalesce(sum(sp.points), 0)::bigint as total_points,
      count(*) filter (where sp.points = 7)::bigint as exact_scores,
      count(*) filter (where sp.points = 5)::bigint as five_point_scores,
      count(*) filter (where sp.points = 3)::bigint as three_point_scores,
      count(*) filter (where sp.points = 1)::bigint as one_point_scores,
      count(sp.match_id)::bigint as predictions_count
    from public.profiles p
    left join scoped_predictions sp on sp.user_id = p.id
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
    0::integer as position_change,
    ranked.is_tied,
    ranked.total_points,
    ranked.exact_scores,
    ranked.five_point_scores,
    ranked.three_point_scores,
    ranked.one_point_scores,
    ranked.predictions_count
  from ranked
  order by ranked.ranking_position, ranked.display_name asc;
$$;

revoke all on function public.get_ranking_by_match_range(smallint, smallint) from public;
grant execute on function public.get_ranking_by_match_range(smallint, smallint) to authenticated;

commit;
