-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Recalcula pontos com o trigger de protecao desligado temporariamente.
-- Nao muda criterios: apenas permite aplicar o bonus de penaltis ja definido.

begin;

alter table public.predictions disable trigger protect_prediction_values;

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

alter table public.predictions enable trigger protect_prediction_values;

select public.refresh_ranking_movements();
select public.refresh_knockout_ranking_movements();

commit;
