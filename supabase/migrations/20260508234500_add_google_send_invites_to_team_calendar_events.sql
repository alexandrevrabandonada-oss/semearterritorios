-- Tijolo 061 - Preparacao segura para politica futura de convites do Google Calendar
-- Convites continuam desativados por padrao. O campo nao abre envio automatico.

alter table public.team_calendar_events
  add column if not exists google_send_invites boolean not null default false;
