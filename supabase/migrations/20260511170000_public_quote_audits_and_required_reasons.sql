alter table public.listening_record_public_quotes
  add column if not exists public_approval_reason text null,
  add column if not exists rejection_reason text null,
  add column if not exists archive_reason text null,
  add column if not exists last_edit_reason text null;

create table if not exists public.listening_record_public_quote_audits (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.listening_record_public_quotes(id) on delete cascade,
  listening_record_id uuid null,
  action_id uuid null,
  event_type text not null check (event_type in (
    'created',
    'text_changed',
    'sanitized_text_changed',
    'sent_to_review',
    'approved_internal',
    'approved_public',
    'rejected',
    'archived',
    'restored',
    'risk_detected',
    'status_changed'
  )),
  old_status text null,
  new_status text null,
  old_sanitized_text text null,
  new_sanitized_text text null,
  old_quote_text text null,
  new_quote_text text null,
  risk_report jsonb null,
  reason text null,
  changed_by uuid null references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists listening_record_public_quote_audits_quote_idx
on public.listening_record_public_quote_audits (quote_id, changed_at desc);

create index if not exists listening_record_public_quote_audits_action_idx
on public.listening_record_public_quote_audits (action_id, changed_at desc);

create index if not exists listening_record_public_quote_audits_event_idx
on public.listening_record_public_quote_audits (event_type, changed_at desc);

create or replace function public.apply_public_quote_workflow_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_text text;
  source_action_id uuid;
  reason_text text;
  risk_payload jsonb;
  status_changed boolean;
begin
  select lr.action_id into source_action_id
  from public.listening_records lr
  where lr.id = new.listening_record_id;

  if source_action_id is null or source_action_id <> new.action_id then
    raise exception 'action_id da fala deve corresponder ao action_id da escuta.';
  end if;

  base_text := coalesce(nullif(trim(new.sanitized_text), ''), trim(new.quote_text));
  new.sensitive_risk := public.public_quote_has_critical_risk(base_text);

  if new.sensitive_risk then
    new.risk_notes := coalesce(new.risk_notes, 'Detector encontrou risco critico de dado pessoal.');
  end if;

  risk_payload := jsonb_build_object(
    'sensitive_risk', new.sensitive_risk,
    'risk_notes', coalesce(new.risk_notes, ''),
    'base_text_source', case when nullif(trim(coalesce(new.sanitized_text, '')), '') is not null then 'sanitized_text' else 'quote_text' end
  );

  if tg_op = 'INSERT' then
    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      'created',
      null,
      new.status,
      null,
      new.sanitized_text,
      null,
      new.quote_text,
      risk_payload,
      null,
      auth.uid()
    );

    if new.sensitive_risk then
      insert into public.listening_record_public_quote_audits (
        quote_id,
        listening_record_id,
        action_id,
        event_type,
        old_status,
        new_status,
        old_sanitized_text,
        new_sanitized_text,
        old_quote_text,
        new_quote_text,
        risk_report,
        reason,
        changed_by
      ) values (
        new.id,
        new.listening_record_id,
        new.action_id,
        'risk_detected',
        null,
        new.status,
        null,
        new.sanitized_text,
        null,
        new.quote_text,
        risk_payload,
        coalesce(new.risk_notes, 'Risco detectado na criação.'),
        auth.uid()
      );
    end if;

    return new;
  end if;

  if coalesce(old.sanitized_text, '') <> coalesce(new.sanitized_text, '') then
    if old.status = 'approved_public' and coalesce(trim(new.last_edit_reason), '') = '' then
      raise exception 'Edicao de texto sanitizado apos approved_public exige motivo da alteracao.';
    end if;

    reason_text := nullif(trim(new.last_edit_reason), '');

    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      'sanitized_text_changed',
      old.status,
      old.status,
      old.sanitized_text,
      new.sanitized_text,
      old.quote_text,
      new.quote_text,
      risk_payload,
      reason_text,
      auth.uid()
    );

    if old.status in ('approved_internal', 'approved_public') then
      new.status := 'needs_review';
      new.approved_by := null;
      new.approved_at := null;
    end if;

    new.last_edit_reason := null;
  end if;

  if coalesce(old.quote_text, '') <> coalesce(new.quote_text, '') then
    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      'text_changed',
      old.status,
      old.status,
      old.sanitized_text,
      new.sanitized_text,
      old.quote_text,
      new.quote_text,
      risk_payload,
      nullif(trim(new.last_edit_reason), ''),
      auth.uid()
    );

    new.last_edit_reason := null;
  end if;

  if new.status = 'approved_public' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação/admin podem aprovar fala pública.';
    end if;

    if new.sanitized_text is null or btrim(new.sanitized_text) = '' then
      raise exception 'approved_public exige sanitized_text preenchido.';
    end if;

    if new.sensitive_risk then
      raise exception 'approved_public bloqueado por risco crítico de privacidade.';
    end if;

    if coalesce(trim(new.public_approval_reason), '') = '' then
      raise exception 'approved_public exige justificativa da aprovação pública.';
    end if;

    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;

  if new.status = 'rejected' and coalesce(trim(new.rejection_reason), '') = '' then
    raise exception 'rejected exige motivo da rejeição.';
  end if;

  if new.status = 'archived' and coalesce(trim(new.archive_reason), '') = '' then
    raise exception 'archived exige motivo do arquivamento.';
  end if;

  if new.status in ('approved_internal', 'approved_public') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  status_changed := old.status <> new.status;

  if status_changed then
    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      case
        when new.status = 'needs_review' then 'sent_to_review'
        when new.status = 'approved_internal' then 'approved_internal'
        when new.status = 'approved_public' then 'approved_public'
        when new.status = 'rejected' then 'rejected'
        when new.status = 'archived' then 'archived'
        when old.status in ('rejected', 'archived') and new.status in ('draft', 'needs_review') then 'restored'
        else 'status_changed'
      end,
      old.status,
      new.status,
      old.sanitized_text,
      new.sanitized_text,
      old.quote_text,
      new.quote_text,
      risk_payload,
      case
        when new.status = 'approved_public' then new.public_approval_reason
        when new.status = 'rejected' then new.rejection_reason
        when new.status = 'archived' then new.archive_reason
        else nullif(trim(new.last_edit_reason), '')
      end,
      auth.uid()
    );

    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      'status_changed',
      old.status,
      new.status,
      old.sanitized_text,
      new.sanitized_text,
      old.quote_text,
      new.quote_text,
      risk_payload,
      null,
      auth.uid()
    );
  end if;

  if old.sensitive_risk is distinct from new.sensitive_risk and new.sensitive_risk then
    insert into public.listening_record_public_quote_audits (
      quote_id,
      listening_record_id,
      action_id,
      event_type,
      old_status,
      new_status,
      old_sanitized_text,
      new_sanitized_text,
      old_quote_text,
      new_quote_text,
      risk_report,
      reason,
      changed_by
    ) values (
      new.id,
      new.listening_record_id,
      new.action_id,
      'risk_detected',
      old.status,
      new.status,
      old.sanitized_text,
      new.sanitized_text,
      old.quote_text,
      new.quote_text,
      risk_payload,
      coalesce(new.risk_notes, 'Risco detectado após alteração.'),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

alter table public.listening_record_public_quote_audits enable row level security;

create policy "Anon sem acesso auditoria de falas"
on public.listening_record_public_quote_audits for all to anon
using (false)
with check (false);

create policy "Perfis autorizados leem auditoria de falas"
on public.listening_record_public_quote_audits for select to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and exists (
    select 1
    from public.listening_record_public_quotes q
    where q.id = listening_record_public_quote_audits.quote_id
  )
);

create policy "Perfis autorizados registram auditoria"
on public.listening_record_public_quote_audits for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and changed_by = auth.uid()
  and exists (
    select 1
    from public.listening_record_public_quotes q
    where q.id = listening_record_public_quote_audits.quote_id
  )
);
