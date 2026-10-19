-- Monthly professional delivery workflow. Additive: weekly and institutional reports are unchanged.
begin;
create schema if not exists private;
grant usage on schema private to authenticated;

create table public.professional_monthly_reports (
 id uuid primary key default gen_random_uuid(),
 team_member_id uuid not null references public.team_members(id) on delete restrict,
 reference_month date not null check (extract(day from reference_month) = 1),
 title text not null check (length(trim(title)) > 0),
 status text not null default 'draft' check (status in ('draft','submitted','in_review','approved','needs_changes')),
 summary text not null default '', objectives text not null default '', activities text not null default '',
 methodologies text not null default '', participant_accounts text not null default '', team_observations text not null default '',
 research_references text not null default '', learnings text not null default '', difficulties text not null default '',
 proposals text not null default '', pending_items text not null default '', next_steps text not null default '',
 no_field_activity boolean not null default false, no_field_justification text not null default '',
 main_attachment_id uuid, reviewed_attachment_id uuid,
 review_note text not null default '', review_checklist jsonb not null default '{}',
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 created_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(team_member_id,reference_month)
);
create table public.professional_monthly_activity_links (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.professional_monthly_reports(id) on delete restrict,
 action_id uuid references public.actions(id) on delete restrict, workshop_id uuid references public.workshop_records(id) on delete restrict,
 period_justification text not null default '', check (num_nonnulls(action_id,workshop_id)=1),
 unique(report_id,action_id), unique(report_id,workshop_id)
);
create table public.professional_monthly_neighborhoods (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.professional_monthly_reports(id) on delete restrict,
 neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict, unique(report_id,neighborhood_id)
);
create table public.professional_monthly_deliveries (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.professional_monthly_reports(id) on delete restrict,
 delivery_type text not null check (delivery_type in ('workshop_record','social_map','territorial_diagnosis','proposals','educational_material','monthly_report')),
 title text not null check(length(trim(title))>0), description text not null default '',
 activity_link_id uuid references public.professional_monthly_activity_links(id) on delete restrict,
 map_context text not null default '', map_legend text not null default '',
 check(delivery_type <> 'social_map' or (length(trim(map_context))>0 and length(trim(map_legend))>0))
);
create table public.professional_monthly_attachments (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.professional_monthly_reports(id) on delete restrict,
 delivery_id uuid references public.professional_monthly_deliveries(id) on delete restrict,
 storage_path text not null unique, file_name text not null,
 file_size integer not null check(file_size between 1 and 10485760),
 uploaded_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(),
 extracted_text text not null default '', extraction_status text not null default 'pending',
 extraction_quality text not null default 'low', privacy_alerts jsonb not null default '[]',
 unique(report_id,id), check(storage_path like report_id::text || '/%')
);
alter table public.professional_monthly_reports add constraint monthly_main_document_fkey
 foreign key(id,main_attachment_id) references public.professional_monthly_attachments(report_id,id);
alter table public.professional_monthly_reports add constraint monthly_reviewed_document_fkey
 foreign key(id,reviewed_attachment_id) references public.professional_monthly_attachments(report_id,id);
create table public.professional_monthly_history (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.professional_monthly_reports(id) on delete restrict,
 actor_id uuid not null references public.profiles(id), from_status text, to_status text not null,
 note text not null default '', attachment_id uuid references public.professional_monthly_attachments(id), created_at timestamptz not null default now()
);
alter table public.project_memory_entries add column source_monthly_report_id uuid references public.professional_monthly_reports(id) on delete restrict;
create index on public.project_memory_entries(source_monthly_report_id);
create index on public.professional_monthly_reports(reference_month desc,status);
create index on public.professional_monthly_reports(created_by);
create index on public.professional_monthly_reports(main_attachment_id);
create index on public.professional_monthly_reports(reviewed_attachment_id);
create index on public.professional_monthly_reports(reviewed_by);
create index on public.professional_monthly_activity_links(action_id);
create index on public.professional_monthly_activity_links(workshop_id);
create index on public.professional_monthly_neighborhoods(neighborhood_id);
create index on public.professional_monthly_deliveries(report_id);
create index on public.professional_monthly_deliveries(activity_link_id);
create index on public.professional_monthly_attachments(delivery_id);
create index on public.professional_monthly_attachments(uploaded_by);
create index on public.professional_monthly_history(report_id,created_at);
create index on public.professional_monthly_history(actor_id);
create index on public.professional_monthly_history(attachment_id);

alter table public.professional_monthly_reports enable row level security;
create policy monthly_read on public.professional_monthly_reports for select to authenticated using (
 public.get_user_role() in ('admin','coordenacao') or (public.get_user_role()='equipe' and exists (
 select 1 from public.team_members m where m.id=team_member_id and m.profile_id=auth.uid() and m.active)));
create policy monthly_create on public.professional_monthly_reports for insert to authenticated with check (
 created_by=auth.uid() and status='draft' and exists(select 1 from public.team_members m where m.id=team_member_id and m.active and
 (public.get_user_role() in ('admin','coordenacao') or (public.get_user_role()='equipe' and m.profile_id=auth.uid()))));
create policy monthly_update on public.professional_monthly_reports for update to authenticated using (
 public.get_user_role() in ('admin','coordenacao') or (status in ('draft','needs_changes') and public.get_user_role()='equipe' and exists (
 select 1 from public.team_members m where m.id=team_member_id and m.active and m.profile_id=auth.uid()))) with check (
 public.get_user_role() in ('admin','coordenacao') or (public.get_user_role()='equipe' and exists (
 select 1 from public.team_members m where m.id=team_member_id and m.active and m.profile_id=auth.uid())));

create function private.monthly_editable(target uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.professional_monthly_reports r where r.id=target and r.status in ('draft','needs_changes'));
$$;
revoke all on function private.monthly_editable(uuid) from public;
grant execute on function private.monthly_editable(uuid) to authenticated;

do $$ declare t text; begin
 foreach t in array array['professional_monthly_activity_links','professional_monthly_neighborhoods','professional_monthly_deliveries','professional_monthly_attachments','professional_monthly_history'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy monthly_child_read on public.%I for select to authenticated using (exists(select 1 from public.professional_monthly_reports r where r.id=report_id))',t);
 if t <> 'professional_monthly_history' then
 execute format('create policy monthly_child_insert on public.%I for insert to authenticated with check(private.monthly_editable(report_id))',t);
 execute format('create policy monthly_child_update on public.%I for update to authenticated using(private.monthly_editable(report_id)) with check(private.monthly_editable(report_id))',t);
 if t <> 'professional_monthly_attachments' then
 execute format('create policy monthly_child_delete on public.%I for delete to authenticated using(private.monthly_editable(report_id))',t);
 end if;
 end if;
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 if t <> 'professional_monthly_history' then
 execute format('grant insert,update on public.%I to authenticated',t);
 if t <> 'professional_monthly_attachments' then execute format('grant delete on public.%I to authenticated',t); end if;
 end if;
 end loop;
end $$;
revoke all on public.professional_monthly_reports from anon, authenticated;
grant select,insert,update on public.professional_monthly_reports to authenticated;
grant all on public.professional_monthly_reports, public.professional_monthly_activity_links, public.professional_monthly_neighborhoods,
 public.professional_monthly_deliveries, public.professional_monthly_attachments, public.professional_monthly_history to service_role;

-- Serialize edits to children with review transitions, also when RLS is bypassed by a client bug.
create function private.guard_monthly_child() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.professional_monthly_reports; target uuid; activity_date date;
begin
 if tg_op='DELETE' then target:=old.report_id; else target:=new.report_id; end if;
 select * into r from public.professional_monthly_reports where id=target for update;
 if r.id is null or r.status not in ('draft','needs_changes') then raise exception 'Relatório bloqueado para edição.'; end if;
 if tg_op='UPDATE' and (new.report_id,new.id) is distinct from (old.report_id,old.id) then raise exception 'Não é permitido transferir registros entre relatórios.'; end if;
 if tg_op='DELETE' then return old; end if;
 if tg_table_name='professional_monthly_activity_links' then
  if r.no_field_activity then raise exception 'Mês sem atividade de campo não pode ter atividades vinculadas.'; end if;
  if new.action_id is not null then select action_date into activity_date from public.actions where id=new.action_id;
  else select coalesce(w.workshop_date,a.action_date) into activity_date from public.workshop_records w join public.actions a on a.id=w.action_id where w.id=new.workshop_id; end if;
  if (activity_date is null or date_trunc('month',activity_date)::date<>r.reference_month) and length(trim(new.period_justification))=0 then
   raise exception 'Justifique a atividade fora do mês ou sem data.'; end if;
 elsif tg_table_name='professional_monthly_deliveries' then
  if new.activity_link_id is not null and not exists(select 1 from public.professional_monthly_activity_links l where l.id=new.activity_link_id and l.report_id=target) then raise exception 'Atividade de origem pertence a outro relatório.'; end if;
 elsif tg_table_name='professional_monthly_attachments' then
  if tg_op='INSERT' and not exists(select 1 from storage.objects o where o.bucket_id='professional-monthly-documents' and o.name=new.storage_path) then raise exception 'Envie o arquivo privado antes de registrar o anexo.'; end if;
  if new.delivery_id is not null and not exists(select 1 from public.professional_monthly_deliveries d where d.id=new.delivery_id and d.report_id=target) then raise exception 'Entrega pertence a outro relatório.'; end if;
  if tg_op='INSERT' and new.uploaded_by is distinct from auth.uid() then raise exception 'Autor do anexo inválido.'; end if;
  if tg_op='UPDATE' and (to_jsonb(new)-array['extracted_text','extraction_status','extraction_quality','privacy_alerts']) is distinct from (to_jsonb(old)-array['extracted_text','extraction_status','extraction_quality','privacy_alerts']) then raise exception 'Versões dos anexos são imutáveis.'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_monthly_child() from public;
do $$ declare t text; begin
 foreach t in array array['professional_monthly_activity_links','professional_monthly_neighborhoods','professional_monthly_deliveries','professional_monthly_attachments'] loop
 execute format('create trigger guard_monthly_child before insert or update or delete on public.%I for each row execute function private.guard_monthly_child()',t);
 end loop;
end $$;

create function private.guard_monthly_report() returns trigger language plpgsql security invoker set search_path='' as $$
declare reviewer boolean:=coalesce(public.get_user_role() in ('admin','coordenacao'),false); document_name text;
begin
 if tg_op='INSERT' then
  if new.created_by is distinct from auth.uid() or new.status<>'draft' or new.reviewed_by is not null or new.reviewed_at is not null or new.reviewed_attachment_id is not null or new.review_checklist<>'{}'::jsonb then raise exception 'Crie um rascunho sem aprovação.'; end if;
 else
  if (new.id,new.team_member_id,new.reference_month,new.created_by,new.created_at) is distinct from (old.id,old.team_member_id,old.reference_month,old.created_by,old.created_at) then raise exception 'Identidade e autoria do relatório são imutáveis.'; end if;
  if (to_jsonb(new)-array['status','review_note','review_checklist','reviewed_by','reviewed_at','reviewed_attachment_id','updated_at']) is distinct from (to_jsonb(old)-array['status','review_note','review_checklist','reviewed_by','reviewed_at','reviewed_attachment_id','updated_at']) and old.status not in ('draft','needs_changes') then raise exception 'Conteúdo bloqueado. Reabra o relatório para ajustar.'; end if;
  if (new.reviewed_by,new.reviewed_at,new.reviewed_attachment_id) is distinct from (old.reviewed_by,old.reviewed_at,old.reviewed_attachment_id) then raise exception 'Dados de revisão são gerados pelo sistema.'; end if;
  if not reviewer and (new.review_note,new.review_checklist) is distinct from (old.review_note,old.review_checklist) then raise exception 'Somente coordenação revisa.'; end if;
  if old.status='approved' and not (reviewer and new.status='needs_changes' and length(trim(new.review_note))>0) then raise exception 'Reabertura exige coordenação e justificativa.'; end if;
  if new.status<>old.status then
   if not ((old.status in ('draft','needs_changes') and new.status='submitted') or
    (reviewer and old.status='submitted' and new.status='in_review') or
    (reviewer and old.status='in_review' and new.status in ('approved','needs_changes')) or
    (reviewer and old.status='approved' and new.status='needs_changes')) then raise exception 'Transição de revisão inválida.'; end if;
   if new.status='needs_changes' and length(trim(new.review_note))=0 then raise exception 'Informe a justificativa dos ajustes.'; end if;
   if new.status in ('submitted','approved') then
    select file_name into document_name from public.professional_monthly_attachments where id=new.main_attachment_id and report_id=new.id;
    if document_name is null or document_name !~* '\.(docx|pdf)$' then raise exception 'Anexe e selecione o documento principal DOCX ou PDF.'; end if;
    if length(trim(new.summary))=0 then raise exception 'Preencha a síntese do período.'; end if;
    if not new.no_field_activity and not exists(select 1 from public.professional_monthly_activity_links where report_id=new.id) then raise exception 'Vincule as atividades ou justifique mês sem atividade de campo.'; end if;
   end if;
   if new.status='approved' then
    if not (new.review_checklist @> '{"document":true,"links":true,"deliveries":true,"privacy":true}'::jsonb) then raise exception 'Complete a conferência técnica.'; end if;
    new.reviewed_by:=auth.uid(); new.reviewed_at:=now(); new.reviewed_attachment_id:=new.main_attachment_id;
   elsif new.status='needs_changes' then new.review_checklist:='{}'::jsonb;
   end if;
  end if;
 end if;
 if new.no_field_activity and (length(trim(new.no_field_justification))=0 or exists(select 1 from public.professional_monthly_activity_links where report_id=new.id)) then raise exception 'Mês sem atividade exige justificativa e ausência de vínculos de atividades.'; end if;
 new.updated_at:=now(); return new;
end $$;
revoke all on function private.guard_monthly_report() from public;
create trigger guard_monthly_report before insert or update on public.professional_monthly_reports for each row execute function private.guard_monthly_report();

-- Private, trigger-only audit writer. Clients have SELECT only on history.
create function private.audit_monthly_report() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão obrigatória.'; end if;
 if tg_op='INSERT' then
 insert into public.professional_monthly_history(report_id,actor_id,to_status,attachment_id) values(new.id,auth.uid(),new.status,new.main_attachment_id);
 elsif old.status<>new.status then
 insert into public.professional_monthly_history(report_id,actor_id,from_status,to_status,note,attachment_id) values(new.id,auth.uid(),old.status,new.status,new.review_note,new.main_attachment_id);
 end if;
 return new;
end $$;
revoke all on function private.audit_monthly_report() from public,anon,authenticated;
create trigger audit_monthly_report after insert or update on public.professional_monthly_reports for each row execute function private.audit_monthly_report();

create function private.guard_monthly_memory_source() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.source_monthly_report_id is not null and new.source_monthly_report_id is distinct from old.source_monthly_report_id then raise exception 'A referência ao relatório mensal deve ser preservada.'; end if;
 if new.source_monthly_report_id is not null and (tg_op='INSERT' or new.source_monthly_report_id is distinct from old.source_monthly_report_id) then
  if coalesce(public.get_user_role(),'') not in ('admin','coordenacao') or new.visibility<>'internal' or new.source_report_id is not null or not exists(select 1 from public.professional_monthly_reports where id=new.source_monthly_report_id and status='approved') then raise exception 'Somente coordenação pode criar memória interna a partir de relatório mensal aprovado.'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_monthly_memory_source() from public;
create trigger guard_monthly_memory_source before insert or update on public.project_memory_entries for each row execute function private.guard_monthly_memory_source();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
 'professional-monthly-documents','professional-monthly-documents',false,10485760,
 array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','text/plain','text/markdown']);
create policy monthly_storage_read on storage.objects for select to authenticated using (
 bucket_id='professional-monthly-documents' and exists(select 1 from public.professional_monthly_reports r where r.id::text=(storage.foldername(name))[1]));
create policy monthly_storage_upload on storage.objects for insert to authenticated with check (
 bucket_id='professional-monthly-documents' and array_length(storage.foldername(name),1)=1 and exists(select 1 from public.professional_monthly_reports r where r.id::text=(storage.foldername(name))[1] and r.status in ('draft','needs_changes')));
-- No storage UPDATE/DELETE policies: each upload is an immutable version.
commit;
