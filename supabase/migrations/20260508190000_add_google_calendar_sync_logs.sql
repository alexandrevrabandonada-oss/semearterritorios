-- Tijolo 056 - Sincronização manual e auditável com Google Calendar
--
-- O SEMEAR continua como fonte principal. O Google Calendar atua apenas
-- como espelho operacional manual e auditável.

create table if not exists public.google_calendar_sync_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_calendar_events(id) on delete cascade,
  action text not null check (action in ('create', 'update', 'cancel', 'unlink', 'error')),
  google_calendar_id text null,
  google_calendar_event_id text null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  message text null,
  payload_summary jsonb null,
  synced_by uuid null references public.profiles(id) on delete set null,
  synced_at timestamptz not null default now()
);

create index if not exists idx_google_calendar_sync_logs_event_id on public.google_calendar_sync_logs (event_id);
create index if not exists idx_google_calendar_sync_logs_synced_at on public.google_calendar_sync_logs (synced_at desc);
create index if not exists idx_google_calendar_sync_logs_synced_by on public.google_calendar_sync_logs (synced_by);

update public.team_calendar_events
set google_sync_status = 'not_synced'
where google_sync_status is null;

alter table public.team_calendar_events
  alter column google_sync_status set default 'not_synced';

alter table public.team_calendar_events
  drop constraint if exists team_calendar_events_google_sync_status_check;

alter table public.team_calendar_events
  add constraint team_calendar_events_google_sync_status_check
  check (google_sync_status in ('not_synced', 'synced', 'sync_error', 'cancelled', 'unlinked'));

alter table public.google_calendar_sync_logs enable row level security;

create policy "Equipe autenticada le logs do Google Calendar"
on public.google_calendar_sync_logs for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

create policy "Coordenacao e admin registram logs do Google Calendar"
on public.google_calendar_sync_logs for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  and synced_by = auth.uid()
);
