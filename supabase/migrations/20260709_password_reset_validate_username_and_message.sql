-- Execute uma unica vez no SQL Editor do projeto Supabase existente.
-- Valida username no pedido de senha e melhora a mensagem copiada pelo admin.

begin;

create or replace function public.request_password_reset(username_input text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  clean_username text;
  normalized_username text;
  target_user_id uuid;
begin
  clean_username := trim(coalesce(username_input, ''));
  normalized_username := regexp_replace(lower(clean_username), '[[:space:]]+', '_', 'g');

  if normalized_username !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
    raise exception 'Digite seu username certinho para chamar o Doutor Admin.';
  end if;

  select p.id
  into target_user_id
  from public.profiles p
  where regexp_replace(lower(trim(p.display_name)), '[[:space:]]+', '_', 'g') = normalized_username;

  if target_user_id is null then
    raise exception 'Esse usuário não existe no Bolasso. Confere o username e tenta de novo.';
  end if;

  if exists (
    select 1
    from public.password_reset_requests prr
    where prr.user_id = target_user_id
      and prr.status = 'pending'
  ) then
    update public.password_reset_requests
    set requested_at = now()
    where user_id = target_user_id
      and status = 'pending';
  else
    insert into public.password_reset_requests (user_id)
    values (target_user_id);
  end if;

  return 'Pedido enviado com sucesso para o Doutor Admin. Agora é aguardar o resgate.';
end;
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

  reset_message :=
    '🩺⚽ Fala, ' || target_display_name || '!' || chr(10) || chr(10) ||
    'O Doutor Admin fez o resgate da sua senha no Bolasso.' || chr(10) || chr(10) ||
    '👤 Usuário: ' || target_display_name || chr(10) ||
    '🔑 Senha provisória: ' || generated_password || chr(10) || chr(10) ||
    'Entra com essa senha e troca por uma nova na aba Perfil. Não vacila de novo, camisa 10. 😅';

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

revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;
revoke all on function public.admin_generate_temporary_password(bigint) from public;
grant execute on function public.admin_generate_temporary_password(bigint) to authenticated;

commit;
