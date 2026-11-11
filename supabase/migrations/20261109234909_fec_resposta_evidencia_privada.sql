-- Proposta v7: respostas privadas, imutáveis e sem promoção automática.
-- A atestação fica bloqueada até existir verificador confiável da prova.
begin;
create function private.fec_block_unverified_attestation() returns trigger language plpgsql set search_path='' as $$
begin
 if new.decision='attested_pending_technical_review' then
  raise exception 'Atestação bloqueada até existir verificação independente confiável da evidência';
 end if;
 return new;
end; $$;
revoke all on function private.fec_block_unverified_attestation() from public,anon,authenticated;
create trigger aa_fec_block_unverified_attestation before insert on public.fec_import_reviews
 for each row execute function private.fec_block_unverified_attestation();

create table public.fec_evidence_responses (
 id uuid primary key default gen_random_uuid(),
 request_review_id uuid not null unique references public.fec_import_reviews(id) on delete restrict,
 form_id uuid not null references public.fec_import_forms(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 field_date date not null,
 method text not null check(length(btrim(method)) between 5 and 1000),
 responsible_ref text not null check(length(btrim(responsible_ref)) between 5 and 300),
 source_ref text not null check(length(btrim(source_ref)) between 5 and 600),
 explanation text not null check(length(btrim(explanation)) between 20 and 3000),
 evidence_sha256 text not null unique check(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 evidence_size integer not null check(evidence_size between 1 and 10485760),
 object_name text not null unique check(object_name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.]pdf$' and split_part(object_name,'/',1)=id::text),
 upload_state text not null default 'reserved' check(upload_state in ('reserved','uploaded')),
 created_at timestamptz not null default now()
);
create index fec_evidence_responses_form_idx on public.fec_evidence_responses(form_id,created_at desc);
alter table public.fec_evidence_responses enable row level security;
revoke all on public.fec_evidence_responses from public,anon,authenticated;
grant select,insert,update(upload_state) on public.fec_evidence_responses to authenticated;
grant all on public.fec_evidence_responses to service_role;
create policy fec_evidence_read on public.fec_evidence_responses for select to authenticated using (
 exists(select 1 from public.fec_import_forms f join public.fec_import_documents d on d.id=f.document_id
 where f.id=fec_evidence_responses.form_id and public.fec_can_read_cycle(d.cycle_id))
);
create policy fec_evidence_insert on public.fec_evidence_responses for insert to authenticated with check (
 owner_id=(select auth.uid()) and upload_state='reserved' and exists(
 select 1 from public.fec_import_forms f join public.fec_import_documents d on d.id=f.document_id
 where f.id=fec_evidence_responses.form_id and d.owner_id=(select auth.uid()) and d.upload_state='uploaded'
 and public.fec_can_edit_cycle(d.cycle_id))
);
create policy fec_evidence_update on public.fec_evidence_responses for update to authenticated using (
 owner_id=(select auth.uid()) and upload_state='reserved' and exists(select 1 from public.fec_import_forms f
 join public.fec_import_documents d on d.id=f.document_id where f.id=fec_evidence_responses.form_id and public.fec_can_edit_cycle(d.cycle_id))
) with check (owner_id=(select auth.uid()) and upload_state='uploaded');

create function private.fec_evidence_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare review_form uuid; review_decision text; latest_revision integer; review_revision integer; source_sha text; source_month date;
begin
 if auth.uid() is null then raise exception 'Sessão obrigatória'; end if;
 if tg_op='INSERT' then
  if new.owner_id<>auth.uid() or new.upload_state<>'reserved' then raise exception 'Resposta inválida'; end if;
  select r.form_id,r.decision,r.revision,d.sha256,b.reference_month into review_form,review_decision,review_revision,source_sha,source_month
   from public.fec_import_reviews r join public.fec_import_forms f on f.id=r.form_id
   join public.fec_import_documents d on d.id=f.document_id join public.fec_import_batches b on b.id=d.batch_id
   where r.id=new.request_review_id;
  perform pg_advisory_xact_lock(hashtext('fec-review:'||new.form_id::text));
  select max(revision) into latest_revision from public.fec_import_reviews where form_id=new.form_id;
  if review_form is distinct from new.form_id or review_decision is distinct from 'proof_requested' or review_revision is distinct from latest_revision then raise exception 'Solicitação de prova não está vigente'; end if;
  if source_sha=new.evidence_sha256 then raise exception 'O próprio documento não é evidência independente'; end if;
  if new.field_date<source_month or new.field_date>=(source_month+interval '1 month')::date then raise exception 'Data fora do período'; end if;
  new.created_at:=now(); return new;
 end if;
 if tg_op<>'UPDATE' or old.owner_id<>auth.uid() or old.upload_state<>'reserved' or new.upload_state<>'uploaded' or
    (to_jsonb(old)-'upload_state') is distinct from (to_jsonb(new)-'upload_state') then raise exception 'Resposta imutável'; end if;
 if not exists(select 1 from storage.objects where bucket_id='fec-evidence-private' and name=old.object_name) then raise exception 'Evidência ausente no armazenamento'; end if;
 return new;
end; $$;
revoke all on function private.fec_evidence_guard() from public,anon,authenticated;
create trigger fec_evidence_guard before insert or update on public.fec_evidence_responses for each row execute function private.fec_evidence_guard();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fec-evidence-private','fec-evidence-private',false,10485760,array['application/pdf']);
create function private.fec_evidence_access(p_name text,p_write boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.fec_evidence_responses r
 join public.fec_import_forms f on f.id=r.form_id join public.fec_import_documents d on d.id=f.document_id
 where r.object_name=p_name and case when p_write then r.owner_id=auth.uid() and r.upload_state='reserved' and public.fec_can_edit_cycle(d.cycle_id)
 else public.fec_can_read_cycle(d.cycle_id) end)
$$;
revoke all on function private.fec_evidence_access(text,boolean) from public,anon;
grant execute on function private.fec_evidence_access(text,boolean) to authenticated;
create policy fec_evidence_storage_select on storage.objects for select to authenticated using(bucket_id='fec-evidence-private' and private.fec_evidence_access(name,false));
create policy fec_evidence_storage_insert on storage.objects for insert to authenticated with check(bucket_id='fec-evidence-private' and private.fec_evidence_access(name,true));
create policy fec_evidence_storage_restrict_select on storage.objects as restrictive for select to authenticated using(bucket_id<>'fec-evidence-private' or private.fec_evidence_access(name,false));
create policy fec_evidence_storage_restrict_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'fec-evidence-private' or private.fec_evidence_access(name,true));
create policy fec_evidence_storage_restrict_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'fec-evidence-private') with check(bucket_id<>'fec-evidence-private');
create policy fec_evidence_storage_restrict_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'fec-evidence-private');
create policy fec_evidence_storage_restrict_anon on storage.objects as restrictive for all to anon using(bucket_id<>'fec-evidence-private') with check(bucket_id<>'fec-evidence-private');

-- Avaliação documental não comprova entrevista e não altera indicadores.
alter table public.fec_import_reviews add column response_id uuid references public.fec_evidence_responses(id) on delete restrict;
alter table public.fec_import_reviews drop constraint fec_import_reviews_decision_check;
alter table public.fec_import_reviews add constraint fec_import_reviews_decision_check check(decision in
 ('proof_requested','documentary_only','excluded','attested_pending_technical_review','evidence_reviewed','inconclusive'));
create function private.fec_evidence_review_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.decision='evidence_reviewed' then raise exception 'Conferência conclusiva bloqueada até verificação confiável do arquivo'; end if;
 if new.decision in ('evidence_reviewed','inconclusive') then
  if new.response_id is null or not exists(select 1 from public.fec_evidence_responses r
    join storage.objects o on o.bucket_id='fec-evidence-private' and o.name=r.object_name
    join public.fec_import_reviews request on request.id=r.request_review_id
    where r.id=new.response_id and r.form_id=new.form_id and r.upload_state='uploaded'
    and request.form_id=new.form_id and request.decision='proof_requested' and request.revision=new.revision-1) then
   raise exception 'Resposta e evidência privada acessível são necessárias';
  end if;
 elsif new.response_id is not null then raise exception 'Referência de resposta inválida para esta decisão'; end if;
 return new;
end; $$;
revoke all on function private.fec_evidence_review_guard() from public,anon,authenticated;
create trigger ab_fec_evidence_review_guard before insert on public.fec_import_reviews for each row execute function private.fec_evidence_review_guard();

commit;
