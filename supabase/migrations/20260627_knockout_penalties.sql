-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

alter table public.matches
  add column if not exists home_penalty_score smallint check (home_penalty_score between 0 and 99),
  add column if not exists away_penalty_score smallint check (away_penalty_score between 0 and 99);

alter table public.matches
  drop constraint if exists knockout_penalties_are_valid;

alter table public.matches
  add constraint knockout_penalties_are_valid
  check (
    (
      home_penalty_score is null
      and away_penalty_score is null
    )
    or (
      match_number >= 73
      and home_score = away_score
      and home_penalty_score is not null
      and away_penalty_score is not null
      and home_penalty_score <> away_penalty_score
    )
  );

drop function if exists public.finish_match(bigint, integer, integer);
drop function if exists public.finish_match(bigint, integer, integer, integer, integer);

create function public.finish_match(
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

  if target_match_number >= 73 and final_home_score = final_away_score then
    if final_home_penalty_score is null or final_away_penalty_score is null then
      raise exception 'Informe o placar dos pênaltis para jogo de mata-mata empatado.';
    end if;

    if final_home_penalty_score = final_away_penalty_score then
      raise exception 'O placar dos pênaltis precisa ter um vencedor.';
    end if;
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
end;
$$;

revoke all on function public.finish_match(bigint, integer, integer, integer, integer)
  from public;
grant execute on function public.finish_match(bigint, integer, integer, integer, integer)
  to authenticated;

commit;
