-- Resultado confiável: somente o servidor privilegiado pode criar; nunca alterar.
begin;
create table public.fec_file_integrity (
 id uuid primary key default gen_random_uuid(),
 document_id uuid unique references public.fec_import_documents(id) on delete restrict,
 evidence_id uuid unique references public.fec_evidence_responses(id) on delete restrict,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 byte_size integer not null check(byte_size between 1 and 10485760),
 verified_at timestamptz not null default now(),
 check((document_id is null) <> (evidence_id is null))
);
create unique index fec_unique_verified_evidence_sha on public.fec_file_integrity(sha256) where evidence_id is not null;
alter table public.fec_file_integrity enable row level security;
revoke all on public.fec_file_integrity from public,anon,authenticated;
grant select on public.fec_file_integrity to authenticated;
grant select,insert on public.fec_file_integrity to service_role;
create policy fec_integrity_read on public.fec_file_integrity for select to authenticated using (
 (document_id is not null and exists(select 1 from public.fec_import_documents d
   where d.id=document_id and public.fec_can_read_cycle(d.cycle_id))) or
 (evidence_id is not null and exists(select 1 from public.fec_evidence_responses r
   join public.fec_import_forms f on f.id=r.form_id
   join public.fec_import_documents d on d.id=f.document_id
   where r.id=evidence_id and public.fec_can_read_cycle(d.cycle_id)))
);
create function private.fec_integrity_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare original_id uuid; original_sha text; expected_sha text; expected_size integer; state text;
begin
 if tg_op<>'INSERT' then raise exception 'Verificação imutável'; end if;
 perform pg_advisory_xact_lock(hashtext('fec-verified:'||new.sha256));
 if new.evidence_id is not null and exists(select 1 from public.fec_file_integrity where document_id is not null and sha256=new.sha256) then raise exception 'Documento já utilizado como origem não pode ser usado como evidência'; end if;
 if new.document_id is not null and exists(select 1 from public.fec_file_integrity where evidence_id is not null and sha256=new.sha256) then raise exception 'Evidência já utilizada não pode ser usada como origem'; end if;
 if new.document_id is not null then
  select d.sha256,d.byte_size,d.upload_state into expected_sha,expected_size,state from public.fec_import_documents d where d.id=new.document_id;
 else
  select r.evidence_sha256,r.evidence_size,r.upload_state,f.document_id into expected_sha,expected_size,state,original_id
   from public.fec_evidence_responses r join public.fec_import_forms f on f.id=r.form_id where r.id=new.evidence_id;
  select sha256 into original_sha from public.fec_file_integrity where document_id=original_id;
  if original_sha is null or original_sha=new.sha256 then raise exception 'Evidência independente sem origem verificada'; end if;
 end if;
 if state is distinct from 'uploaded' or expected_sha is distinct from new.sha256 or expected_size is distinct from new.byte_size then raise exception 'Metadados incompatíveis com verificação'; end if;
 new.verified_at:=now(); return new;
end; $$;
revoke all on function private.fec_integrity_guard() from public,anon,authenticated;
create trigger fec_integrity_guard before insert or update or delete on public.fec_file_integrity for each row execute function private.fec_integrity_guard();
-- A atestação de entrevista permanece bloqueada; somente conferência documental é liberada.
create or replace function private.fec_evidence_review_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.decision in ('evidence_reviewed','inconclusive') then
  if new.response_id is null or not exists(select 1 from public.fec_evidence_responses r
    join storage.objects o on o.bucket_id='fec-evidence-private' and o.name=r.object_name
    join public.fec_import_reviews request on request.id=r.request_review_id
    join public.fec_file_integrity i on i.evidence_id=r.id
    where r.id=new.response_id and r.form_id=new.form_id and r.upload_state='uploaded'
    and request.form_id=new.form_id and request.decision='proof_requested' and request.revision=new.revision-1) then
   raise exception 'Resposta com integridade verificada e pedido vigente são necessários';
  end if;
 elsif new.response_id is not null then raise exception 'Referência de resposta inválida para esta decisão'; end if;
 return new;
end; $$;

-- Conferência do relatório: auditoria separada das fichas e de entrevistas.
alter table public.fec_import_batches add column description text not null default '' check(length(description)<=2000);
alter table public.fec_import_batches add column suggestions jsonb not null default '{}'::jsonb check(jsonb_typeof(suggestions)='object' and octet_length(suggestions::text)<=100000);
create table public.fec_report_reviews (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.fec_import_batches(id) on delete restrict,
 revision integer not null check(revision>0),
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 decision text not null check(decision in ('document_checked','needs_changes')),
 reason text not null default '' check(length(reason)<=3000 and (decision<>'needs_changes' or length(btrim(reason))>=20)),
 created_at timestamptz not null default now(),
 unique(batch_id,revision)
);
alter table public.fec_report_reviews enable row level security;
revoke all on public.fec_report_reviews from public,anon,authenticated;
grant select,insert on public.fec_report_reviews to authenticated;
grant all on public.fec_report_reviews to service_role;
create policy fec_report_review_read on public.fec_report_reviews for select to authenticated using (
 exists(select 1 from public.fec_import_batches b where b.id=batch_id and public.fec_can_read_cycle(b.cycle_id))
);
create policy fec_report_review_insert on public.fec_report_reviews for insert to authenticated with check (
 reviewer_id=(select auth.uid()) and exists(select 1 from public.fec_import_batches b join public.fec_cycles c on c.id=b.cycle_id
 where b.id=batch_id and b.owner_id<>(select auth.uid()) and public.fec_has_assignment(c.engagement_id,'supervisor') and public.fec_scope_is_active(c.engagement_id))
);
create function private.fec_report_review_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' or auth.uid() is null or new.reviewer_id<>auth.uid() then raise exception 'Histórico imutável'; end if;
 perform pg_advisory_xact_lock(hashtext('fec-report:'||new.batch_id::text));
 if new.revision is distinct from (select coalesce(max(r.revision),0)+1 from public.fec_report_reviews r where r.batch_id=new.batch_id) then raise exception 'Atualize a conferência'; end if;
 if not exists(select 1 from public.fec_import_documents d where d.batch_id=new.batch_id) or exists(
  select 1 from public.fec_import_documents d where d.batch_id=new.batch_id and
  (d.upload_state<>'uploaded' or not exists(select 1 from public.fec_file_integrity i where i.document_id=d.id))) then
  raise exception 'Arquivos ainda não conferidos automaticamente';
 end if;
 new.created_at:=now();return new;
end; $$;
revoke all on function private.fec_report_review_guard() from public,anon,authenticated;
create trigger fec_report_review_guard before insert or update or delete on public.fec_report_reviews for each row execute function private.fec_report_review_guard();

commit;
