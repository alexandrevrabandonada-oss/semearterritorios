-- Tijolo 054 - Agenda Coletiva da Equipe SEMEAR
--
-- Agenda interna com eventos operacionais, responsáveis, presença
-- e preparação segura para futura sincronização com Google Calendar.

create table if not exists public.team_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  event_type text not null check (event_type in (
    'acao_campo',
    'banca_escuta',
    'reuniao',
    'relatorio_semanal',
    'devolutiva',
    'dossie',
    'memoria',
    'prazo',
    'outro'
  )),
  starts_at timestamptz not null,
  ends_at timestamptz null,
  all_day boolean not null default false,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'done', 'cancelled', 'postponed')),
  action_id uuid null references public.actions(id) on delete set null,
  neighborhood_id uuid null references public.neighborhoods(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  google_calendar_event_id text null,
  google_calendar_id text null,
  google_sync_status text null,
  google_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.team_calendar_event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_calendar_events(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  responsibility text null,
  attendance_status text not null default 'invited' check (attendance_status in (
    'invited',
    'confirmed',
    'declined',
    'attended',
    'absent',
    'unknown'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_member_id)
);

alter table public.weekly_team_reports
  add column if not exists team_calendar_event_id uuid null references public.team_calendar_events(id) on delete set null;

alter table public.project_memory_entries
  add column if not exists team_calendar_event_id uuid null references public.team_calendar_events(id) on delete set null;

create index if not exists idx_team_calendar_events_starts_at on public.team_calendar_events (starts_at asc);
create index if not exists idx_team_calendar_events_status on public.team_calendar_events (status);
create index if not exists idx_team_calendar_events_event_type on public.team_calendar_events (event_type);
create index if not exists idx_team_calendar_events_action_id on public.team_calendar_events (action_id);
create index if not exists idx_team_calendar_events_neighborhood_id on public.team_calendar_events (neighborhood_id);
create index if not exists idx_team_calendar_event_members_event_id on public.team_calendar_event_members (event_id);
create index if not exists idx_team_calendar_event_members_team_member_id on public.team_calendar_event_members (team_member_id);
create index if not exists idx_weekly_team_reports_team_calendar_event_id on public.weekly_team_reports (team_calendar_event_id);
create index if not exists idx_project_memory_entries_team_calendar_event_id on public.project_memory_entries (team_calendar_event_id);

drop trigger if exists set_team_calendar_events_updated_at on public.team_calendar_events;
create trigger set_team_calendar_events_updated_at
before update on public.team_calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists set_team_calendar_event_members_updated_at on public.team_calendar_event_members;
create trigger set_team_calendar_event_members_updated_at
before update on public.team_calendar_event_members
for each row execute function public.set_updated_at();

create or replace function public.can_update_own_team_calendar_attendance(
  p_membership_id uuid,
  p_event_id uuid,
  p_team_member_id uuid,
  p_responsibility text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.team_calendar_event_members member_link
    inner join public.team_members member on member.id = member_link.team_member_id
    where member_link.id = p_membership_id
      and member_link.event_id = p_event_id
      and member_link.team_member_id = p_team_member_id
      and coalesce(member_link.responsibility, '') = coalesce(p_responsibility, '')
      and member.profile_id = auth.uid()
      and member.active = true
  );
$$;

alter table public.team_calendar_events enable row level security;
alter table public.team_calendar_event_members enable row level security;

create policy "Equipe autenticada le agenda coletiva"
on public.team_calendar_events for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

create policy "Coordenação e admin criam agenda coletiva"
on public.team_calendar_events for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  and created_by = auth.uid()
);

create policy "Coordenação e admin editam agenda coletiva"
on public.team_calendar_events for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Coordenação e admin removem agenda coletiva"
on public.team_calendar_events for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Equipe autenticada le participantes da agenda"
on public.team_calendar_event_members for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

create policy "Coordenação e admin criam participantes da agenda"
on public.team_calendar_event_members for insert to authenticated
with check (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Coordenação e admin editam participantes da agenda"
on public.team_calendar_event_members for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Equipe atualiza somente a propria presença na agenda"
on public.team_calendar_event_members for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and public.can_update_own_team_calendar_attendance(id, event_id, team_member_id, responsibility)
)
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and public.can_update_own_team_calendar_attendance(id, event_id, team_member_id, responsibility)
);

create policy "Coordenação e admin removem participantes da agenda"
on public.team_calendar_event_members for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));
