-- Tijolo 042 - Perfis operacionais da equipe e participantes de ação
--
-- Separa acesso (profiles/auth) de participação operacional (team_members)
-- sem conceder permissões automaticamente.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null references public.profiles(id) on delete set null,
  display_name text not null,
  email text null,
  role_label text null,
  active boolean not null default true,
  can_interview boolean not null default true,
  can_join_actions boolean not null default true,
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_team_members (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  responsibility text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null,
  unique (action_id, team_member_id)
);

alter table public.listening_records
  add column if not exists interviewer_team_member_id uuid null
    references public.team_members(id) on delete set null;

comment on column public.listening_records.interviewer_team_member_id is
  'Entrevistador padronizado via cadastro operacional da equipe (team_members). interviewer_name legado permanece para compatibilidade.';

create index if not exists idx_team_members_active on public.team_members (active);
create index if not exists idx_team_members_display_name on public.team_members (display_name);
create index if not exists idx_action_team_members_action_id on public.action_team_members (action_id);
create index if not exists idx_listening_records_interviewer_team_member_id on public.listening_records (interviewer_team_member_id);

create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create trigger set_action_team_members_updated_at
before update on public.action_team_members
for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;
alter table public.action_team_members enable row level security;

create policy "Autenticados podem ler equipe ativa"
on public.team_members for select to authenticated
using (active = true);

create policy "Admin e coordenação leem toda equipe"
on public.team_members for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Admin e coordenação criam equipe"
on public.team_members for insert to authenticated
with check (public.get_user_role() in ('admin', 'coordenacao') and created_by = auth.uid());

create policy "Admin e coordenação editam equipe"
on public.team_members for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Perfis autorizados leem participantes da ação"
on public.action_team_members for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

create policy "Equipe autorizada cria participantes da ação"
on public.action_team_members for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and exists (
      select 1 from public.actions a
      where a.id = action_id
        and a.created_by = auth.uid()
    )
  )
);

create policy "Equipe autorizada edita participantes da ação"
on public.action_team_members for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and exists (
      select 1 from public.actions a
      where a.id = action_id
        and a.created_by = auth.uid()
    )
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and exists (
      select 1 from public.actions a
      where a.id = action_id
        and a.created_by = auth.uid()
    )
  )
);

create policy "Equipe autorizada remove participantes da ação"
on public.action_team_members for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and exists (
      select 1 from public.actions a
      where a.id = action_id
        and a.created_by = auth.uid()
    )
  )
);
