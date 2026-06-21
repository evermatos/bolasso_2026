-- Execute uma unica vez no SQL Editor do projeto Supabase existente.

begin;

create table if not exists public.oracle_predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  pick text not null check (pick in ('home', 'draw', 'away')),
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index if not exists oracle_predictions_match_id_idx
  on public.oracle_predictions(match_id);

alter table public.oracle_predictions enable row level security;

drop policy if exists "Users can see their oracle predictions"
  on public.oracle_predictions;

create policy "Users can see their oracle predictions"
  on public.oracle_predictions for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.get_oracle_prediction(target_match_id bigint)
returns table (
  match_id bigint,
  pick text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = ''
as $$
declare
  selected_pick text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1 from public.matches where id = target_match_id
  ) then
    raise exception 'Jogo não encontrado.';
  end if;

  selected_pick := (
    array['home', 'draw', 'away']
  )[1 + floor(random() * 3)::integer];

  insert into public.oracle_predictions (user_id, match_id, pick)
  values (auth.uid(), target_match_id, selected_pick)
  on conflict (user_id, match_id) do nothing;

  return query
  select
    oracle_predictions.match_id,
    oracle_predictions.pick,
    oracle_predictions.created_at
  from public.oracle_predictions
  where oracle_predictions.user_id = auth.uid()
    and oracle_predictions.match_id = target_match_id;
end;
$$;

revoke all on function public.get_oracle_prediction(bigint) from public;
grant execute on function public.get_oracle_prediction(bigint) to authenticated;

commit;
