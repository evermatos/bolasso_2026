-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Mantem pedidos resolvidos visiveis para o admin e guarda a mensagem gerada.

begin;

alter table public.password_reset_requests
  add column if not exists temporary_password text,
  add column if not exists generated_message text;

drop function if exists public.admin_list_password_reset_requests();

create or replace function public.admin_list_password_reset_requests()
returns table (
  id bigint,
  user_id uuid,
  display_name text,
  requested_at timestamptz,
  resolved_at timestamptz,
  generated_message text,
  status text
)
language sql
stable
security definer set search_path = ''
as $$
  select
    prr.id,
    prr.user_id,
    p.display_name,
    prr.requested_at,
    prr.resolved_at,
    prr.generated_message,
    prr.status
  from public.password_reset_requests prr
  join public.profiles p on p.id = prr.user_id
  where public.is_admin()
  order by
    case when prr.status = 'pending' then 0 else 1 end,
    coalesce(prr.resolved_at, prr.requested_at) desc;
$$;

create or replace function public.admin_generate_temporary_password(
  request_id bigint
)
returns table (
  display_name text,
  temporary_password text,
  message text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  target_user_id uuid;
  target_display_name text;
  password_bases text[] := array[
    'vacilei',
    'chuteiout',
    'franguei',
    'foimal',
    'driblei',
    'travou'
  ];
  generated_password text;
  reset_message text;
begin
  if not public.is_admin() then
    raise exception 'Apenas o Doutor Admin pode operar essa maca.';
  end if;

  select prr.user_id, p.display_name
  into target_user_id, target_display_name
  from public.password_reset_requests prr
  join public.profiles p on p.id = prr.user_id
  where prr.id = request_id
    and prr.status = 'pending'
  for update;

  if target_user_id is null then
    raise exception 'Pedido de senha não encontrado ou já resolvido.';
  end if;

  generated_password := password_bases[
      (floor(random() * array_length(password_bases, 1))::integer + 1)
    ]
    || lpad(floor(random() * 1000)::integer::text, 3, '0');

  reset_message := 'Fala, ' || target_display_name || '! O Doutor Admin viu que a senha foi de lateral. Sua senha provisória é: '
    || generated_password
    || '. Entra no Bolasso com ela e troca por uma nova na aba Perfil.';

  update auth.users
  set encrypted_password = extensions.crypt(
        generated_password,
        extensions.gen_salt('bf')
      ),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      recovery_token = '',
      confirmation_token = '',
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Usuário não encontrado no Auth.';
  end if;

  update public.password_reset_requests
  set status = 'completed',
      resolved_at = now(),
      resolved_by = auth.uid(),
      temporary_password = generated_password,
      generated_message = reset_message
  where id = request_id;

  display_name := target_display_name;
  temporary_password := generated_password;
  message := reset_message;

  return next;
end;
$$;

revoke all on function public.admin_list_password_reset_requests() from public;
grant execute on function public.admin_list_password_reset_requests() to authenticated;
revoke all on function public.admin_generate_temporary_password(bigint) from public;
grant execute on function public.admin_generate_temporary_password(bigint) to authenticated;

commit;
