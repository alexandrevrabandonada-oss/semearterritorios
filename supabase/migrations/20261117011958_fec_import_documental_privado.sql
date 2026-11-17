-- SEMEAR TERRITORIOS — PROPOSTA LOCAL, NAO APLICAR EM PRODUCAO.
-- Dependencia obrigatoria: ambas migracoes FEC da PR #2 aplicadas e homologadas.
-- Material de revisao para o Codex gerar migracao via CLI, com testes de RLS/Storage.
-- Sem vinculo a listening_records, weekly_team_reports nem indicadores oficiais.
begin;

create table public.fec_import_batches (
 id uuid primary key default gen_random_uuid(),
 cycle_id uuid not null,
 owner_id uuid not null,
 reference_month date not null check (extract(day from reference_month)=1),
 intake_key text not null check(intake_key ~ '^[0-9a-f]{64}$'),
 manifest jsonb not null check(jsonb_typeof(manifest)='array' and jsonb_array_length(manifest) between 1 and 2 and octet_length(manifest::text)<=5000),
 state text not null default 'intake' check(state='intake'),
 created_at timestamptz not null default now(),
 foreign key(cycle_id,owner_id) references public.fec_cycles(id,owner_id) on delete restrict,
 unique(id,cycle_id,owner_id),
 unique(cycle_id,intake_key)
);

create table public.fec_import_documents (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null,
 cycle_id uuid not null,
 owner_id uuid not null,
 kind text not null check(kind in ('monthly_report','questionnaires')),
 source_name text not null check(length(btrim(source_name)) between 1 and 180),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 mime_type text not null check(mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 byte_size integer not null check(byte_size between 1 and 10485760),
 object_name text not null unique,
 upload_state text not null default 'reserved' check(upload_state in ('reserved','uploaded')),
 created_at timestamptz not null default now(),
 foreign key(batch_id,cycle_id,owner_id) references public.fec_import_batches(id,cycle_id,owner_id) on delete restrict,
 unique(batch_id,kind),
 unique(cycle_id,sha256),
 check(split_part(object_name,'/',1)=id::text),
 check(object_name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.](pdf|docx)$')
);

create table public.fec_import_forms (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.fec_import_documents(id) on delete restrict,
 code text not null check(code ~ '^FEC-20[0-9]{2}-(0[1-9]|1[0-2])-F[0-9]{2,3}$'),
 source_code text not null check(length(source_code) between 1 and 40),
 locality text not null check(length(locality) between 1 and 160),
 source_pages integer[] not null default '{}', -- vazio = pagina nao demonstrada pela extracao
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)=6 and octet_length(questions::text)<=200000),
 simulated_overlap boolean null, -- NULL = comparacao ainda nao possivel sem relatorio mensal
 comparison_verified boolean not null default false, -- somente serviço de verificação confiável/DBA; jamais fornecido pelo executor
 comparison_verification_ref text null check(comparison_verification_ref is null or length(btrim(comparison_verification_ref)) between 15 and 600),
 authenticity_status text not null default 'pending' check(authenticity_status='pending'),
 created_at timestamptz not null default now(),
 unique(document_id,code),
 check(cardinality(source_pages)<=20)
);

create table public.fec_import_reviews (
 id uuid primary key default gen_random_uuid(),
 form_id uuid not null references public.fec_import_forms(id) on delete restrict,
 revision integer not null check(revision > 0),
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 decision text not null check(decision in ('proof_requested','documentary_only','excluded','attested_pending_technical_review')),
 reason text not null check(length(btrim(reason)) between 20 and 3000),
 independent_evidence_ref text not null default '' check(length(independent_evidence_ref)<=600),
 field_date date null,
 interviewer_ref text not null default '' check(length(interviewer_ref)<=300),
 evidence_method text not null default '' check(length(evidence_method)<=300),
 evidence_origin text not null default '' check(length(evidence_origin)<=300),
 evidence_location text not null default '' check(length(evidence_location)<=600),
 interviewer_confirmation boolean not null default false,
 six_vs_ten_reconciled boolean not null default false,
 created_at timestamptz not null default now(),
 unique(form_id,revision)
);

create index fec_import_batches_cycle_idx on public.fec_import_batches(cycle_id,created_at desc);
create index fec_import_docs_batch_idx on public.fec_import_documents(batch_id);
create index fec_import_forms_doc_idx on public.fec_import_forms(document_id);
create index fec_import_reviews_form_idx on public.fec_import_reviews(form_id,created_at desc);

-- Limite transacional por usuário, compartilhado entre instâncias. Tentativas
-- recusadas antes da escrita também exigem limitação externa na homologação.
create table private.fec_intake_rate_events (
 actor_id uuid not null references auth.users(id) on delete restrict,
 operation text not null check(operation in ('batch','review')),
 created_at timestamptz not null default now()
);
create index fec_intake_rate_lookup on private.fec_intake_rate_events(actor_id,operation,created_at);
revoke all on private.fec_intake_rate_events from public,anon,authenticated;
create function private.fec_intake_rate_limit(p_operation text) returns void
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_count integer;
begin
 if v_actor is null or p_operation not in ('batch','review') then raise exception 'Limite de uso indisponível'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fec-intake:'||v_actor::text,0));
 delete from private.fec_intake_rate_events where actor_id=v_actor and created_at<now()-interval '24 hours';
 select count(*) into v_count from private.fec_intake_rate_events
  where actor_id=v_actor and operation=p_operation and created_at>now()-interval '1 hour';
 if v_count >= (case when p_operation='batch' then 10 else 120 end) then raise exception 'Limite temporário de operações FEC atingido'; end if;
 insert into private.fec_intake_rate_events(actor_id,operation) values(v_actor,p_operation);
end $$;
revoke all on function private.fec_intake_rate_limit(text) from public,anon,authenticated;

create function private.fec_import_guard_batch() returns trigger language plpgsql
security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() or not public.fec_can_edit_cycle(new.cycle_id) then
   raise exception 'Lote sem atribuição autorizada';
 end if;
 perform private.fec_intake_rate_limit('batch');
 new.created_at:=now();
 return new;
end $$;
revoke all on function private.fec_import_guard_batch() from public,anon,authenticated;
create trigger fec_import_batch_guard before insert on public.fec_import_batches
 for each row execute function private.fec_import_guard_batch();

create function private.fec_import_limit_forms() returns trigger language plpgsql
security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fec-forms:'||new.document_id::text,0));
 if (select count(*) from public.fec_import_forms where document_id=new.document_id)>=200 then
   raise exception 'Limite de fichas por documento atingido';
 end if;
 return new;
end $$;
revoke all on function private.fec_import_limit_forms() from public,anon,authenticated;
create trigger fec_import_form_limit before insert on public.fec_import_forms
 for each row execute function private.fec_import_limit_forms();

alter table public.fec_import_batches enable row level security;
alter table public.fec_import_documents enable row level security;
alter table public.fec_import_forms enable row level security;
alter table public.fec_import_reviews enable row level security;
revoke all on public.fec_import_batches,public.fec_import_documents,public.fec_import_forms,public.fec_import_reviews from public,anon,authenticated;
grant select,insert on public.fec_import_batches to authenticated;
grant select,insert,update(upload_state) on public.fec_import_documents to authenticated;
grant select on public.fec_import_forms to authenticated;
grant insert(id,document_id,code,source_code,locality,source_pages,questions,simulated_overlap) on public.fec_import_forms to authenticated;
grant select,insert on public.fec_import_reviews to authenticated;
grant all on public.fec_import_batches,public.fec_import_documents,public.fec_import_forms,public.fec_import_reviews to service_role;

-- RLS: o owner herda ciclo do executor; supervisao recebe apenas leitura.
create policy fec_import_batch_select on public.fec_import_batches for select to authenticated
 using(public.fec_can_read_cycle(cycle_id));
create policy fec_import_batch_insert on public.fec_import_batches for insert to authenticated
 with check(owner_id=(select auth.uid()) and public.fec_can_edit_cycle(cycle_id));

create policy fec_import_doc_select on public.fec_import_documents for select to authenticated
 using(exists(select 1 from public.fec_import_batches b where b.id=batch_id and public.fec_can_read_cycle(b.cycle_id)));
create policy fec_import_doc_insert on public.fec_import_documents for insert to authenticated
 with check(upload_state='reserved' and owner_id=(select auth.uid()) and exists(select 1 from public.fec_import_batches b
  where b.id=fec_import_documents.batch_id and b.owner_id=fec_import_documents.owner_id and b.cycle_id=fec_import_documents.cycle_id and public.fec_can_edit_cycle(b.cycle_id)));
create policy fec_import_doc_update on public.fec_import_documents for update to authenticated
 using(upload_state='reserved' and owner_id=(select auth.uid()) and public.fec_can_edit_cycle(cycle_id))
 with check(upload_state='uploaded' and owner_id=(select auth.uid()) and public.fec_can_edit_cycle(cycle_id));

create policy fec_import_form_select on public.fec_import_forms for select to authenticated
 using(exists(select 1 from public.fec_import_documents d where d.id=document_id));
create policy fec_import_form_insert on public.fec_import_forms for insert to authenticated
 with check(exists(select 1 from public.fec_import_documents d where d.id=document_id and d.kind='questionnaires'
  and d.upload_state='uploaded' and d.owner_id=(select auth.uid()) and public.fec_can_edit_cycle(d.cycle_id)));

-- Revisao: acesso apenas a quem tem acesso ao documento, escrita somente do supervisor
-- designado e diferente do executor. Logs append-only, inclusive apos encerramento.
create policy fec_import_review_select on public.fec_import_reviews for select to authenticated
 using(exists(select 1 from public.fec_import_forms f where f.id=form_id));
create policy fec_import_review_insert on public.fec_import_reviews for insert to authenticated
 with check(reviewer_id=(select auth.uid()) and exists(
  select 1 from public.fec_import_forms f
  join public.fec_import_documents d on d.id=f.document_id
  join public.fec_import_batches b on b.id=d.batch_id
  join public.fec_cycles c on c.id=b.cycle_id
  where f.id=form_id and b.owner_id<>(select auth.uid()) and d.upload_state='uploaded'
   and public.fec_scope_is_active(c.engagement_id)
   and public.fec_has_assignment(c.engagement_id,'supervisor')));

-- O cliente pode alterar apenas a coluna de estado. Este trigger confere realmente
-- a presenca do objeto, todos os campos imutaveis e a transicao unica.
create function private.fec_import_guard_document() returns trigger language plpgsql
security definer set search_path='' as $$
begin
 if auth.uid() is null or old.owner_id<>auth.uid() or
    not public.fec_can_edit_cycle(old.cycle_id) or
    old.upload_state<>'reserved' or new.upload_state<>'uploaded' or
    (to_jsonb(new)-'upload_state') is distinct from (to_jsonb(old)-'upload_state') then
   raise exception 'Mudanca documental recusada';
 end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='fec-import-private' and o.name=old.object_name) then
   raise exception 'Objeto privado ainda nao encontrado';
 end if;
 return new;
end; $$;
revoke all on function private.fec_import_guard_document() from public,anon,authenticated;
create trigger fec_import_document_update_guard before update on public.fec_import_documents
 for each row execute function private.fec_import_guard_document();

-- A atestacao documental e explicitamente MAIS FRACA que a homologacao tecnica.
-- Simulacao declarada ou falta do relatorio -> apenas revisao/escalonamento.
create function private.fec_import_guard_review() returns trigger language plpgsql
security definer set search_path='' as $$
declare v_overlap boolean; v_comparison_verified boolean; v_comparison_ref text; v_owner uuid; v_scope uuid; v_uploaded text; v_month date; v_document_id uuid; v_sha text; v_object text;
begin
 if tg_op<>'INSERT' or auth.uid() is null then raise exception 'Historico de revisao imutavel'; end if;
 select f.simulated_overlap,f.comparison_verified,f.comparison_verification_ref,b.owner_id,c.engagement_id,d.upload_state,b.reference_month,d.id,d.sha256,d.object_name
 into v_overlap,v_comparison_verified,v_comparison_ref,v_owner,v_scope,v_uploaded,v_month,v_document_id,v_sha,v_object
 from public.fec_import_forms f
 join public.fec_import_documents d on d.id=f.document_id
 join public.fec_import_batches b on b.id=d.batch_id
 join public.fec_cycles c on c.id=b.cycle_id
 where f.id=new.form_id;
 if v_owner is null or v_owner=auth.uid() or v_uploaded<>'uploaded'
    or not public.fec_has_assignment(v_scope,'supervisor')
    or not public.fec_scope_is_active(v_scope)
    or new.reviewer_id<>auth.uid() then raise exception 'Revisao sem supervisao independente'; end if;
 perform pg_advisory_xact_lock(hashtext('fec-review:' || new.form_id::text));
 if new.revision is distinct from (select coalesce(max(r.revision),0)+1 from public.fec_import_reviews r where r.form_id=new.form_id) then
   raise exception 'Revisao concorrente: atualize o historico antes de decidir';
 end if;
 new.created_at:=now();
 if new.decision='attested_pending_technical_review' then
   if v_overlap is distinct from false then raise exception 'Origem simulada ou nao comparada: solicitar esclarecimento independente'; end if;
   if v_comparison_verified is distinct from true or length(btrim(coalesce(v_comparison_ref,'')))<15 then
      raise exception 'Comparacao ainda nao verificada por processo confiavel independente';
   end if;
   if new.field_date is null or new.field_date<v_month or new.field_date>=(v_month + interval '1 month')::date or not new.interviewer_confirmation or not new.six_vs_ten_reconciled
      or length(btrim(new.interviewer_ref))<5 or length(btrim(new.evidence_method))<5
      or length(btrim(new.evidence_origin))<5 or length(btrim(new.evidence_location))<5
      or length(btrim(new.independent_evidence_ref))<15 then raise exception 'Atestacao exige prova independente, data, aplicador e esclarecimento metodologico'; end if;
   if position(lower(v_document_id::text) in lower(new.independent_evidence_ref))>0
      or position(lower(v_sha) in lower(new.independent_evidence_ref))>0
      or position(lower(v_object) in lower(new.independent_evidence_ref))>0 then
     raise exception 'O documento importado não é prova independente da própria aplicação';
   end if;
 end if;
 perform private.fec_intake_rate_limit('review');
 return new;
end; $$;
revoke all on function private.fec_import_guard_review() from public,anon,authenticated;
create trigger fec_import_review_guard before insert on public.fec_import_reviews
 for each row execute function private.fec_import_guard_review();

-- Um segundo bucket fechado, isolado do bucket de produtos FEC já existente na PR #2.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fec-import-private','fec-import-private',false,10485760,
 array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

create function private.fec_import_can_access_object(p_name text,p_write boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
   select 1 from public.fec_import_documents d
   join public.fec_import_batches b on b.id=d.batch_id
   join public.fec_cycles c on c.id=b.cycle_id
   where d.object_name=p_name
   and (case when p_write then
      d.owner_id=auth.uid() and d.upload_state='reserved' and
      public.fec_can_edit_cycle(d.cycle_id)
      else (d.owner_id=auth.uid() and public.fec_has_assignment(c.engagement_id,'executor'))
        or public.fec_has_assignment(c.engagement_id,'supervisor') end)
 );
$$;
revoke all on function private.fec_import_can_access_object(text,boolean) from public,anon;
grant execute on function private.fec_import_can_access_object(text,boolean) to authenticated;
create policy fec_import_storage_select on storage.objects for select to authenticated
 using(bucket_id='fec-import-private' and private.fec_import_can_access_object(name,false));
create policy fec_import_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='fec-import-private' and private.fec_import_can_access_object(name,true));
-- Bloquear bypass por outras policies PERMISSIVE pré-existentes no projeto.
create policy fec_import_storage_restrict_select on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'fec-import-private' or private.fec_import_can_access_object(name,false));
create policy fec_import_storage_restrict_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'fec-import-private' or private.fec_import_can_access_object(name,true));
create policy fec_import_storage_restrict_update on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'fec-import-private') with check(bucket_id<>'fec-import-private');
create policy fec_import_storage_restrict_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'fec-import-private');
create policy fec_import_storage_restrict_anon on storage.objects as restrictive for all to anon
 using(bucket_id<>'fec-import-private') with check(bucket_id<>'fec-import-private');

-- NENHUMA VIEW OU RPC agrega essas fichas à APS, aos produtos FEC
-- aprovados ou aos relatórios mensais.
commit;

-- Admission shared between application instances. Returns NULL on saturation or missing access.
-- This protects document parsing; it does not replace an edge limit for all HTTP traffic.
create table private.fec_import_admission_attempts(actor_id uuid not null, created_at timestamptz not null default now());
create index fec_import_admission_actor_idx on private.fec_import_admission_attempts(actor_id,created_at);
create table private.fec_import_leases(id uuid primary key default gen_random_uuid(),actor_id uuid not null,expires_at timestamptz not null);
revoke all on private.fec_import_admission_attempts,private.fec_import_leases from public,anon,authenticated;
create function private.fec_import_acquire_capacity() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); lease uuid;
begin
 if actor is null or not exists(select 1 from public.fec_access_grants g where g.user_id=actor and g.active and public.fec_scope_is_active(g.engagement_id)) then return null; end if;
 perform pg_advisory_xact_lock(hashtext('fec-import-global-capacity'));
 delete from private.fec_import_leases where expires_at < now();
 delete from private.fec_import_admission_attempts where created_at < now() - interval '1 hour';
 if (select count(*) from private.fec_import_admission_attempts where actor_id=actor)>=20 then return null; end if;
 if (select count(*) from private.fec_import_leases)>=2 then return null; end if;
 insert into private.fec_import_admission_attempts(actor_id) values(actor);
 insert into private.fec_import_leases(actor_id,expires_at) values(actor,now()+interval '90 seconds') returning id into lease;
 return lease;
end; $$;
create function private.fec_import_release_capacity(p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 delete from private.fec_import_leases where id=p_lease and actor_id=auth.uid();
end; $$;
revoke all on function private.fec_import_acquire_capacity(),private.fec_import_release_capacity(uuid) from public,anon;
grant execute on function private.fec_import_acquire_capacity(),private.fec_import_release_capacity(uuid) to authenticated;
create function public.fec_import_acquire_capacity() returns uuid language sql security invoker set search_path='' as $$select private.fec_import_acquire_capacity()$$;
create function public.fec_import_release_capacity(p_lease uuid) returns void language sql security invoker set search_path='' as $$select private.fec_import_release_capacity(p_lease)$$;
revoke all on function public.fec_import_acquire_capacity(),public.fec_import_release_capacity(uuid) from public,anon;
grant execute on function public.fec_import_acquire_capacity(),public.fec_import_release_capacity(uuid) to authenticated;

-- Serialize reconciliation for the same cycle and content key across instances.
create table private.fec_import_batch_leases(id uuid primary key default gen_random_uuid(),cycle_id uuid not null,intake_key text not null,actor_id uuid not null,expires_at timestamptz not null,unique(cycle_id,intake_key));
revoke all on private.fec_import_batch_leases from public,anon,authenticated;
create function private.fec_import_acquire_batch(p_cycle uuid,p_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); lease uuid;
begin
 if actor is null or p_key !~ '^[a-f0-9]{64}$' or not public.fec_can_edit_cycle(p_cycle) then return null; end if;
 perform pg_advisory_xact_lock(hashtext('fec-import-batch:'||p_cycle::text||':'||p_key));
 delete from private.fec_import_batch_leases where cycle_id=p_cycle and intake_key=p_key and expires_at<now();
 insert into private.fec_import_batch_leases(cycle_id,intake_key,actor_id,expires_at) values(p_cycle,p_key,actor,now()+interval '90 seconds') on conflict(cycle_id,intake_key) do nothing returning id into lease;
 return lease;
end; $$;
create function private.fec_import_release_batch(p_lease uuid) returns void language sql security definer set search_path='' as $$delete from private.fec_import_batch_leases where id=p_lease and actor_id=auth.uid()$$;
revoke all on function private.fec_import_acquire_batch(uuid,text),private.fec_import_release_batch(uuid) from public,anon;
grant execute on function private.fec_import_acquire_batch(uuid,text),private.fec_import_release_batch(uuid) to authenticated;
create function public.fec_import_acquire_batch(p_cycle uuid,p_key text) returns uuid language sql security invoker set search_path='' as $$select private.fec_import_acquire_batch(p_cycle,p_key)$$;
create function public.fec_import_release_batch(p_lease uuid) returns void language sql security invoker set search_path='' as $$select private.fec_import_release_batch(p_lease)$$;
revoke all on function public.fec_import_acquire_batch(uuid,text),public.fec_import_release_batch(uuid) from public,anon;
grant execute on function public.fec_import_acquire_batch(uuid,text),public.fec_import_release_batch(uuid) to authenticated;
