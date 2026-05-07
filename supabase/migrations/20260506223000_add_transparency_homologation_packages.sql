create table if not exists public.public_transparency_homologation_packages (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.public_transparency_snapshots(id) on delete cascade,
  snapshot_version_id uuid references public.public_transparency_snapshot_versions(id) on delete set null,
  package_code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'ready_for_signature', 'signed', 'rejected', 'archived')),
  title text not null,
  period_start date,
  period_end date,
  institutional_summary text,
  methodology_note text,
  privacy_statement text,
  approval_checklist jsonb not null default '{}'::jsonb,
  risk_report jsonb not null default '{}'::jsonb,
  audit_export text,
  frozen_payload jsonb not null default '{}'::jsonb,
  decision text check (decision in ('aprovado_para_publicacao', 'revisar_antes_de_publicar', 'rejeitado', 'arquivado')),
  decision_reason text,
  prepared_by uuid references public.profiles(id) on delete set null,
  prepared_at timestamptz,
  signed_by uuid references public.profiles(id) on delete set null,
  signed_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_transparency_homologation_packages_snapshot_id_idx
on public.public_transparency_homologation_packages (snapshot_id, created_at desc);

create index if not exists public_transparency_homologation_packages_status_idx
on public.public_transparency_homologation_packages (status, decision);

drop trigger if exists set_public_transparency_homologation_packages_updated_at on public.public_transparency_homologation_packages;
create trigger set_public_transparency_homologation_packages_updated_at
before update on public.public_transparency_homologation_packages
for each row execute function public.set_updated_at();

alter table public.public_transparency_homologation_packages enable row level security;

create policy "Autenticados leem pacotes de homologacao institucional"
on public.public_transparency_homologation_packages for select to authenticated
using (true);

create policy "Equipe, coordenacao e admin criam pacote de homologacao em draft"
on public.public_transparency_homologation_packages for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and status = 'draft'
);

create policy "Equipe edita pacote draft proprio; coordenacao e admin gerenciam qualquer pacote"
on public.public_transparency_homologation_packages for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status = 'draft'
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status = 'draft'
    and signed_by is null
    and signed_at is null
    and rejected_by is null
    and rejected_at is null
  )
);

create or replace function public.transparency_homologation_checklist_complete(checklist jsonb, snapshot_status text default null)
returns boolean
language sql
immutable
as $$
  select coalesce((checklist ->> 'content_reviewed')::boolean, false)
    and coalesce((checklist ->> 'privacy_checklist_complete')::boolean, false)
    and coalesce((checklist ->> 'no_cpf_phone_email')::boolean, false)
    and coalesce((checklist ->> 'no_raw_quote')::boolean, false)
    and coalesce((checklist ->> 'no_interviewer_or_team_email')::boolean, false)
    and coalesce((checklist ->> 'rare_occupations_grouped')::boolean, false)
    and coalesce((checklist ->> 'minimum_sample_respected')::boolean, false)
    and coalesce((checklist ->> 'critical_comments_resolved')::boolean, false)
    and (
      coalesce(snapshot_status, '') <> 'published'
      or coalesce((checklist ->> 'public_api_checked')::boolean, false)
    )
    and coalesce((checklist ->> 'validated_by_coordination')::boolean, false);
$$;

create or replace function public.guard_transparency_homologation_package()
returns trigger
language plpgsql
as $$
declare
  snapshot_status text;
  pending_critical_comments integer;
  has_blocking_risk boolean;
  frozen_payload_empty boolean;
begin
  if new.prepared_by is null and auth.uid() is not null then
    new.prepared_by = auth.uid();
  end if;

  if new.prepared_at is null then
    new.prepared_at = now();
  end if;

  if new.status = 'ready_for_signature' and public.get_user_role() not in ('admin', 'coordenacao') then
    raise exception 'Apenas coordenação ou admin podem marcar pacote como pronto para assinatura.';
  end if;

  if new.status = 'signed' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação ou admin podem assinar pacote de homologação.';
    end if;

    if old.status in ('rejected', 'archived') then
      raise exception 'Pacotes rejeitados ou arquivados não podem ser assinados.';
    end if;

    select status
    into snapshot_status
    from public.public_transparency_snapshots
    where id = new.snapshot_id;

    if snapshot_status not in ('approved', 'published') then
      raise exception 'Assinatura bloqueada: snapshot precisa estar approved ou published.';
    end if;

    select count(*)
    into pending_critical_comments
    from public.public_transparency_snapshot_review_comments
    where snapshot_id = new.snapshot_id
      and resolved = false
      and comment_type in ('privacidade', 'dados', 'metodologia');

    if pending_critical_comments > 0 then
      raise exception 'Assinatura bloqueada: há comentários críticos pendentes.';
    end if;

    has_blocking_risk := coalesce((new.risk_report ->> 'hasBlockingRisk')::boolean, false);
    if has_blocking_risk then
      raise exception 'Assinatura bloqueada: há risco bloqueante no pacote.';
    end if;

    if not public.transparency_homologation_checklist_complete(new.approval_checklist, snapshot_status) then
      raise exception 'Assinatura bloqueada: checklist multi-etapa incompleto.';
    end if;

    frozen_payload_empty := new.frozen_payload is null or new.frozen_payload = '{}'::jsonb;
    if frozen_payload_empty then
      raise exception 'Assinatura bloqueada: frozen_payload vazio.';
    end if;

    new.signed_by = coalesce(new.signed_by, auth.uid());
    new.signed_at = coalesce(new.signed_at, now());
    new.decision = coalesce(new.decision, 'aprovado_para_publicacao');
  end if;

  if new.status = 'rejected' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação ou admin podem rejeitar pacote.';
    end if;
    new.rejected_by = coalesce(new.rejected_by, auth.uid());
    new.rejected_at = coalesce(new.rejected_at, now());
    new.decision = 'rejeitado';
  end if;

  if new.status = 'archived' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação ou admin podem arquivar pacote.';
    end if;
    new.decision = 'arquivado';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_transparency_homologation_package_before_write on public.public_transparency_homologation_packages;
create trigger guard_transparency_homologation_package_before_write
before insert or update on public.public_transparency_homologation_packages
for each row execute function public.guard_transparency_homologation_package();
