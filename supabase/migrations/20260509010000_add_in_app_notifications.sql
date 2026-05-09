-- Tijolo 063 - Central de Avisos e Preferências de Lembretes Internos
--
-- Avisos são exclusivamente internos ao app:
-- sem push, sem e-mail, sem webhook externo.

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null references public.profiles(id) on delete cascade,
  team_member_id uuid null references public.team_members(id) on delete set null,
  audience_role text null check (audience_role in ('equipe', 'coordenacao', 'admin')),
  title text not null,
  body text null,
  notification_type text not null check (notification_type in (
    'agenda_event_today',
    'agenda_event_tomorrow',
    'agenda_event_overdue',
    'google_sync_error',
    'google_drift_pending',
    'weekly_report_due',
    'weekly_report_needs_changes',
    'debrief_pending',
    'dossier_pending',
    'listening_review_pending',
    'transparency_review_pending',
    'memory_review_pending',
    'system_notice',
    'outro'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'unread' check (status in ('unread', 'read', 'archived', 'dismissed')),
  source_type text null,
  source_id uuid null,
  action_url text null,
  due_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  dismissed_at timestamptz null,
  dedupe_profile_id uuid generated always as (coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  dedupe_team_member_id uuid generated always as (coalesce(team_member_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  dedupe_audience_role text generated always as (coalesce(audience_role, '')) stored,
  dedupe_source_type text generated always as (coalesce(source_type, '')) stored,
  dedupe_source_id uuid generated always as (coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  is_active boolean generated always as (status in ('unread', 'read')) stored,
  check (
    action_url is null
    or action_url like '/%'
  )
);

create unique index if not exists in_app_notifications_active_dedupe_idx
on public.in_app_notifications (
  dedupe_profile_id,
  dedupe_team_member_id,
  dedupe_audience_role,
  notification_type,
  dedupe_source_type,
  dedupe_source_id,
  is_active
);

create index if not exists in_app_notifications_profile_idx
on public.in_app_notifications (profile_id, status, priority, due_at, created_at desc);

create index if not exists in_app_notifications_role_idx
on public.in_app_notifications (audience_role, status, priority, due_at, created_at desc);

create index if not exists in_app_notifications_team_member_idx
on public.in_app_notifications (team_member_id, status, priority, due_at, created_at desc);

create index if not exists in_app_notifications_type_idx
on public.in_app_notifications (notification_type, status, priority, created_at desc);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  agenda_reminders boolean not null default true,
  google_calendar_alerts boolean not null default true,
  weekly_report_alerts boolean not null default true,
  debrief_dossier_alerts boolean not null default true,
  listening_review_alerts boolean not null default true,
  transparency_alerts boolean not null default false,
  memory_alerts boolean not null default true,
  quiet_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_preferences_profile_idx
on public.notification_preferences (profile_id);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.in_app_notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy "Usuario le avisos proprios por profile"
on public.in_app_notifications for select to authenticated
using (
  profile_id = auth.uid()
  or (
    team_member_id is not null
    and exists (
      select 1
      from public.team_members member
      where member.id = team_member_id
        and member.profile_id = auth.uid()
        and member.active = true
    )
  )
  or (
    audience_role is not null
    and audience_role = public.get_user_role()
  )
  or (
    profile_id is null
    and team_member_id is null
    and audience_role is null
    and public.get_user_role() in ('admin', 'coordenacao')
  )
);

create policy "Usuario cria avisos proprios e coordenacao cria gerais"
on public.in_app_notifications for insert to authenticated
with check (
  (
    public.get_user_role() in ('admin', 'coordenacao')
    and coalesce(created_by, auth.uid()) = auth.uid()
  )
  or (
    profile_id = auth.uid()
    and coalesce(created_by, auth.uid()) = auth.uid()
    and audience_role is null
  )
);

create policy "Usuario atualiza avisos proprios e coordenacao gerencia gerais"
on public.in_app_notifications for update to authenticated
using (
  (
    public.get_user_role() in ('admin', 'coordenacao')
  )
  or profile_id = auth.uid()
)
with check (
  (
    public.get_user_role() in ('admin', 'coordenacao')
  )
  or (
    profile_id = auth.uid()
    and coalesce(created_by, auth.uid()) = auth.uid()
  )
);

create policy "Apenas coordenacao/admin removem avisos"
on public.in_app_notifications for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Usuario le preferencias proprias; coordenacao/admin consultam"
on public.notification_preferences for select to authenticated
using (
  profile_id = auth.uid()
  or public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Usuario cria preferencia propria; coordenacao/admin podem criar"
on public.notification_preferences for insert to authenticated
with check (
  (profile_id = auth.uid())
  or public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Usuario edita preferencia propria; coordenacao/admin podem editar"
on public.notification_preferences for update to authenticated
using (
  profile_id = auth.uid()
  or public.get_user_role() in ('admin', 'coordenacao')
)
with check (
  profile_id = auth.uid()
  or public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Apenas coordenacao/admin removem preferencia"
on public.notification_preferences for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));
