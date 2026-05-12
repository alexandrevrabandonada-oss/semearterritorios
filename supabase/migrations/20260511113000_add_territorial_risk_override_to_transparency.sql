alter table if exists public.public_transparency_snapshots
  add column if not exists territorial_risk_override boolean not null default false,
  add column if not exists territorial_risk_override_reason text null,
  add column if not exists territorial_risk_override_by uuid null references public.profiles(id) on delete set null,
  add column if not exists territorial_risk_override_at timestamptz null;

create index if not exists public_transparency_snapshots_territorial_risk_override_idx
  on public.public_transparency_snapshots (territorial_risk_override, status);

alter table if exists public.public_transparency_homologation_packages
  add column if not exists territorial_risk_acknowledged boolean not null default false,
  add column if not exists territorial_risk_justification text null,
  add column if not exists territorial_risk_acknowledged_by uuid null references public.profiles(id) on delete set null,
  add column if not exists territorial_risk_acknowledged_at timestamptz null;

create index if not exists public_transparency_homologation_packages_territorial_risk_ack_idx
  on public.public_transparency_homologation_packages (territorial_risk_acknowledged, status);
