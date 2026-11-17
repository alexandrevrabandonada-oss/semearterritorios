-- Fixa a resolução de objetos das funções remanescentes apontadas pelo advisor.
-- Funções de trigger não precisam ser chamadas diretamente pela Data API.

alter function public.set_updated_at()
  set search_path = pg_catalog, public, pg_temp;

alter function public.transparency_review_checklist_complete(jsonb)
  set search_path = pg_catalog, public, pg_temp;

alter function public.guard_public_transparency_snapshot()
  set search_path = pg_catalog, public, pg_temp;

alter function public.audit_public_transparency_snapshot_version()
  set search_path = pg_catalog, public, pg_temp;

alter function public.transparency_homologation_checklist_complete(jsonb, text)
  set search_path = pg_catalog, public, pg_temp;

alter function public.guard_transparency_homologation_package()
  set search_path = pg_catalog, public, pg_temp;

alter function public.public_quote_has_critical_risk(text)
  set search_path = pg_catalog, public, pg_temp;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.guard_public_transparency_snapshot() from public, anon, authenticated;
revoke execute on function public.audit_public_transparency_snapshot_version() from public, anon, authenticated;
revoke execute on function public.guard_transparency_homologation_package() from public, anon, authenticated;
