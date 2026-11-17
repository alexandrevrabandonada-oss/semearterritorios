begin;

-- A FEC passa a usar o vínculo institucional ativo, sem papéis individuais.
-- O papel geral do perfil nunca autoriza sozinho: exige perfil permitido E
-- team_members ativo vinculado ao mesmo auth.uid().
create or replace function private.fec_is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('equipe','coordenacao','admin')
    )
    and exists (
      select 1 from public.team_members t
      where t.profile_id = auth.uid() and t.active is true
    );
$$;

create or replace function private.fec_can_submit(p_engagement_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.fec_is_active_member()
    and private.fec_scope_is_active(p_engagement_id);
$$;

create or replace function private.fec_can_review(p_engagement_id uuid, p_owner_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.fec_is_active_member()
    and p_owner_id is not null
    and auth.uid() <> p_owner_id
    and private.fec_scope_is_active(p_engagement_id);
$$;

-- Compatibilidade temporária para funções já instaladas. Ambos os antigos
-- rótulos executor/supervisor significam membro ativo; a revisão independente
-- é sempre verificada com fec_can_review(scope, autor).
create or replace function private.fec_has_assignment(p_engagement_id uuid, p_role text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.fec_is_active_member()
    and exists (select 1 from public.fec_engagements e where e.id = p_engagement_id)
    and (p_role is null or p_role in ('executor','supervisor'));
$$;

create or replace function private.fec_can_read_cycle(p_cycle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.fec_is_active_member()
    and exists (select 1 from public.fec_cycles c where c.id = p_cycle_id);
$$;

create or replace function private.fec_can_edit_cycle(p_cycle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.fec_is_active_member()
    and exists (
      select 1 from public.fec_cycles c
      where c.id = p_cycle_id
        and c.owner_id = auth.uid()
        and c.status in ('draft','needs_changes')
        and private.fec_scope_is_active(c.engagement_id)
    );
$$;

revoke all on function private.fec_is_active_member(),
  private.fec_can_submit(uuid), private.fec_can_review(uuid,uuid),
  private.fec_has_assignment(uuid,text), private.fec_can_read_cycle(uuid),
  private.fec_can_edit_cycle(uuid) from public, anon, authenticated;
grant execute on function private.fec_is_active_member(),
  private.fec_can_submit(uuid), private.fec_can_review(uuid,uuid),
  private.fec_has_assignment(uuid,text), private.fec_can_read_cycle(uuid),
  private.fec_can_edit_cycle(uuid) to authenticated;

create or replace function public.fec_is_active_member()
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_is_active_member();
$$;
create or replace function public.fec_can_submit(p_engagement_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_can_submit(p_engagement_id);
$$;
create or replace function public.fec_can_review(p_engagement_id uuid, p_owner_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_can_review(p_engagement_id,p_owner_id);
$$;
create or replace function public.fec_has_assignment(p_engagement_id uuid, p_role text default null)
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_has_assignment(p_engagement_id,p_role);
$$;
create or replace function public.fec_can_read_cycle(p_cycle_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_can_read_cycle(p_cycle_id);
$$;
create or replace function public.fec_can_edit_cycle(p_cycle_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and private.fec_can_edit_cycle(p_cycle_id);
$$;
revoke all on function public.fec_is_active_member(), public.fec_can_submit(uuid),
  public.fec_can_review(uuid,uuid), public.fec_has_assignment(uuid,text),
  public.fec_can_read_cycle(uuid), public.fec_can_edit_cycle(uuid)
  from public, anon;
grant execute on function public.fec_is_active_member(), public.fec_can_submit(uuid),
  public.fec_can_review(uuid,uuid), public.fec_has_assignment(uuid,text),
  public.fec_can_read_cycle(uuid), public.fec_can_edit_cycle(uuid)
  to authenticated;

-- Registros antigos de grants deixam de participar da autorização e não são
-- expostos aos clientes. Nenhum grant individual é criado por esta migration.
drop policy if exists "fec_grants_read_self_or_supervisor" on public.fec_access_grants;
revoke all on public.fec_access_grants from public, anon, authenticated;
grant all on public.fec_access_grants to service_role;

drop policy if exists "fec_engagements_read_active_assignment" on public.fec_engagements;
create policy fec_engagements_read_active_members on public.fec_engagements
  for select to authenticated using (public.fec_is_active_member());

drop policy if exists "fec_cycles_read_executor_or_supervisor" on public.fec_cycles;
drop policy if exists "fec_cycles_insert_executor_draft" on public.fec_cycles;
drop policy if exists "fec_cycles_update_executor_open" on public.fec_cycles;
create policy fec_cycles_read_active_members on public.fec_cycles
  for select to authenticated using (public.fec_can_read_cycle(id));
create policy fec_cycles_insert_active_member on public.fec_cycles
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and status = 'draft'
    and reviewed_by is null and reviewed_at is null and review_notes is null
    and public.fec_can_submit(engagement_id)
  );
create policy fec_cycles_update_owner_open on public.fec_cycles
  for update to authenticated using (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes')
    and public.fec_can_submit(engagement_id)
  ) with check (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes','submitted')
    and public.fec_can_submit(engagement_id)
  );

drop policy if exists "fec_activities_read_owner_or_supervisor" on public.fec_activities;
drop policy if exists "fec_activities_insert_owner_draft" on public.fec_activities;
drop policy if exists "fec_activities_update_owner_open" on public.fec_activities;
create policy fec_activities_read_active_members on public.fec_activities
  for select to authenticated using (public.fec_can_read_cycle(cycle_id));
create policy fec_activities_insert_owner_draft on public.fec_activities
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and status = 'draft'
    and reviewed_by is null and reviewed_at is null and review_notes is null
    and public.fec_can_edit_cycle(cycle_id)
  );
create policy fec_activities_update_owner_open on public.fec_activities
  for update to authenticated using (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes')
    and public.fec_can_edit_cycle(cycle_id)
  ) with check (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes','submitted')
    and public.fec_can_edit_cycle(cycle_id)
  );

drop policy if exists "fec_review_log_read_owners_or_supervisors" on public.fec_review_log;
drop policy if exists fec_knowledge_history_read on public.fec_review_log;
create policy fec_review_log_read_active_members on public.fec_review_log
  for select to authenticated using (
    public.fec_is_active_member()
    and exists (select 1 from public.fec_engagements e where e.id = engagement_id)
  );

drop policy if exists fec_knowledge_read on public.fec_knowledge_records;
drop policy if exists fec_knowledge_create on public.fec_knowledge_records;
drop policy if exists fec_knowledge_edit on public.fec_knowledge_records;
create policy fec_knowledge_read_active_members on public.fec_knowledge_records
  for select to authenticated using (public.fec_can_read_cycle(cycle_id));
create policy fec_knowledge_create_owner_draft on public.fec_knowledge_records
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and status = 'draft'
    and reviewed_by is null and reviewed_at is null and review_notes is null
    and public.fec_can_edit_cycle(cycle_id)
  );
create policy fec_knowledge_edit_owner_open on public.fec_knowledge_records
  for update to authenticated using (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes')
    and public.fec_can_edit_cycle(cycle_id)
  ) with check (
    owner_id = (select auth.uid()) and status in ('draft','needs_changes','submitted')
    and public.fec_can_edit_cycle(cycle_id)
  );
create policy fec_knowledge_history_read_active_members on public.fec_review_log
  for select to authenticated using (
    record_kind = 'knowledge' and public.fec_is_active_member()
    and exists (select 1 from public.fec_knowledge_records k where k.id = record_id)
  );

drop policy if exists fec_monthly_read on public.fec_monthly_reports;
create policy fec_monthly_read_active_members on public.fec_monthly_reports
  for select to authenticated using (
    public.fec_is_active_member()
    and exists (select 1 from public.fec_engagements e where e.id = engagement_id)
  );
-- Recria a política já existente sob o helper de leitura convergente.
drop policy if exists fec_monthly_history_read on public.fec_monthly_history;
create policy fec_monthly_history_read_active_members on public.fec_monthly_history
  for select to authenticated using (
    exists (select 1 from public.fec_monthly_reports r where r.id = report_id)
  );

drop policy if exists fec_import_batch_select on public.fec_import_batches;
drop policy if exists fec_import_batch_insert on public.fec_import_batches;
create policy fec_import_batch_select_active_members on public.fec_import_batches
  for select to authenticated using (public.fec_can_read_cycle(cycle_id));
create policy fec_import_batch_insert_owner on public.fec_import_batches
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and public.fec_can_edit_cycle(cycle_id)
  );

drop policy if exists fec_import_doc_select on public.fec_import_documents;
drop policy if exists fec_import_doc_insert on public.fec_import_documents;
drop policy if exists fec_import_doc_update on public.fec_import_documents;
create policy fec_import_doc_select_active_members on public.fec_import_documents
  for select to authenticated using (
    exists (select 1 from public.fec_import_batches b
      where b.id = batch_id and public.fec_can_read_cycle(b.cycle_id))
  );
create policy fec_import_doc_insert_owner on public.fec_import_documents
  for insert to authenticated with check (
    upload_state = 'reserved' and owner_id = (select auth.uid())
    and exists (select 1 from public.fec_import_batches b
      where b.id = batch_id and b.owner_id = owner_id and b.cycle_id = cycle_id
        and public.fec_can_edit_cycle(b.cycle_id))
  );
create policy fec_import_doc_update_owner on public.fec_import_documents
  for update to authenticated using (
    upload_state = 'reserved' and owner_id = (select auth.uid())
    and public.fec_can_edit_cycle(cycle_id)
  ) with check (
    upload_state = 'uploaded' and owner_id = (select auth.uid())
    and public.fec_can_edit_cycle(cycle_id)
  );

drop policy if exists fec_import_form_select on public.fec_import_forms;
drop policy if exists fec_import_form_insert on public.fec_import_forms;
create policy fec_import_form_select_active_members on public.fec_import_forms
  for select to authenticated using (
    exists (select 1 from public.fec_import_documents d
      join public.fec_import_batches b on b.id = d.batch_id
      where d.id = document_id and public.fec_can_read_cycle(b.cycle_id))
  );
create policy fec_import_form_insert_owner on public.fec_import_forms
  for insert to authenticated with check (
    exists (select 1 from public.fec_import_documents d
      where d.id = document_id and d.kind = 'questionnaires'
        and d.upload_state = 'uploaded' and d.owner_id = (select auth.uid())
        and public.fec_can_edit_cycle(d.cycle_id))
  );

drop policy if exists fec_import_review_select on public.fec_import_reviews;
drop policy if exists fec_import_review_insert on public.fec_import_reviews;
create policy fec_import_review_select_active_members on public.fec_import_reviews
  for select to authenticated using (
    exists (select 1 from public.fec_import_forms f
      join public.fec_import_documents d on d.id = f.document_id
      join public.fec_import_batches b on b.id = d.batch_id
      where f.id = form_id and public.fec_can_read_cycle(b.cycle_id))
  );
create policy fec_import_review_insert_independent_reviewer on public.fec_import_reviews
  for insert to authenticated with check (
    reviewer_id = (select auth.uid()) and exists (
      select 1 from public.fec_import_forms f
      join public.fec_import_documents d on d.id = f.document_id
      join public.fec_import_batches b on b.id = d.batch_id
      join public.fec_cycles c on c.id = b.cycle_id
      where f.id = form_id and d.upload_state = 'uploaded'
        and public.fec_can_review(c.engagement_id,b.owner_id)
    )
  );

drop policy if exists fec_evidence_read on public.fec_evidence_responses;
drop policy if exists fec_evidence_insert on public.fec_evidence_responses;
drop policy if exists fec_evidence_update on public.fec_evidence_responses;
create policy fec_evidence_read_active_members on public.fec_evidence_responses
  for select to authenticated using (
    exists (select 1 from public.fec_import_forms f
      join public.fec_import_documents d on d.id = f.document_id
      where f.id = form_id and public.fec_can_read_cycle(d.cycle_id))
  );
create policy fec_evidence_insert_owner on public.fec_evidence_responses
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and upload_state = 'reserved'
    and exists (select 1 from public.fec_import_forms f
      join public.fec_import_documents d on d.id = f.document_id
      where f.id = form_id and d.owner_id = (select auth.uid())
        and d.upload_state = 'uploaded' and public.fec_can_edit_cycle(d.cycle_id))
  );
create policy fec_evidence_update_owner on public.fec_evidence_responses
  for update to authenticated using (
    owner_id = (select auth.uid()) and upload_state = 'reserved'
    and exists (select 1 from public.fec_import_forms f
      join public.fec_import_documents d on d.id = f.document_id
      where f.id = form_id and public.fec_can_edit_cycle(d.cycle_id))
  ) with check (owner_id = (select auth.uid()) and upload_state = 'uploaded');

drop policy if exists fec_integrity_read on public.fec_file_integrity;
create policy fec_integrity_read_active_members on public.fec_file_integrity
  for select to authenticated using (
    (document_id is not null and exists (select 1 from public.fec_import_documents d
      where d.id = document_id and public.fec_can_read_cycle(d.cycle_id)))
    or (evidence_id is not null and exists (
      select 1 from public.fec_evidence_responses r
      join public.fec_import_forms f on f.id = r.form_id
      join public.fec_import_documents d on d.id = f.document_id
      where r.id = evidence_id and public.fec_can_read_cycle(d.cycle_id)))
  );
drop policy if exists fec_report_review_read on public.fec_report_reviews;
drop policy if exists fec_report_review_insert on public.fec_report_reviews;
create policy fec_report_review_read_active_members on public.fec_report_reviews
  for select to authenticated using (
    exists (select 1 from public.fec_import_batches b
      where b.id = batch_id and public.fec_can_read_cycle(b.cycle_id))
  );
create policy fec_report_review_insert_independent_reviewer on public.fec_report_reviews
  for insert to authenticated with check (
    reviewer_id = (select auth.uid()) and exists (
      select 1 from public.fec_import_batches b
      join public.fec_cycles c on c.id = b.cycle_id
      where b.id = batch_id and public.fec_can_review(c.engagement_id,b.owner_id)
    )
  );

-- A chamada de revisão continua sendo validada no banco, inclusive nas
-- transições efetuadas por SECURITY DEFINER.
create or replace function private.fec_review_record(
  p_record_kind text, p_record_id uuid, p_decision text, p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_table text; v_scope uuid; v_owner uuid; v_status text;
begin
  if auth.uid() is null or p_record_kind not in ('cycle','activity','knowledge')
    or p_decision not in ('approved','needs_changes') then
    raise exception 'Revisão inválida.';
  end if;
  if p_decision = 'needs_changes' and nullif(btrim(coalesce(p_reason,'')),'') is null then
    raise exception 'Justificativa obrigatória.';
  end if;
  v_table := case p_record_kind when 'cycle' then 'fec_cycles'
    when 'activity' then 'fec_activities' else 'fec_knowledge_records' end;
  if p_record_kind = 'cycle' then
    select engagement_id,owner_id,status into v_scope,v_owner,v_status
      from public.fec_cycles where id = p_record_id for update;
  else
    execute format(
      'select c.engagement_id,r.owner_id,r.status from public.%I r join public.fec_cycles c on c.id=r.cycle_id where r.id=$1 for update of r',
      v_table
    ) into v_scope,v_owner,v_status using p_record_id;
  end if;
  if v_owner is null or not private.fec_can_review(v_scope,v_owner) then
    raise exception 'Revisor ativo e diferente do autor obrigatórios.';
  end if;
  if v_status <> 'submitted'
    and not (v_status = 'approved' and p_decision = 'needs_changes' and p_record_kind <> 'knowledge') then
    raise exception 'Registro precisa estar enviado. Produtos aprovados exigem nova versão.';
  end if;
  execute format(
    'update public.%I set status=$1,reviewed_by=auth.uid(),reviewed_at=now(),review_notes=$2 where id=$3',
    v_table
  ) using p_decision,p_reason,p_record_id;
end;
$$;
revoke all on function private.fec_review_record(text,uuid,text,text) from public,anon,authenticated;
grant execute on function private.fec_review_record(text,uuid,text,text) to authenticated;

create or replace function private.fec_guard_record()
returns trigger language plpgsql set search_path = '' as $$
declare v_scope uuid; v_old jsonb := to_jsonb(old); v_new jsonb := to_jsonb(new);
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória.'; end if;
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
    or new.created_at is distinct from old.created_at
    or v_new->'cycle_id' is distinct from v_old->'cycle_id'
    or v_new->'engagement_id' is distinct from v_old->'engagement_id' then
    raise exception 'Identidade, autoria e origem imutáveis.';
  end if;
  if tg_table_name = 'fec_cycles' then v_scope := old.engagement_id;
  else select engagement_id into v_scope from public.fec_cycles where id = old.cycle_id; end if;
  if not private.fec_scope_is_active(v_scope) then raise exception 'Frente FEC inativa.'; end if;
  if old.owner_id = auth.uid() then
    if not private.fec_can_submit(v_scope)
      or old.status not in ('draft','needs_changes')
      or new.status not in ('draft','needs_changes','submitted')
      or (new.status = 'needs_changes' and old.status <> 'needs_changes') then
      raise exception 'Somente o autor ativo edita rascunho ou atende ajustes.';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_notes is distinct from old.review_notes then
      raise exception 'Campos de revisão são exclusivos do revisor.';
    end if;
    if tg_table_name = 'fec_cycles' and new.status = 'submitted'
      and (nullif(btrim(v_new->>'objectives'),'') is null
        or nullif(btrim(v_new->>'methodology'),'') is null) then
      raise exception 'Objetivos e metodologia obrigatórios no envio.';
    end if;
  else
    if not private.fec_can_review(v_scope,old.owner_id)
      or not ((old.status = 'submitted' and new.status in ('approved','needs_changes'))
        or (old.status = 'approved' and new.status = 'needs_changes')) then
      raise exception 'Revisão independente ou situação inválida.';
    end if;
    if (v_new-array['status','reviewed_by','reviewed_at','review_notes','updated_at'])
      is distinct from (v_old-array['status','reviewed_by','reviewed_at','review_notes','updated_at']) then
      raise exception 'O revisor não pode reescrever o conteúdo do autor.';
    end if;
    if new.status = 'needs_changes' and nullif(btrim(new.review_notes),'') is null then
      raise exception 'Justificativa obrigatória.';
    end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  end if;
  new.updated_at := now(); return new;
end;
$$;

-- Limite de extração consulta a regra institucional, nunca grants antigos.
create or replace function private.fec_import_acquire_capacity()
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); lease uuid;
begin
  if actor is null or not private.fec_is_active_member()
    or not exists (select 1 from public.fec_engagements e
      where e.status = 'active' and private.fec_can_submit(e.id)) then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('fec-import-global-capacity'));
  delete from private.fec_import_leases where expires_at < now();
  delete from private.fec_import_admission_attempts where created_at < now() - interval '1 hour';
  if (select count(*) from private.fec_import_admission_attempts where actor_id = actor) >= 20 then return null; end if;
  if (select count(*) from private.fec_import_leases) >= 2 then return null; end if;
  insert into private.fec_import_admission_attempts(actor_id) values(actor);
  insert into private.fec_import_leases(actor_id,expires_at) values(actor,now()+interval '90 seconds') returning id into lease;
  return lease;
end;
$$;

-- A checagem da presença do anexo passa pelo SECURITY DEFINER porque a leitura
-- direta de storage.objects será bloqueada para usuários da aplicação.
create or replace function private.fec_technical_object_exists(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.fec_is_active_member()
    and exists (
      select 1 from public.fec_knowledge_records k
      join storage.objects o on o.bucket_id = 'fec-technical-private' and o.name = p_name
      where k.id::text = split_part(p_name,'/',1)
        and k.owner_id = auth.uid() and k.status in ('draft','needs_changes')
        and private.fec_can_edit_cycle(k.cycle_id)
    );
$$;
revoke all on function private.fec_technical_object_exists(text) from public,anon,authenticated;
grant execute on function private.fec_technical_object_exists(text) to authenticated;
drop policy if exists fec_files_create on public.fec_knowledge_files;
create policy fec_files_create_owner on public.fec_knowledge_files
  for insert to authenticated with check (
    created_by = (select auth.uid()) and private.fec_can_access_file(object_name,true)
    and private.fec_technical_object_exists(object_name)
  );

-- Clients cannot read Storage objects directly. All human file reads pass
-- through server routes that authorize the row and append an audit event.
drop policy if exists fec_storage_read on storage.objects;
drop policy if exists fec_storage_read_boundary on storage.objects;
drop policy if exists fec_import_storage_select on storage.objects;
drop policy if exists fec_import_storage_restrict_select on storage.objects;
drop policy if exists fec_evidence_storage_select on storage.objects;
drop policy if exists fec_evidence_storage_restrict_select on storage.objects;
create policy fec_private_download_requires_server_authenticated on storage.objects
  as restrictive for select to authenticated
  using (bucket_id not in ('fec-technical-private','fec-import-private','fec-evidence-private'));
create policy fec_private_download_requires_server_anon on storage.objects
  as restrictive for select to anon
  using (bucket_id not in ('fec-technical-private','fec-import-private','fec-evidence-private'));

create table public.fec_file_access_events (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('technical_file','import_document','evidence_response')),
  resource_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null default 'download_authorized' check (action = 'download_authorized'),
  byte_size bigint not null check (byte_size > 0),
  occurred_at timestamptz not null default now()
);
create index fec_file_access_events_resource_idx
  on public.fec_file_access_events(resource_kind,resource_id,occurred_at desc);
create index fec_file_access_events_actor_idx
  on public.fec_file_access_events(actor_id,occurred_at desc);
alter table public.fec_file_access_events enable row level security;
revoke all on public.fec_file_access_events from public,anon,authenticated;
grant select on public.fec_file_access_events to authenticated;
grant select,insert on public.fec_file_access_events to service_role;
create policy fec_file_access_events_read_active_members on public.fec_file_access_events
  for select to authenticated using (public.fec_is_active_member());
create function private.fec_file_access_event_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' or new.actor_id is null or new.byte_size <= 0
    or new.action <> 'download_authorized' then
    raise exception 'Eventos de acesso são append-only.';
  end if;
  return new;
end;
$$;
revoke all on function private.fec_file_access_event_guard() from public,anon,authenticated;
create trigger fec_file_access_event_append_only
  before update or delete on public.fec_file_access_events
  for each row execute function private.fec_file_access_event_guard();

commit;
