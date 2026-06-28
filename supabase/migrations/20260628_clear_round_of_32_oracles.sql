-- Execute depois de sincronizar as odds dos jogos 73 a 88.
-- Isso permite que o polvo recalcule palpites futuros dos 16 avos usando odds novas.

begin;

delete from public.oracle_predictions op
using public.matches m
where m.id = op.match_id
  and m.match_number between 73 and 88
  and m.status = 'scheduled'
  and m.kickoff_at - interval '5 minutes' > now();

commit;
