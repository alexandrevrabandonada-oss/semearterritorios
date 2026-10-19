begin;
create table public.weekly_activity_items (
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.weekly_team_reports(id) on delete restrict,
 activity_date date not null,action_id uuid references public.actions(id) on delete restrict,workshop_id uuid references public.workshop_records(id) on delete restrict,
 kind text not null check(kind in ('field','preparation','systematization')),title text not null check(length(trim(title))>0),fronts jsonb not null default '[]' check(jsonb_typeof(fronts)='array'),
 objective text not null default '',role_description text not null default '',methodology text not null default '',participant_profile text not null default '',
 participant_accounts text not null default '',team_observations text not null default '',research_references text not null default '',collective_results text not null default '',
 consensus_evidence text not null default '',divergences text not null default '',learnings text not null default '',limitations text not null default '',proposals text not null default '',agreements text not null default '',follow_up text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(kind<>'field' or action_id is not null)
);
create index on public.weekly_activity_items(report_id);create index on public.weekly_activity_items(action_id);create index on public.weekly_activity_items(workshop_id);create index on public.weekly_activity_items(activity_date);
create table public.weekly_activity_products (
 id uuid primary key default gen_random_uuid(),item_id uuid not null references public.weekly_activity_items(id) on delete restrict,
 product_key uuid not null default gen_random_uuid(),version integer not null default 1 check(version>0),title text not null check(length(trim(title))>0),
 product_type text not null check(product_type in ('social_map','workshop_record','diagnosis','educational_material','proposals')),description text not null default '',map_context text not null default '',map_legend text not null default '',
 created_at timestamptz not null default now(),unique(product_key,version),check(product_type<>'social_map' or (length(trim(map_context))>0 and length(trim(map_legend))>0))
);
create index on public.weekly_activity_products(item_id);
alter table public.weekly_team_report_attachments add column activity_item_id uuid references public.weekly_activity_items(id) on delete restrict,add column product_version_id uuid references public.weekly_activity_products(id) on delete restrict;
create index on public.weekly_team_report_attachments(activity_item_id);create index on public.weekly_team_report_attachments(product_version_id);
create function private.weekly_activity_editable(target uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.weekly_team_reports r join public.team_members m on m.id=r.team_member_id where r.id=target and r.status in ('draft','needs_changes') and (public.get_user_role() in ('admin','coordenacao') or (public.get_user_role()='equipe' and m.profile_id=auth.uid() and m.active)));
$$;
revoke all on function private.weekly_activity_editable(uuid) from public;grant execute on function private.weekly_activity_editable(uuid) to authenticated;
alter table public.weekly_activity_items enable row level security;
create policy activity_read on public.weekly_activity_items for select to authenticated using(exists(select 1 from public.weekly_team_reports r where r.id=report_id));
create policy activity_insert on public.weekly_activity_items for insert to authenticated with check(private.weekly_activity_editable(report_id));
create policy activity_update on public.weekly_activity_items for update to authenticated using(private.weekly_activity_editable(report_id)) with check(private.weekly_activity_editable(report_id));
create policy activity_delete on public.weekly_activity_items for delete to authenticated using(private.weekly_activity_editable(report_id));
alter table public.weekly_activity_products enable row level security;
create policy product_read on public.weekly_activity_products for select to authenticated using(exists(select 1 from public.weekly_activity_items i where i.id=item_id));
create policy product_insert on public.weekly_activity_products for insert to authenticated with check(exists(select 1 from public.weekly_activity_items i where i.id=item_id and private.weekly_activity_editable(i.report_id)));
create policy product_update on public.weekly_activity_products for update to authenticated using(exists(select 1 from public.weekly_activity_items i where i.id=item_id and private.weekly_activity_editable(i.report_id))) with check(exists(select 1 from public.weekly_activity_items i where i.id=item_id and private.weekly_activity_editable(i.report_id)));
create policy product_delete on public.weekly_activity_products for delete to authenticated using(exists(select 1 from public.weekly_activity_items i where i.id=item_id and private.weekly_activity_editable(i.report_id)));
revoke all on public.weekly_activity_items,public.weekly_activity_products from anon,authenticated;
grant select,insert,update,delete on public.weekly_activity_items,public.weekly_activity_products to authenticated;
grant all on public.weekly_activity_items,public.weekly_activity_products to service_role;

create function private.guard_weekly_activity() returns trigger language plpgsql security invoker set search_path='' as $$
declare target uuid;r public.weekly_team_reports;parent_action uuid;previous public.weekly_activity_products;begin
 if tg_table_name='weekly_activity_items' then
  if tg_op='DELETE' then target:=old.report_id;else target:=new.report_id;end if;
 else
  if tg_op='DELETE' then select report_id into target from public.weekly_activity_items where id=old.item_id;
  else select report_id,action_id into target,parent_action from public.weekly_activity_items where id=new.item_id;end if;
 end if;
 select * into r from public.weekly_team_reports where id=target for update;
 if r.id is null or not private.weekly_activity_editable(target) then raise exception 'Edite somente atividades de semanais próprios em rascunho ou ajustes.';end if;
 if tg_op='DELETE' then return old;end if;
 if tg_op='UPDATE' and new.id<>old.id then raise exception 'Identidade imutável.';end if;
 if tg_table_name='weekly_activity_items' then
  if tg_op='UPDATE' and new.report_id<>old.report_id then raise exception 'Não transfira a atividade entre relatórios.';end if;
  if new.activity_date<r.week_start or new.activity_date>r.week_end then raise exception 'A data precisa pertencer ao período semanal.';end if;
  if new.workshop_id is not null and not exists(select 1 from public.workshop_records w where w.id=new.workshop_id and w.action_id=new.action_id) then raise exception 'Oficina e ação incompatíveis.';end if;
  if new.fronts <@ '["education","mapping","territorial_reading","diagnosis","planting","training"]'::jsonb is not true then raise exception 'Frente de trabalho inválida.';end if;
  new.updated_at:=now();
 else
  if tg_op='UPDATE' and (new.item_id,new.product_key,new.version) is distinct from (old.item_id,old.product_key,old.version) then raise exception 'Origem e versão são imutáveis.';end if;
  if tg_op='INSERT' and new.version>1 then
   select * into previous from public.weekly_activity_products where product_key=new.product_key order by version desc limit 1;
   if previous.id is null or new.version<>previous.version+1 or not exists(select 1 from public.weekly_activity_items i join public.weekly_team_reports w on w.id=i.report_id where i.id=previous.item_id and w.team_member_id=r.team_member_id and i.action_id is not distinct from parent_action) then raise exception 'Nova versão exige produto anterior do mesmo responsável e atividade.';end if;
  elsif tg_op='INSERT' and exists(select 1 from public.weekly_activity_products where product_key=new.product_key) then raise exception 'Produto existente: registre nova versão.';end if;
 end if;return new;end $$;
revoke all on function private.guard_weekly_activity() from public;
create trigger guard_weekly_activity before insert or update or delete on public.weekly_activity_items for each row execute function private.guard_weekly_activity();
create trigger guard_weekly_product before insert or update or delete on public.weekly_activity_products for each row execute function private.guard_weekly_activity();
create function private.guard_weekly_attachment_source() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' then
  if exists(select 1 from public.weekly_activity_items where report_id=old.report_id) and not private.weekly_activity_editable(old.report_id) then raise exception 'Anexos de semanal enviado ou aprovado são preservados.';end if;
  return old;
 end if;
 if exists(select 1 from public.weekly_activity_items where report_id=new.report_id) and not private.weekly_activity_editable(new.report_id) then raise exception 'Semanal bloqueado para alteração de anexos.';end if;
 if tg_op='UPDATE' and (old.activity_item_id is not null or old.product_version_id is not null) then
  if new.report_id<>old.report_id or not private.weekly_activity_editable(old.report_id) then raise exception 'Associação aprovada é imutável.';end if;
 end if;
 if new.activity_item_id is not null or new.product_version_id is not null then
  if not private.weekly_activity_editable(new.report_id) then raise exception 'Relatório bloqueado para associação de anexos.';end if;
  if not exists(select 1 from public.weekly_activity_items where id=new.activity_item_id and report_id=new.report_id) then raise exception 'Atividade de outro relatório.';end if;
  if new.product_version_id is not null and not exists(select 1 from public.weekly_activity_products where id=new.product_version_id and item_id=new.activity_item_id) then raise exception 'Produto de outra atividade.';end if;
 end if;return new;end $$;
revoke all on function private.guard_weekly_attachment_source() from public;
create trigger guard_weekly_attachment_source before insert or update or delete on public.weekly_team_report_attachments for each row execute function private.guard_weekly_attachment_source();
create function private.guided_weekly_storage_editable(path text) returns boolean language sql stable security invoker set search_path='' as $$
 select not exists(select 1 from public.weekly_activity_items where report_id::text=(storage.foldername(path))[1]) or exists(select 1 from public.weekly_activity_items where report_id::text=(storage.foldername(path))[1] and private.weekly_activity_editable(report_id));
$$;
revoke all on function private.guided_weekly_storage_editable(text) from public;
grant execute on function private.guided_weekly_storage_editable(text) to authenticated;
create policy guided_weekly_storage_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'project-memory-documents' or private.guided_weekly_storage_editable(name));
create policy guided_weekly_storage_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'project-memory-documents' or private.guided_weekly_storage_editable(name)) with check(bucket_id<>'project-memory-documents' or private.guided_weekly_storage_editable(name));
create policy guided_weekly_storage_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'project-memory-documents' or private.guided_weekly_storage_editable(name));

create function private.guard_guided_weekly_report() returns trigger language plpgsql security invoker set search_path='' as $$
declare reviewer boolean:=public.get_user_role() in ('admin','coordenacao');begin
 if old.status='approved' and new.status='approved' and (to_jsonb(new)-'updated_at') is distinct from (to_jsonb(old)-'updated_at') then raise exception 'Semanal aprovado é bloqueado. Reabra com justificativa.';end if;
 if (new.id,new.team_member_id,new.created_by,new.created_at) is distinct from (old.id,old.team_member_id,old.created_by,old.created_at) then raise exception 'Autoria e responsável imutáveis após registrar atividades.';end if;
 if not reviewer and not exists(select 1 from public.team_members where id=old.team_member_id and profile_id=auth.uid() and active) then raise exception 'Vínculo ativo obrigatório.';end if;
 if not reviewer and new.profile_id is distinct from old.profile_id and new.profile_id is distinct from auth.uid() then raise exception 'Não altere o vínculo de acesso do relatório.';end if;
 if not reviewer and (new.review_notes is distinct from old.review_notes or (new.reviewed_by is not null and new.reviewed_by is distinct from old.reviewed_by) or (new.reviewed_at is not null and new.reviewed_at is distinct from old.reviewed_at)) then raise exception 'Revisão exclusiva da coordenação.';end if;
 if old.status not in ('draft','needs_changes') and (to_jsonb(new)-array['status','review_notes','reviewed_by','reviewed_at','updated_at']) is distinct from (to_jsonb(old)-array['status','review_notes','reviewed_by','reviewed_at','updated_at']) then raise exception 'Reabra o semanal antes de editar seu conteúdo.';end if;
 if exists(select 1 from public.weekly_activity_items where report_id=old.id and (activity_date<new.week_start or activity_date>new.week_end)) then raise exception 'O período deve abranger as atividades datadas.';end if;
 if new.status is distinct from old.status then
  if not reviewer and not (old.status in ('draft','needs_changes') and new.status='submitted') then raise exception 'Equipe somente envia rascunhos próprios.';end if;
  if reviewer and not ((old.status in ('draft','needs_changes') and new.status in ('submitted','archived')) or (old.status='submitted' and new.status in ('in_review','needs_changes','archived')) or (old.status='in_review' and new.status in ('approved','needs_changes','archived')) or (old.status='approved' and new.status='needs_changes')) then raise exception 'Transição de revisão inválida.';end if;
  if new.status='needs_changes' and nullif(btrim(new.review_notes),'') is null then raise exception 'Justifique os ajustes ou a reabertura.';end if;
  if old.status='approved' and new.status='needs_changes' and new.review_notes is not distinct from old.review_notes then raise exception 'Registre uma nova justificativa para reabrir.';end if;
  if reviewer then new.reviewed_by:=auth.uid();new.reviewed_at:=now();end if;
 elsif not reviewer and (new.review_notes is distinct from old.review_notes or (new.reviewed_by is not null and new.reviewed_by is distinct from old.reviewed_by) or (new.reviewed_at is not null and new.reviewed_at is distinct from old.reviewed_at)) then raise exception 'Revisão exclusiva da coordenação.';
 end if;return new;end $$;
revoke all on function private.guard_guided_weekly_report() from public;
create trigger guard_guided_weekly_report before update on public.weekly_team_reports for each row execute function private.guard_guided_weekly_report();
drop policy if exists "Equipe edita próprio relatório semanal aberto; coordenação e admin revisam" on public.weekly_team_reports;
create policy "Equipe edita próprio relatório semanal aberto; coordenação e admin revisam" on public.weekly_team_reports for update to authenticated
using(public.get_user_role() in ('admin','coordenacao') or (status in ('draft','needs_changes') and public.get_user_role()='equipe' and exists(select 1 from public.team_members where id=team_member_id and profile_id=auth.uid() and active)))
with check(public.get_user_role() in ('admin','coordenacao') or (status in ('draft','needs_changes','submitted') and public.get_user_role()='equipe' and exists(select 1 from public.team_members where id=team_member_id and profile_id=auth.uid() and active)));

create table public.weekly_activity_review_history(id uuid primary key default gen_random_uuid(),report_id uuid not null references public.weekly_team_reports(id),actor_id uuid not null references public.profiles(id),from_status text not null,to_status text not null,note text,created_at timestamptz not null default now());
create index on public.weekly_activity_review_history(report_id);create index on public.weekly_activity_review_history(actor_id);
alter table public.weekly_activity_review_history enable row level security;
create policy weekly_review_history_read on public.weekly_activity_review_history for select to authenticated using(exists(select 1 from public.weekly_team_reports where id=report_id));
revoke all on public.weekly_activity_review_history from anon,authenticated;grant select on public.weekly_activity_review_history to authenticated;grant all on public.weekly_activity_review_history to service_role;
create function private.audit_guided_weekly_report() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status is distinct from old.status and exists(select 1 from public.weekly_activity_items where report_id=new.id) then
  insert into public.weekly_activity_review_history(report_id,actor_id,from_status,to_status,note) values(new.id,auth.uid(),old.status,new.status,new.review_notes);
 end if;return new;end $$;
revoke all on function private.audit_guided_weekly_report() from public,anon,authenticated;
create trigger audit_guided_weekly_report after update on public.weekly_team_reports for each row execute function private.audit_guided_weekly_report();

create table public.monthly_syntheses (
 id uuid primary key default gen_random_uuid(),reference_month date not null check(extract(day from reference_month)=1),scope_key text not null,version integer not null check(version>0),
 status text not null default 'draft' check(status in ('draft','approved')),base jsonb not null,source_hash text not null,
 generated_blocks jsonb not null default '[]',edited_blocks jsonb not null default '[]',public_blocks jsonb not null default '[]',review_note text not null default '',review_checklist jsonb not null default '{}',
 created_by uuid not null default auth.uid() references public.profiles(id),approved_by uuid references public.profiles(id),approved_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),sync_receipt text,sync_error text,sync_payload_hash text,
 unique(reference_month,scope_key,version)
);
create index on public.monthly_syntheses(created_by);create index on public.monthly_syntheses(approved_by);create index on public.monthly_syntheses(reference_month,scope_key);
alter table public.monthly_syntheses enable row level security;
create policy synthesis_read on public.monthly_syntheses for select to authenticated using(public.get_user_role() in ('admin','coordenacao') or (status='approved' and exists(select 1 from public.team_members where id::text=scope_key and profile_id=auth.uid() and active)));
create policy synthesis_insert on public.monthly_syntheses for insert to authenticated with check(public.get_user_role() in ('admin','coordenacao') and created_by=auth.uid() and status='draft');
create policy synthesis_update on public.monthly_syntheses for update to authenticated using(public.get_user_role() in ('admin','coordenacao')) with check(public.get_user_role() in ('admin','coordenacao'));
revoke all on public.monthly_syntheses from anon,authenticated;grant select,insert,update on public.monthly_syntheses to authenticated;grant all on public.monthly_syntheses to service_role;
create function private.guard_monthly_synthesis() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='INSERT' then
  if new.status<>'draft' or new.approved_by is not null or new.approved_at is not null then raise exception 'Crie um rascunho.';end if;
 else
  if (new.id,new.reference_month,new.scope_key,new.version,new.created_by,new.created_at,new.base,new.source_hash) is distinct from (old.id,old.reference_month,old.scope_key,old.version,old.created_by,old.created_at,old.base,old.source_hash) then raise exception 'Identidade, autoria e base de fontes imutáveis. Gere nova versão.';end if;
  if old.status='approved' and (to_jsonb(new)-array['sync_receipt','sync_error','sync_payload_hash','updated_at']) is distinct from (to_jsonb(old)-array['sync_receipt','sync_error','sync_payload_hash','updated_at']) then raise exception 'Síntese aprovada é congelada. Gere nova versão.';end if;
  if (new.approved_by,new.approved_at) is distinct from (old.approved_by,old.approved_at) then raise exception 'Aprovação é registrada pelo sistema.';end if;
  if new.status='approved' and old.status='draft' then
   if not (new.review_checklist @> '{"sources":true,"methodology":true,"privacy":true,"public_version":true}'::jsonb) or jsonb_array_length(new.edited_blocks)=0 then raise exception 'Revise as fontes, a metodologia, a privacidade e a versão pública.';end if;
   new.approved_by:=auth.uid();new.approved_at:=now();
  end if;
 end if;
 new.updated_at:=now();return new;end $$;
revoke all on function private.guard_monthly_synthesis() from public;
create trigger guard_monthly_synthesis before insert or update on public.monthly_syntheses for each row execute function private.guard_monthly_synthesis();
create table public.monthly_synthesis_history(id uuid primary key default gen_random_uuid(),synthesis_id uuid not null references public.monthly_syntheses(id),actor_id uuid not null references public.profiles(id),event text not null,details jsonb not null,created_at timestamptz not null default now());
create index on public.monthly_synthesis_history(synthesis_id);create index on public.monthly_synthesis_history(actor_id);
alter table public.monthly_synthesis_history enable row level security;
create policy synthesis_history_read on public.monthly_synthesis_history for select to authenticated using(exists(select 1 from public.monthly_syntheses where id=synthesis_id));
revoke all on public.monthly_synthesis_history from anon,authenticated;grant select on public.monthly_synthesis_history to authenticated;grant all on public.monthly_synthesis_history to service_role;
create function private.audit_monthly_synthesis() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sessão obrigatória.';end if;
 insert into public.monthly_synthesis_history(synthesis_id,actor_id,event,details) values(new.id,auth.uid(),case when tg_op='INSERT' then 'created' when new.status='approved' and old.status<>'approved' then 'approved' when new.sync_receipt is distinct from old.sync_receipt then 'sent' else 'edited' end,to_jsonb(new));return new;end $$;
revoke all on function private.audit_monthly_synthesis() from public,anon,authenticated;
create trigger audit_monthly_synthesis after insert or update on public.monthly_syntheses for each row execute function private.audit_monthly_synthesis();
commit;
