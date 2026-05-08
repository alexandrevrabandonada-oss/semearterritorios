-- Tijolo 051 - Relatórios Semanais da Equipe e Memória do Projeto
--
-- Cria o módulo interno de memória do projeto, com relatórios semanais,
-- anexos privados e entradas curadas para linha do tempo institucional.

create table if not exists public.weekly_team_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  profile_id uuid null references public.profiles(id) on delete set null,
  title text not null,
  summary text null,
  activities_done text null,
  territories_involved text null,
  problems_found text null,
  learnings text null,
  pending_items text null,
  next_steps text null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'approved', 'needs_changes', 'archived')),
  review_notes text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (week_end >= week_start)
);

create table if not exists public.weekly_team_report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_team_reports(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, action_id)
);

create table if not exists public.weekly_team_report_neighborhoods (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_team_reports(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, neighborhood_id)
);

create table if not exists public.weekly_team_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_team_reports(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text null,
  file_size integer null,
  uploaded_by uuid null references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_memory_entries (
  id uuid primary key default gen_random_uuid(),
  source_report_id uuid null references public.weekly_team_reports(id) on delete set null,
  action_id uuid null references public.actions(id) on delete set null,
  entry_date date not null,
  title text not null,
  body text not null,
  memory_type text not null check (memory_type in ('atividade', 'decisao', 'aprendizado', 'problema', 'encaminhamento', 'marco', 'outro')),
  visibility text not null default 'internal' check (visibility in ('internal', 'public_candidate', 'public_approved')),
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weekly_team_reports_week_start on public.weekly_team_reports (week_start desc);
create index if not exists idx_weekly_team_reports_week_end on public.weekly_team_reports (week_end desc);
create index if not exists idx_weekly_team_reports_team_member_id on public.weekly_team_reports (team_member_id);
create index if not exists idx_weekly_team_reports_profile_id on public.weekly_team_reports (profile_id);
create index if not exists idx_weekly_team_reports_status on public.weekly_team_reports (status);
create index if not exists idx_weekly_team_report_actions_report_id on public.weekly_team_report_actions (report_id);
create index if not exists idx_weekly_team_report_actions_action_id on public.weekly_team_report_actions (action_id);
create index if not exists idx_weekly_team_report_neighborhoods_report_id on public.weekly_team_report_neighborhoods (report_id);
create index if not exists idx_weekly_team_report_neighborhoods_neighborhood_id on public.weekly_team_report_neighborhoods (neighborhood_id);
create index if not exists idx_weekly_team_report_attachments_report_id on public.weekly_team_report_attachments (report_id);
create index if not exists idx_project_memory_entries_entry_date on public.project_memory_entries (entry_date desc);
create index if not exists idx_project_memory_entries_memory_type on public.project_memory_entries (memory_type);
create index if not exists idx_project_memory_entries_visibility on public.project_memory_entries (visibility);
create index if not exists idx_project_memory_entries_action_id on public.project_memory_entries (action_id);
create index if not exists idx_project_memory_entries_source_report_id on public.project_memory_entries (source_report_id);

drop trigger if exists set_weekly_team_reports_updated_at on public.weekly_team_reports;
create trigger set_weekly_team_reports_updated_at
before update on public.weekly_team_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_weekly_team_report_actions_updated_at on public.weekly_team_report_actions;
create trigger set_weekly_team_report_actions_updated_at
before update on public.weekly_team_report_actions
for each row execute function public.set_updated_at();

drop trigger if exists set_weekly_team_report_neighborhoods_updated_at on public.weekly_team_report_neighborhoods;
create trigger set_weekly_team_report_neighborhoods_updated_at
before update on public.weekly_team_report_neighborhoods
for each row execute function public.set_updated_at();

drop trigger if exists set_weekly_team_report_attachments_updated_at on public.weekly_team_report_attachments;
create trigger set_weekly_team_report_attachments_updated_at
before update on public.weekly_team_report_attachments
for each row execute function public.set_updated_at();

drop trigger if exists set_project_memory_entries_updated_at on public.project_memory_entries;
create trigger set_project_memory_entries_updated_at
before update on public.project_memory_entries
for each row execute function public.set_updated_at();

create or replace function public.is_weekly_team_report_owner(report_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_team_reports report
    left join public.team_members member on member.id = report.team_member_id
    where report.id = report_id
      and (
        report.created_by = auth.uid()
        or report.profile_id = auth.uid()
        or member.profile_id = auth.uid()
      )
  );
$$;

create or replace function public.can_read_weekly_team_report(report_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (
    public.get_user_role() in ('admin', 'coordenacao')
    or public.is_weekly_team_report_owner(report_id)
  );
$$;

create or replace function public.can_edit_weekly_team_report(report_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_team_reports report
    where report.id = report_id
      and public.is_weekly_team_report_owner(report.id)
      and report.status in ('draft', 'needs_changes')
  );
$$;

alter table public.weekly_team_reports enable row level security;
alter table public.weekly_team_report_actions enable row level security;
alter table public.weekly_team_report_neighborhoods enable row level security;
alter table public.weekly_team_report_attachments enable row level security;
alter table public.project_memory_entries enable row level security;

create policy "Coordenação e admin leem todos os relatórios semanais"
on public.weekly_team_reports for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Equipe lê próprios relatórios semanais"
on public.weekly_team_reports for select to authenticated
using (public.is_weekly_team_report_owner(id));

create policy "Equipe cria próprio relatório semanal"
on public.weekly_team_reports for insert to authenticated
with check (
  public.get_user_role() = 'equipe'
  and created_by = auth.uid()
  and profile_id = auth.uid()
  and exists (
    select 1
    from public.team_members member
    where member.id = team_member_id
      and member.profile_id = auth.uid()
      and member.active = true
  )
  and status in ('draft', 'submitted')
  and reviewed_by is null
  and reviewed_at is null
);

create policy "Coordenação e admin criam relatório semanal"
on public.weekly_team_reports for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  and created_by = auth.uid()
);

create policy "Equipe edita próprio relatório semanal aberto; coordenação e admin revisam"
on public.weekly_team_reports for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(id)
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.is_weekly_team_report_owner(id)
    and created_by = auth.uid()
    and profile_id = auth.uid()
    and status in ('draft', 'needs_changes', 'submitted')
    and reviewed_by is null
    and reviewed_at is null
  )
);

create policy "Somente coordenação e admin removem relatório semanal"
on public.weekly_team_reports for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Autorizados leem vínculos de ações do relatório semanal"
on public.weekly_team_report_actions for select to authenticated
using (public.can_read_weekly_team_report(report_id));

create policy "Autorizados gerenciam vínculos de ações em relatório editável"
on public.weekly_team_report_actions for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and created_by = auth.uid()
  )
);

create policy "Autorizados atualizam vínculos de ações em relatório editável"
on public.weekly_team_report_actions for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and created_by = auth.uid()
  )
);

create policy "Autorizados removem vínculos de ações em relatório editável"
on public.weekly_team_report_actions for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
);

create policy "Autorizados leem vínculos de territórios do relatório semanal"
on public.weekly_team_report_neighborhoods for select to authenticated
using (public.can_read_weekly_team_report(report_id));

create policy "Autorizados gerenciam vínculos de territórios em relatório editável"
on public.weekly_team_report_neighborhoods for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and created_by = auth.uid()
  )
);

create policy "Autorizados atualizam vínculos de territórios em relatório editável"
on public.weekly_team_report_neighborhoods for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and created_by = auth.uid()
  )
);

create policy "Autorizados removem vínculos de territórios em relatório editável"
on public.weekly_team_report_neighborhoods for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
);

create policy "Autorizados leem anexos do relatório semanal"
on public.weekly_team_report_attachments for select to authenticated
using (public.can_read_weekly_team_report(report_id));

create policy "Autorizados registram anexos em relatório editável"
on public.weekly_team_report_attachments for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and uploaded_by = auth.uid()
  )
);

create policy "Autorizados atualizam anexos em relatório editável"
on public.weekly_team_report_attachments for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.can_edit_weekly_team_report(report_id)
    and uploaded_by = auth.uid()
  )
);

create policy "Autorizados removem anexos em relatório editável"
on public.weekly_team_report_attachments for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or public.can_edit_weekly_team_report(report_id)
);

create policy "Perfis autorizados leem memória do projeto"
on public.project_memory_entries for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

create policy "Equipe cria memória interna a partir de relatório aprovado; coordenação/admin criam qualquer entrada"
on public.project_memory_entries for insert to authenticated
with check (
  (
    public.get_user_role() in ('admin', 'coordenacao')
    and created_by = auth.uid()
  )
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and visibility = 'internal'
    and exists (
      select 1
      from public.weekly_team_reports report
      where report.id = source_report_id
        and report.status = 'approved'
        and public.is_weekly_team_report_owner(report.id)
    )
  )
);

create policy "Coordenação/admin revisam memória pública; equipe só atualiza memória interna própria"
on public.project_memory_entries for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and visibility = 'internal'
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and visibility = 'internal'
  )
);

create policy "Coordenação/admin removem memória do projeto"
on public.project_memory_entries for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-memory-documents',
  'project-memory-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coordenação/admin leem anexos privados da memória" on storage.objects;
create policy "Coordenação/admin leem anexos privados da memória"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-memory-documents'
  and public.get_user_role() in ('admin', 'coordenacao')
);

drop policy if exists "Equipe lê anexos do próprio relatório semanal" on storage.objects;
create policy "Equipe lê anexos do próprio relatório semanal"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-memory-documents'
  and public.get_user_role() = 'equipe'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.can_read_weekly_team_report(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Autorizados enviam anexos privados da memória" on storage.objects;
create policy "Autorizados enviam anexos privados da memória"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-memory-documents'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (
    public.get_user_role() in ('admin', 'coordenacao')
    or public.can_edit_weekly_team_report(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "Autorizados atualizam anexos privados da memória" on storage.objects;
create policy "Autorizados atualizam anexos privados da memória"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-memory-documents'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (
    public.get_user_role() in ('admin', 'coordenacao')
    or public.can_edit_weekly_team_report(((storage.foldername(name))[1])::uuid)
  )
)
with check (
  bucket_id = 'project-memory-documents'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (
    public.get_user_role() in ('admin', 'coordenacao')
    or public.can_edit_weekly_team_report(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "Autorizados removem anexos privados da memória" on storage.objects;
create policy "Autorizados removem anexos privados da memória"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-memory-documents'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (
    public.get_user_role() in ('admin', 'coordenacao')
    or public.can_edit_weekly_team_report(((storage.foldername(name))[1])::uuid)
  )
);
