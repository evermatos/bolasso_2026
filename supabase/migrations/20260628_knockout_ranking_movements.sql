-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create table if not exists public.ranking_stage_movements (
  stage text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_position integer not null check (previous_position > 0),
  current_position integer not null check (current_position > 0),
  updated_at timestamptz not null default now(),
  primary key (stage, user_id)
);

alter table public.ranking_stage_movements enable row level security;

create or replace function public.refresh_knockout_ranking_movements()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  with scoped_predictions as (
    select pr.*
    from public.predictions pr
    join public.matches m on m.id = pr.match_id
    where m.match_number between 73 and 104
  ),
  totals as (
    select
      p.id as user_id,
      coalesce(sum(sp.points), 0)::bigint as total_points,
      count(*) filter (where sp.points = 7)::bigint as exact_scores,
      count(*) filter (where sp.points = 5)::bigint as five_point_scores,
      count(*) filter (where sp.points = 3)::bigint as three_point_scores,
      count(*) filter (where sp.points = 1)::bigint as one_point_scores
    from public.profiles p
    left join scoped_predictions sp on sp.user_id = p.id
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
  insert into public.ranking_stage_movements (
    stage,
    user_id,
    previous_position,
    current_position,
    updated_at
  )
  select
    'knockout',
    ranked.user_id,
    coalesce(movements.current_position, ranked.ranking_position),
    ranked.ranking_position,
    now()
  from ranked
  left join public.ranking_stage_movements movements
    on movements.stage = 'knockout'
    and movements.user_id = ranked.user_id
  on conflict (stage, user_id) do update
  set previous_position = public.ranking_stage_movements.current_position,
      current_position = excluded.current_position,
      updated_at = excluded.updated_at;
end;
$$;

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
    case
      when min_match_number = 73 and max_match_number = 104 then
        coalesce(
          movements.previous_position - movements.current_position,
          0
        )::integer
      else 0::integer
    end as position_change,
    ranked.is_tied,
    ranked.total_points,
    ranked.exact_scores,
    ranked.five_point_scores,
    ranked.three_point_scores,
    ranked.one_point_scores,
    ranked.predictions_count
  from ranked
  left join public.ranking_stage_movements movements
    on movements.stage = 'knockout'
    and movements.user_id = ranked.user_id
    and min_match_number = 73
    and max_match_number = 104
  order by ranked.ranking_position, ranked.display_name asc;
$$;

create or replace function public.finish_match(
  target_match_id bigint,
  final_home_score integer,
  final_away_score integer,
  final_home_penalty_score integer default null,
  final_away_penalty_score integer default null
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
    if final_home_penalty_score is null or final_away_penalty_score is null then
      raise exception 'Informe o placar dos pênaltis para jogo de mata-mata empatado.';
    end if;

    if final_home_penalty_score = final_away_penalty_score then
      raise exception 'O placar dos pênaltis precisa ter um vencedor.';
    end if;
  end if;

  if final_home_penalty_score is not null
    and final_home_penalty_score not between 0 and 99 then
    raise exception 'Placar de pênaltis inválido.';
  end if;

  if final_away_penalty_score is not null
    and final_away_penalty_score not between 0 and 99 then
    raise exception 'Placar de pênaltis inválido.';
  end if;

  if target_match_number < 73
    and (final_home_penalty_score is not null or final_away_penalty_score is not null) then
    raise exception 'Pênaltis só podem ser usados no mata-mata.';
  end if;

  if final_home_score <> final_away_score then
    final_home_penalty_score := null;
    final_away_penalty_score := null;
  end if;

  update public.matches
  set home_score = final_home_score,
      away_score = final_away_score,
      home_penalty_score = final_home_penalty_score,
      away_penalty_score = final_away_penalty_score,
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

  if target_match_number >= 73 then
    perform public.refresh_knockout_ranking_movements();
  end if;
end;
$$;

-- Reinicia a fotografia do mata-mata sem gerar movimentos falsos.
with scoped_predictions as (
  select pr.*
  from public.predictions pr
  join public.matches m on m.id = pr.match_id
  where m.match_number between 73 and 104
),
totals as (
  select
    p.id as user_id,
    coalesce(sum(sp.points), 0)::bigint as total_points,
    count(*) filter (where sp.points = 7)::bigint as exact_scores,
    count(*) filter (where sp.points = 5)::bigint as five_point_scores,
    count(*) filter (where sp.points = 3)::bigint as three_point_scores,
    count(*) filter (where sp.points = 1)::bigint as one_point_scores
  from public.profiles p
  left join scoped_predictions sp on sp.user_id = p.id
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
insert into public.ranking_stage_movements (
  stage,
  user_id,
  previous_position,
  current_position,
  updated_at
)
select 'knockout', user_id, ranking_position, ranking_position, now()
from ranked
on conflict (stage, user_id) do update
set previous_position = excluded.previous_position,
    current_position = excluded.current_position,
    updated_at = excluded.updated_at;

revoke all on function public.refresh_knockout_ranking_movements() from public;
revoke all on function public.refresh_knockout_ranking_movements() from authenticated;
revoke all on function public.get_ranking_by_match_range(smallint, smallint) from public;
grant execute on function public.get_ranking_by_match_range(smallint, smallint) to authenticated;
revoke all on function public.finish_match(bigint, integer, integer, integer, integer) from public;
grant execute on function public.finish_match(bigint, integer, integer, integer, integer) to authenticated;

commit;
