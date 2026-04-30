create table if not exists public.action_closures (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.actions(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'in_review', 'closed', 'reopened')),
  coordination_sufficiency boolean not null default false,
  sufficiency_reason text,
  documentation_checklist jsonb not null default '{}'::jsonb,
  evidence_notes text,
  internal_notes text,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete set null,
  reopened_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_closures_action_id_idx on public.action_closures (action_id);
create index if not exists action_closures_status_idx on public.action_closures (status);

drop trigger if exists set_action_closures_updated_at on public.action_closures;
create trigger set_action_closures_updated_at
before update on public.action_closures
for each row execute function public.set_updated_at();

alter table public.action_closures enable row level security;

create policy "Autenticados podem ler fechamentos de ação"
on public.action_closures for select to authenticated
using (true);

create policy "Equipe, coordenação e admin podem criar fechamento"
on public.action_closures for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and (
    public.get_user_role() in ('admin', 'coordenacao')
    or (
      status in ('open', 'in_review', 'reopened')
      and coordination_sufficiency = false
      and closed_by is null
      and closed_at is null
      and reopened_by is null
      and reopened_at is null
    )
  )
);

create policy "Equipe edita próprio fechamento aberto; coordenação e admin editam qualquer"
on public.action_closures for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status <> 'closed'
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status <> 'closed'
    and coordination_sufficiency = false
    and closed_by is null
    and closed_at is null
  )
);
