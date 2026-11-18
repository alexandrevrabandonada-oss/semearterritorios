begin;

-- Permite acesso FEC a qualquer conta SEMEAR institucionalmente habilitada,
-- independentemente de função geral ou vínculo em team_members.
-- O gatilho handle_new_user cria profiles.role NULL para novas inscrições;
-- essas contas não são automaticamente autorizadas a consultar documentos FEC.
-- O restante das políticas já chama este helper, inclusive revisão,
-- arquivos privados, controle de capacidade e autorização por proprietário.
create or replace function private.fec_is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and nullif(btrim(p.role), '') is not null
    );
$$;

-- Não criar permissões públicas nem alterar RLS/Storage da APS.
revoke all on function private.fec_is_active_member() from public, anon;
grant execute on function private.fec_is_active_member() to authenticated;

comment on function private.fec_is_active_member() is
  'Compatibilidade FEC: conta autenticada com perfil SEMEAR habilitado (role não nulo/não vazio), sem exigir team_members. Não confere acesso a anon nem a inscrições pendentes.';

commit;
