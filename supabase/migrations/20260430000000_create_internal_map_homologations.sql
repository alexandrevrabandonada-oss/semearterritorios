create table if not exists public.internal_map_homologations (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'rejected')),
  decision text not null default 'manter_mapa_lista' check (
    decision in (
      'no_go_dados_insuficientes',
      'no_go_privacidade',
      'no_go_normalizacao',
      'go_desenho_tecnico',
      'go_prototipo_interno',
      'manter_mapa_lista'
    )
  ),
  decision_reason text not null,
  rls_validated boolean not null default false,
  admin_tested boolean not null default false,
  coordenacao_tested boolean not null default false,
  equipe_tested boolean not null default false,
  anon_blocked boolean not null default false,
  service_role_absent_frontend boolean not null default false,
  privacy_checked boolean not null default false,
  no_geocoding_confirmed boolean not null default false,
  reviewed_records_count integer not null default 0,
  territories_count integer not null default 0,
  ready_territories_count integer not null default 0,
  blocked_territories_count integer not null default 0,
  sensitive_pending_count integer not null default 0,
  duplicate_warnings_count integer not null default 0,
  safe_normalized_places_count integer not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists internal_map_homologations_status_idx on public.internal_map_homologations (status);
create index if not exists internal_map_homologations_decision_idx on public.internal_map_homologations (decision);
create index if not exists internal_map_homologations_created_at_idx on public.internal_map_homologations (created_at desc);

drop trigger if exists set_internal_map_homologations_updated_at on public.internal_map_homologations;
create trigger set_internal_map_homologations_updated_at
before update on public.internal_map_homologations
for each row execute function public.set_updated_at();

alter table public.internal_map_homologations enable row level security;

create policy "Autenticados podem ler homologações do mapa"
on public.internal_map_homologations for select to authenticated
using (true);

create policy "Equipe coordenação e admin podem criar rascunhos de homologação"
on public.internal_map_homologations for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and status in ('draft', 'reviewed')
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
);

create policy "Equipe edita próprios rascunhos; coordenação e admin revisam decidem"
on public.internal_map_homologations for update to authenticated
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
    and rejected_by is null
    and rejected_at is null
  )
);
