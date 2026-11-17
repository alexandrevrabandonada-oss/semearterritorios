-- Restringe a tabela de oficinas a usuários autenticados e fixa o contexto
-- de resolução de nomes da função usada pelo trigger de validação.

revoke all privileges on table public.workshop_records from anon;

alter function public.ensure_workshop_record_action_type()
  set search_path = pg_catalog, public;
