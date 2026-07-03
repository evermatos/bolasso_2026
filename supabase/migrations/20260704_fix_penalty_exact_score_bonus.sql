-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Garante 9 pontos para placar exato empatado + classificado correto nos penaltis.

begin;

alter table public.predictions
  drop constraint if exists predictions_points_check;

alter table public.predictions
  add constraint predictions_points_check
  check (points between 0 and 9);

create or replace function public.calculate_points(
  predicted_home integer,
  predicted_away integer,
  final_home integer,
  final_away integer,
  predicted_qualifier text default null,
  final_home_penalty_score integer default null,
  final_away_penalty_score integer default null
)
returns integer
language plpgsql
immutable
as $$
declare
  outcome_points integer := 0;
  one_score_point integer := 0;
  qualifier_points integer := 0;
  final_qualifier text := null;
begin
  if predicted_home = final_home and predicted_away = final_away then
    outcome_points := 7;
  else
    if sign(predicted_home - predicted_away) = sign(final_home - final_away) then
      outcome_points := 3;
    end if;

    if predicted_home = final_home or predicted_away = final_away then
      one_score_point := 1;
    end if;

    if outcome_points = 3 and one_score_point = 1 then
      outcome_points := 5;
      one_score_point := 0;
    end if;
  end if;

  if final_home = final_away
    and predicted_home = predicted_away
    and predicted_qualifier in ('home', 'away')
    and final_home_penalty_score is not null
    and final_away_penalty_score is not null
    and final_home_penalty_score <> final_away_penalty_score then
    final_qualifier := case
      when final_home_penalty_score > final_away_penalty_score then 'home'
      else 'away'
    end;

    if predicted_qualifier = final_qualifier then
      qualifier_points := 2;
    end if;
  end if;

  return outcome_points + one_score_point + qualifier_points;
end;
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
    final_away_score,
    predicted_qualifier,
    final_home_penalty_score,
    final_away_penalty_score
  )
  where match_id = target_match_id;

  perform public.refresh_ranking_movements();

  if target_match_number >= 73 then
    perform public.refresh_knockout_ranking_movements();
  end if;
end;
$$;

update public.predictions pr
set points = public.calculate_points(
  pr.home_score,
  pr.away_score,
  m.home_score,
  m.away_score,
  pr.predicted_qualifier,
  m.home_penalty_score,
  m.away_penalty_score
)
from public.matches m
where m.id = pr.match_id
  and m.status = 'finished'
  and m.home_score is not null
  and m.away_score is not null;

select public.refresh_ranking_movements();
select public.refresh_knockout_ranking_movements();

revoke all on function public.finish_match(bigint, integer, integer, integer, integer) from public;
grant execute on function public.finish_match(bigint, integer, integer, integer, integer) to authenticated;

commit;
