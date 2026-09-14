-- Remove a exposição padrão de funções privilegiadas pela Data API.
-- Helpers usados por RLS continuam SECURITY DEFINER, mas apenas usuários
-- autenticados e o service role podem executá-los.

alter function public.get_user_role()
  set search_path = pg_catalog, public, pg_temp;

alter function public.create_public_transparency_snapshot_version(uuid, text)
  security invoker;

revoke execute on function public.apply_public_quote_workflow_guard() from public, anon, authenticated;
revoke execute on function public.block_conversation_circle_public_quote_approval() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.get_user_role() from public, anon;
revoke execute on function public.can_edit_weekly_team_report(uuid) from public, anon;
revoke execute on function public.can_read_weekly_team_report(uuid) from public, anon;
revoke execute on function public.can_update_own_team_calendar_attendance(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.is_weekly_team_report_owner(uuid) from public, anon;
revoke execute on function public.create_public_transparency_snapshot_version(uuid, text) from public, anon;

grant execute on function public.get_user_role() to authenticated, service_role;
grant execute on function public.can_edit_weekly_team_report(uuid) to authenticated, service_role;
grant execute on function public.can_read_weekly_team_report(uuid) to authenticated, service_role;
grant execute on function public.can_update_own_team_calendar_attendance(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.is_weekly_team_report_owner(uuid) to authenticated, service_role;
grant execute on function public.create_public_transparency_snapshot_version(uuid, text) to authenticated, service_role;
