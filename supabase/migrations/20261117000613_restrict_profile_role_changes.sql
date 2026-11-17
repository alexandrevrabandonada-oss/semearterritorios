-- Atribuições de acesso geral exigem operação administrativa controlada.
-- Não modifica perfis existentes; o gatilho de Auth continua criando role NULL.
begin;
revoke insert, update, truncate, trigger, references on table public.profiles from anon, authenticated;
revoke insert (id, full_name, role, created_at, updated_at) on public.profiles from anon, authenticated;
revoke update (id, full_name, role, created_at, updated_at) on public.profiles from anon, authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;
commit;
