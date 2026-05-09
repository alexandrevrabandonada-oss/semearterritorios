-- Tijolo 065 - Limpeza Inteligente e Onboarding Operacional
--

-- Adicionar campos de resolução em in_app_notifications
alter table public.in_app_notifications
add column if not exists resolved_at timestamptz null,
add column if not exists resolution_reason text null,
add column if not exists resolution_source text null,
add column if not exists auto_resolution_suggested boolean not null default false;

-- Atualizar o check de notification_type para incluir onboarding se necessário
-- (O check atual permite 'system_notice', que usaremos por enquanto se não houver necessidade de novo tipo)
-- Mas vamos adicionar onboarding_welcome para clareza.
alter table public.in_app_notifications
drop constraint if exists in_app_notifications_notification_type_check;

alter table public.in_app_notifications
add constraint in_app_notifications_notification_type_check
check (notification_type in (
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
  'onboarding_welcome',
  'outro'
));

-- Criar tabela de estado de onboarding
create table if not exists public.user_onboarding_state (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  seen_welcome boolean not null default false,
  opened_agenda boolean not null default false,
  opened_listening_help boolean not null default false,
  opened_notifications boolean not null default false,
  completed_privacy_ack boolean not null default false,
  dismissed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists user_onboarding_state_profile_idx on public.user_onboarding_state(profile_id);

-- Trigger para updated_at
drop trigger if exists set_user_onboarding_state_updated_at on public.user_onboarding_state;
create trigger set_user_onboarding_state_updated_at
before update on public.user_onboarding_state
for each row execute function public.set_updated_at();

-- RLS
alter table public.user_onboarding_state enable row level security;

create policy "Usuarios leem seu proprio onboarding"
on public.user_onboarding_state for select to authenticated
using (profile_id = auth.uid());

create policy "Usuarios editam seu proprio onboarding"
on public.user_onboarding_state for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Usuarios criam seu proprio onboarding"
on public.user_onboarding_state for insert to authenticated
with check (profile_id = auth.uid());

create policy "Coordenação e Admin leem onboarding de todos"
on public.user_onboarding_state for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

-- Comentários
comment on table public.user_onboarding_state is 'Armazena o progresso do checklist de primeiro acesso do usuário.';
comment on column public.in_app_notifications.auto_resolution_suggested is 'Indica se o sistema detectou que a pendência foi resolvida na origem.';
