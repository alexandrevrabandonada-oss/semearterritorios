create table if not exists public.public_transparency_snapshots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_start date,
  period_end date,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'published', 'archived')),
  public_summary text,
  totals jsonb not null default '{}'::jsonb,
  territory_summary jsonb not null default '[]'::jsonb,
  theme_summary jsonb not null default '[]'::jsonb,
  word_summary jsonb not null default '[]'::jsonb,
  action_timeline jsonb not null default '[]'::jsonb,
  debrief_links jsonb not null default '[]'::jsonb,
  privacy_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_transparency_snapshots_status_idx
on public.public_transparency_snapshots (status);

create index if not exists public_transparency_snapshots_published_at_idx
on public.public_transparency_snapshots (published_at desc);

drop trigger if exists set_public_transparency_snapshots_updated_at on public.public_transparency_snapshots;
create trigger set_public_transparency_snapshots_updated_at
before update on public.public_transparency_snapshots
for each row execute function public.set_updated_at();

alter table public.public_transparency_snapshots enable row level security;

create policy "Anonimos leem apenas snapshots publicados"
on public.public_transparency_snapshots for select to anon
using (status = 'published');

create policy "Autenticados leem snapshots de transparencia"
on public.public_transparency_snapshots for select to authenticated
using (true);

create policy "Equipe cria somente rascunhos de snapshot"
on public.public_transparency_snapshots for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and status = 'draft'
  and approved_by is null
  and approved_at is null
  and published_at is null
);

create policy "Equipe revisa rascunhos proprios; coordenacao e admin publicam"
on public.public_transparency_snapshots for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'reviewed')
  )
)
with check (
  (
    public.get_user_role() in ('admin', 'coordenacao')
  )
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'reviewed')
    and approved_by is null
    and approved_at is null
    and published_at is null
  )
);
