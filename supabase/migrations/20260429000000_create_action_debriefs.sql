create table if not exists public.action_debriefs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  title text not null,
  public_summary text not null default '',
  methodology_note text not null default '',
  key_findings text not null default '',
  next_steps text not null default '',
  generated_markdown text not null default '',
  team_review_text text not null default '',
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved')),
  totals_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action_id)
);

create index if not exists action_debriefs_action_id_idx on public.action_debriefs (action_id);
create index if not exists action_debriefs_status_idx on public.action_debriefs (status);

drop trigger if exists set_action_debriefs_updated_at on public.action_debriefs;
create trigger set_action_debriefs_updated_at
before update on public.action_debriefs
for each row execute function public.set_updated_at();

alter table public.action_debriefs enable row level security;

create policy "Autenticados podem ler devolutivas de ação"
on public.action_debriefs for select to authenticated
using (true);

create policy "Equipe, coordenação e admin podem criar rascunhos de devolutiva"
on public.action_debriefs for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and status in ('draft', 'reviewed')
  and approved_by is null
  and approved_at is null
);

create policy "Equipe edita próprios rascunhos; coordenação e admin editam/aprovam"
on public.action_debriefs for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'reviewed')
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'reviewed')
    and approved_by is null
    and approved_at is null
  )
);
