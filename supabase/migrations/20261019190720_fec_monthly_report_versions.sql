-- Proposta FEC: versões mensais privadas. NÃO aplicada em produção.
begin;

create function private.fec_monthly_source_lock() returns trigger language plpgsql set search_path='' as $$
declare v_scope uuid; v_owner uuid;
begin
  if tg_table_name='fec_cycles' then v_scope:=new.engagement_id;v_owner:=new.owner_id;
  elsif tg_table_name='fec_knowledge_files' then
    select c.engagement_id,k.owner_id into v_scope,v_owner from public.fec_knowledge_records k join public.fec_cycles c on c.id=k.cycle_id where k.id=new.record_id;
  else
    select c.engagement_id,c.owner_id into v_scope,v_owner from public.fec_cycles c where c.id=new.cycle_id;
  end if;
  if auth.uid() is null or v_scope is null then raise exception 'Fonte sem sessão ou escopo autorizado.';end if;
  perform pg_advisory_xact_lock(hashtextextended('fec-monthly:'||v_scope::text||':'||v_owner::text,0));
  return new;
end; $$;
revoke all on function private.fec_monthly_source_lock() from public,anon,authenticated;
create trigger aa_fec_monthly_lock before insert or update on public.fec_cycles for each row execute function private.fec_monthly_source_lock();
create trigger aa_fec_monthly_lock before insert or update on public.fec_activities for each row execute function private.fec_monthly_source_lock();
create trigger aa_fec_monthly_lock before insert or update on public.fec_knowledge_records for each row execute function private.fec_monthly_source_lock();
create trigger aa_fec_monthly_lock before insert on public.fec_knowledge_files for each row execute function private.fec_monthly_source_lock();

create function private.fec_monthly_sources(p_scope uuid,p_owner uuid,p_month date) returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare v_result jsonb; v_end date:=(p_month+interval '1 month')::date;
begin
  if auth.uid() is null or not((auth.uid()=p_owner and private.fec_has_assignment(p_scope,'executor')) or private.fec_has_assignment(p_scope,'supervisor')) then raise exception 'Fontes mensais não autorizadas.';end if;
  if p_month is null or extract(day from p_month)<>1 then raise exception 'Mês inválido.';end if;
  with cycles as (
    select c.* from public.fec_cycles c where c.engagement_id=p_scope and c.owner_id=p_owner and (
      exists(select 1 from public.fec_activities a where a.cycle_id=c.id and a.activity_date<v_end)
      or exists(select 1 from public.fec_knowledge_records k where k.cycle_id=c.id and k.status='approved' and (k.reviewed_at at time zone 'America/Sao_Paulo')::date<v_end)
    )
  ), activities as (
    select a.* from public.fec_activities a join cycles c on c.id=a.cycle_id where a.activity_date<v_end
  ), records as (
    select k.* from public.fec_knowledge_records k join cycles c on c.id=k.cycle_id where k.status='approved' and (k.reviewed_at at time zone 'America/Sao_Paulo')::date<v_end
  ), files as (
    select f.id,f.record_id,f.title,f.object_name,f.created_at from public.fec_knowledge_files f join records r on r.id=f.record_id
  )
  select jsonb_build_object(
    'month',to_char(p_month,'YYYY-MM'),'ownerId',p_owner,'engagementId',p_scope,
    'engagement',(select jsonb_build_object('id',e.id,'contract_reference',e.contract_reference,'title',e.title) from public.fec_engagements e where e.id=p_scope),
    'cycles',coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from cycles c),'[]'::jsonb),
    'activities',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from activities a),'[]'::jsonb),
    'records',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from records r),'[]'::jsonb),
    'files',coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from files f),'[]'::jsonb),
    'neighborhoods',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'name',n.name) order by n.id) from public.neighborhoods n where n.id in(select c.neighborhood_id from cycles c)),'[]'::jsonb)
  ) into v_result;
  if jsonb_array_length(v_result->'cycles')>500 or jsonb_array_length(v_result->'activities')>1000 or jsonb_array_length(v_result->'records')>1000 or jsonb_array_length(v_result->'files')>1000 or octet_length(v_result::text)>8388608 then raise exception 'Volume de fontes exige paginação; fechamento não emitido.';end if;
  return v_result;
end; $$;
revoke all on function private.fec_monthly_sources(uuid,uuid,date) from public,anon,authenticated;
create function private.fec_monthly_hash(jsonb) returns text language sql immutable security invoker set search_path='' as $$select encode(sha256(convert_to($1::text,'UTF8')),'hex')$$;
revoke all on function private.fec_monthly_hash(jsonb) from public,anon,authenticated;

-- Indicadores calculados no banco a partir da cópia autorizada; clientes não fornecem totais.
create function private.fec_monthly_metrics(p_snapshot jsonb,p_month date) returns jsonb language sql immutable set search_path='' set timezone='UTC' as $$
 with recursive acts as(select value a from jsonb_array_elements(p_snapshot->'activities')),
 approved as(select a from acts where a->>'status'='approved'),
 records as(select value k from jsonb_array_elements(p_snapshot->'records')),
 invalid(id) as(
   select k->>'id' from records where exists(select 1 from jsonb_array_elements_text(k->'source_activity_ids') s where not exists(select 1 from approved where a->>'id'=s)) or exists(select 1 from jsonb_array_elements_text(k->'source_record_ids') s where not exists(select 1 from records r where r.k->>'id'=s))
   union select r.k->>'id' from records r join invalid i on r.k->'source_record_ids' ? i.id
 ),
 valid as(select k from records where not exists(select 1 from invalid i where i.id=k->>'id')),
 latest as(select distinct on(k->>'record_key') k from valid order by k->>'record_key',(k->>'version')::integer desc),
 period as(select a,case when nullif(a->>'canonical_action_id','') is not null then 'action:'||(a->>'canonical_action_id') else 'fec:'||(a->>'id') end event_key from approved where left(a->>'activity_date',7)=to_char(p_month,'YYYY-MM')),
 groups as(select event_key,count(*) filter(where a->>'activity_type' not in ('preparation','systematization')) public_count,max(a->>'participation_kind') filter(where a->>'activity_type' not in ('preparation','systematization')) kind,max((a->>'participation_count')::integer) filter(where a->>'activity_type' not in ('preparation','systematization')) n from period group by event_key),
 reviewed as(select k from latest where to_char((k->>'reviewed_at')::timestamptz at time zone 'America/Sao_Paulo','YYYY-MM')=to_char(p_month,'YYYY-MM'))
 select jsonb_build_object(
 'activityCount',(select count(*) from period),
 'workshopCount',(select count(distinct event_key) from period where a->>'activity_type' in ('cartography_workshop','territorial_reading_workshop','environmental_education_workshop','planting_workshop')),
 'eventCount',(select count(*) from groups),
 'recordedParticipations',(select coalesce(sum(n) filter(where public_count=1 and kind='recorded'),0) from groups),
 'estimatedParticipations',(select coalesce(sum(n) filter(where public_count=1 and kind='estimated'),0) from groups),
 'unknownParticipationEvents',(select count(*) from groups where public_count>1 or (public_count=1 and kind='not_recorded')),
 'uniquePeople',null,
 'newMapCount',(select count(*) from latest l where k->>'kind'='map' and to_char((select min((r.k->>'reviewed_at')::timestamptz) from records r where r.k->>'record_key'=l.k->>'record_key') at time zone 'America/Sao_Paulo','YYYY-MM')=to_char(p_month,'YYYY-MM')),
 'mapRevisions',(select count(*) from valid where k->>'kind'='map' and to_char((k->>'reviewed_at')::timestamptz at time zone 'America/Sao_Paulo','YYYY-MM')=to_char(p_month,'YYYY-MM')),
 'diagnoses',(select count(*) from reviewed where k->>'kind'='diagnosis'),
 'findings',(select count(*) from reviewed where k->>'kind'='finding'),
 'proposals',(select count(*) from reviewed where k->>'kind'='proposal')
 )
$$;
revoke all on function private.fec_monthly_metrics(jsonb,date) from public,anon,authenticated;

create table public.fec_monthly_reports (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null references public.fec_engagements(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 reference_month date not null check(extract(day from reference_month)=1),
 version integer not null check(version>0),
 previous_id uuid references public.fec_monthly_reports(id) on delete restrict,
 status text not null default 'draft' check(status in ('draft','submitted','in_review','needs_changes','approved')),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 calculation_version integer not null default 1 check(calculation_version=1),
 metrics jsonb not null check(jsonb_typeof(metrics)='object'),
 blocks jsonb not null default '[]' check(jsonb_typeof(blocks)='array'),
 no_activity_reason text not null default '' check(length(no_activity_reason)<=5000),
 review_checklist jsonb not null default '{}',
 reviewed_by uuid references auth.users(id) on delete restrict, reviewed_at timestamptz, review_notes text,
 revision integer not null default 1,
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 change_note text,
 unique(engagement_id,owner_id,reference_month,version)
);
create unique index fec_monthly_one_open on public.fec_monthly_reports(engagement_id,owner_id,reference_month) where status<>'approved';
create index fec_monthly_owner_idx on public.fec_monthly_reports(owner_id,reference_month desc);
create index fec_monthly_previous_idx on public.fec_monthly_reports(previous_id) where previous_id is not null;
alter table public.fec_monthly_reports enable row level security;
revoke all on public.fec_monthly_reports from public,anon,authenticated;
grant select on public.fec_monthly_reports to authenticated;
grant all on public.fec_monthly_reports to service_role;
create policy fec_monthly_read on public.fec_monthly_reports for select to authenticated using((owner_id=auth.uid() and public.fec_has_assignment(engagement_id,'executor')) or public.fec_has_assignment(engagement_id,'supervisor'));

create table public.fec_monthly_history (
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.fec_monthly_reports(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 event text not null check(event in ('created','saved','sources_refreshed','submitted','review_started','changes_requested','approved')),
 from_status text,to_status text not null,reason text,revision integer not null,occurred_at timestamptz not null default now(),
 unique(report_id,revision)
);
create index fec_monthly_history_report_idx on public.fec_monthly_history(report_id,occurred_at);
alter table public.fec_monthly_history enable row level security;
revoke all on public.fec_monthly_history from public,anon,authenticated;
grant select on public.fec_monthly_history to authenticated;
grant all on public.fec_monthly_history to service_role;
create policy fec_monthly_history_read on public.fec_monthly_history for select to authenticated using(exists(select 1 from public.fec_monthly_reports r where r.id=report_id));

create function private.fec_monthly_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare v_event text;
begin
 if auth.uid() is null then raise exception 'Histórico exige sessão.';end if;
 if tg_op='UPDATE' then
   if old.status='approved' then raise exception 'Versão aprovada é imutável; crie nova versão.';end if;
   if new.id<>old.id or new.owner_id<>old.owner_id or new.engagement_id<>old.engagement_id or new.reference_month<>old.reference_month or new.version<>old.version or new.previous_id is distinct from old.previous_id or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Identidade mensal imutável.';end if;
   if new.revision<>old.revision+1 then raise exception 'Revisão concorrente inválida.';end if;
 end if;
 v_event:=case when tg_op='INSERT' then 'created' when new.status='submitted' and old.status<>new.status then 'submitted' when new.status='in_review' and old.status<>new.status then 'review_started' when new.status='needs_changes' and old.status<>new.status then 'changes_requested' when new.status='approved' and old.status<>new.status then 'approved' when new.source_hash is distinct from old.source_hash or new.change_note='Fontes e texto recompostos pelo executor.' then 'sources_refreshed' else 'saved' end;
 insert into public.fec_monthly_history(report_id,actor_id,event,from_status,to_status,reason,revision) values(new.id,auth.uid(),v_event,case when tg_op='INSERT' then null else old.status end,new.status,new.change_note,new.revision);
 return new;
end; $$;
revoke all on function private.fec_monthly_audit() from public,anon,authenticated;
create trigger fec_monthly_audit after insert or update on public.fec_monthly_reports for each row execute function private.fec_monthly_audit();

create function private.fec_monthly_locked(p_id uuid,p_revision integer) returns public.fec_monthly_reports language plpgsql security definer set search_path='' as $$
declare r public.fec_monthly_reports;
begin
 select * into r from public.fec_monthly_reports where id=p_id;
 if auth.uid() is null or r.id is null or not((r.owner_id=auth.uid() and private.fec_has_assignment(r.engagement_id,'executor')) or private.fec_has_assignment(r.engagement_id,'supervisor')) then raise exception 'Relatório não autorizado.';end if;
 if not private.fec_scope_is_active(r.engagement_id) then raise exception 'Aditivo inativo.';end if;
 perform pg_advisory_xact_lock(hashtextextended('fec-monthly:'||r.engagement_id::text||':'||r.owner_id::text,0));
 select * into r from public.fec_monthly_reports where id=p_id for update;
 if p_revision is null or r.revision<>p_revision then raise exception 'Relatório mudou; recarregue antes de continuar.';end if;
 return r;
end; $$;
revoke all on function private.fec_monthly_locked(uuid,integer) from public,anon,authenticated;

create function private.fec_monthly_validate_blocks(p_blocks jsonb,p_snapshot jsonb) returns void language plpgsql set search_path='' as $$
declare b jsonb; v_id jsonb; i integer:=0; v_titles text[]:=array['1. Síntese do período','2. Territórios trabalhados','3. Ciclos técnicos em andamento','4. Oficinas e atividades realizadas','5. Mapa social','6. Diagnóstico participativo','7. Achado territorial','8. Proposta e encaminhamento','9. Dificuldades, limitações e lacunas','10. Planejamento das próximas atividades','11. Anexos e registros comprobatórios'];
begin
 if p_blocks is null or jsonb_typeof(p_blocks)<>'array' or jsonb_array_length(p_blocks)<>11 then raise exception 'Relatório exige onze blocos.';end if;
 for b in select value from jsonb_array_elements(p_blocks) loop
   i:=i+1;
   if jsonb_typeof(b)<>'object' or b->>'title' is distinct from v_titles[i] or jsonb_typeof(b->'text') is distinct from 'string' or nullif(btrim(b->>'text'),'') is null or length(b->>'text')>10000 or jsonb_typeof(b->'sourceIds') is distinct from 'array' or jsonb_array_length(b->'sourceIds')>1000 or (select count(*) from jsonb_object_keys(b))<>3 then raise exception 'Bloco mensal inválido.';end if;
   for v_id in select value from jsonb_array_elements(b->'sourceIds') loop
     if jsonb_typeof(v_id)<>'string' or not exists(select 1 from jsonb_array_elements((p_snapshot->'cycles')||(p_snapshot->'activities')||(p_snapshot->'records')||(p_snapshot->'files')) s where s->'id'=v_id) then raise exception 'Referência fora das fontes congeladas.';end if;
   end loop;
 end loop;
end; $$;
revoke all on function private.fec_monthly_validate_blocks(jsonb,jsonb) from public,anon,authenticated;

create function private.fec_monthly_open(p_engagement_id uuid,p_month date,p_previous_id uuid default null) returns public.fec_monthly_reports language plpgsql security definer set search_path='' as $$
declare r public.fec_monthly_reports; v_snapshot jsonb;
begin
 if auth.uid() is null or p_month is null or extract(day from p_month)<>1 or not private.fec_has_assignment(p_engagement_id,'executor') or not private.fec_scope_is_active(p_engagement_id) then raise exception 'Aditivo, mês ou executor inválido.';end if;
 perform pg_advisory_xact_lock(hashtextextended('fec-monthly:'||p_engagement_id::text||':'||auth.uid()::text,0));
 select * into r from public.fec_monthly_reports where engagement_id=p_engagement_id and owner_id=auth.uid() and reference_month=p_month order by version desc limit 1;
 if r.id is not null and r.status<>'approved' then
   if p_previous_id is not null then raise exception 'Já existe versão aberta para este mês.';end if;
   return r;
 end if;
 if (r.id is null and p_previous_id is not null) or (r.id is not null and p_previous_id is distinct from r.id) then raise exception 'Nova versão exige referência explícita à última versão aprovada.';end if;
 v_snapshot:=private.fec_monthly_sources(p_engagement_id,auth.uid(),p_month);
 insert into public.fec_monthly_reports(engagement_id,owner_id,reference_month,version,previous_id,snapshot,source_hash,metrics,created_by) values(p_engagement_id,auth.uid(),p_month,coalesce(r.version,0)+1,r.id,v_snapshot,private.fec_monthly_hash(v_snapshot),private.fec_monthly_metrics(v_snapshot,p_month),auth.uid()) returning * into r;
 return r;
end; $$;

create function private.fec_monthly_save(p_id uuid,p_revision integer,p_blocks jsonb,p_no_activity_reason text default '') returns public.fec_monthly_reports language plpgsql security definer set search_path='' as $$
declare r public.fec_monthly_reports;
begin
 r:=private.fec_monthly_locked(p_id,p_revision);
 if r.owner_id<>auth.uid() or not private.fec_has_assignment(r.engagement_id,'executor') or r.status not in ('draft','needs_changes') then raise exception 'Somente executor edita rascunho ou ajustes.';end if;
 perform private.fec_monthly_validate_blocks(p_blocks,r.snapshot);
 if p_no_activity_reason is null or length(p_no_activity_reason)>5000 then raise exception 'Justificativa inválida.';end if;
 update public.fec_monthly_reports set blocks=p_blocks,no_activity_reason=p_no_activity_reason,revision=revision+1,updated_at=now(),change_note=null where id=r.id returning * into r;
 return r;
end; $$;

create function private.fec_monthly_refresh(p_id uuid,p_revision integer) returns public.fec_monthly_reports language plpgsql security definer set search_path='' as $$
declare r public.fec_monthly_reports; v_snapshot jsonb;
begin
 r:=private.fec_monthly_locked(p_id,p_revision);
 if r.owner_id<>auth.uid() or not private.fec_has_assignment(r.engagement_id,'executor') or r.status not in ('draft','needs_changes') then raise exception 'Somente executor recompõe fontes em rascunho ou ajustes.';end if;
 v_snapshot:=private.fec_monthly_sources(r.engagement_id,r.owner_id,r.reference_month);
 update public.fec_monthly_reports set snapshot=v_snapshot,source_hash=private.fec_monthly_hash(v_snapshot),metrics=private.fec_monthly_metrics(v_snapshot,r.reference_month),blocks='[]',review_checklist='{}',revision=revision+1,updated_at=now(),change_note='Fontes e texto recompostos pelo executor.' where id=r.id returning * into r;
 return r;
end; $$;

create function private.fec_monthly_transition(p_id uuid,p_revision integer,p_decision text,p_reason text default '',p_checklist jsonb default '{}') returns public.fec_monthly_reports language plpgsql security definer set search_path='' as $$
declare r public.fec_monthly_reports; v_current jsonb;
begin
 r:=private.fec_monthly_locked(p_id,p_revision);
 if p_decision is null or p_decision not in ('submitted','in_review','needs_changes','approved') or p_reason is null or length(p_reason)>5000 then raise exception 'Decisão inválida.';end if;
 if p_decision='submitted' then
   if r.owner_id<>auth.uid() or not private.fec_has_assignment(r.engagement_id,'executor') or r.status not in ('draft','needs_changes') then raise exception 'Somente executor envia rascunho ou ajustes.';end if;
   perform private.fec_monthly_validate_blocks(r.blocks,r.snapshot);
   if not exists(select 1 from jsonb_array_elements(r.snapshot->'activities') a where a->>'status'='approved' and left(a->>'activity_date',7)=to_char(r.reference_month,'YYYY-MM')) and not exists(select 1 from jsonb_array_elements(r.snapshot->'records') k where to_char((k->>'reviewed_at')::timestamptz at time zone 'America/Sao_Paulo','YYYY-MM')=to_char(r.reference_month,'YYYY-MM')) and nullif(btrim(r.no_activity_reason),'') is null then raise exception 'Mês sem registros aprovados exige justificativa.';end if;
 else
   if r.owner_id=auth.uid() or not private.fec_has_assignment(r.engagement_id,'supervisor') then raise exception 'Revisão exige supervisor distinto do autor.';end if;
   if (p_decision='in_review' and r.status<>'submitted') or (p_decision in ('approved','needs_changes') and r.status<>'in_review') then raise exception 'Transição de revisão inválida.';end if;
   if p_decision='needs_changes' and nullif(btrim(p_reason),'') is null then raise exception 'Ajustes exigem justificativa.';end if;
   if p_decision='approved' and (jsonb_typeof(p_checklist) is distinct from 'object' or not(p_checklist @> '{"sources":true,"methodology":true,"privacy":true,"deliverables":true}'::jsonb)) then raise exception 'Aprovação exige conferência das fontes, metodologia, privacidade e entregas.';end if;
 end if;
 if p_decision in ('submitted','approved') then
   v_current:=private.fec_monthly_sources(r.engagement_id,r.owner_id,r.reference_month);
   if private.fec_monthly_hash(v_current)<>r.source_hash then raise exception 'Fontes mudaram; solicite ajustes e recomponha o fechamento.';end if;
 end if;
 update public.fec_monthly_reports set status=p_decision,revision=revision+1,updated_at=now(),change_note=p_reason,
   reviewed_by=case when p_decision='submitted' then reviewed_by else auth.uid() end,
   reviewed_at=case when p_decision='submitted' then reviewed_at else now() end,
   review_notes=case when p_decision='submitted' then review_notes else p_reason end,
   review_checklist=case when p_decision='approved' then p_checklist else '{}'::jsonb end
 where id=r.id returning * into r;
 return r;
end; $$;

create function private.fec_monthly_check(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.fec_monthly_reports; v_hash text;
begin
 select * into r from public.fec_monthly_reports where id=p_id;
 if auth.uid() is null or r.id is null or not((r.owner_id=auth.uid() and private.fec_has_assignment(r.engagement_id,'executor')) or private.fec_has_assignment(r.engagement_id,'supervisor')) then raise exception 'Relatório não autorizado.';end if;
 v_hash:=private.fec_monthly_hash(private.fec_monthly_sources(r.engagement_id,r.owner_id,r.reference_month));
 return jsonb_build_object('stale',v_hash<>r.source_hash,'source_hash',r.source_hash,'current_hash',v_hash);
end; $$;

revoke all on function private.fec_monthly_open(uuid,date,uuid),private.fec_monthly_save(uuid,integer,jsonb,text),private.fec_monthly_refresh(uuid,integer),private.fec_monthly_transition(uuid,integer,text,text,jsonb),private.fec_monthly_check(uuid) from public,anon;
grant execute on function private.fec_monthly_open(uuid,date,uuid),private.fec_monthly_save(uuid,integer,jsonb,text),private.fec_monthly_refresh(uuid,integer),private.fec_monthly_transition(uuid,integer,text,text,jsonb),private.fec_monthly_check(uuid) to authenticated;
create function public.fec_monthly_open(p_engagement_id uuid,p_month date,p_previous_id uuid default null) returns public.fec_monthly_reports language sql security invoker set search_path='' as $$select private.fec_monthly_open($1,$2,$3)$$;
create function public.fec_monthly_save(p_id uuid,p_revision integer,p_blocks jsonb,p_no_activity_reason text default '') returns public.fec_monthly_reports language sql security invoker set search_path='' as $$select private.fec_monthly_save($1,$2,$3,$4)$$;
create function public.fec_monthly_refresh(p_id uuid,p_revision integer) returns public.fec_monthly_reports language sql security invoker set search_path='' as $$select private.fec_monthly_refresh($1,$2)$$;
create function public.fec_monthly_transition(p_id uuid,p_revision integer,p_decision text,p_reason text default '',p_checklist jsonb default '{}') returns public.fec_monthly_reports language sql security invoker set search_path='' as $$select private.fec_monthly_transition($1,$2,$3,$4,$5)$$;
create function public.fec_monthly_check(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.fec_monthly_check($1)$$;
revoke all on function public.fec_monthly_open(uuid,date,uuid),public.fec_monthly_save(uuid,integer,jsonb,text),public.fec_monthly_refresh(uuid,integer),public.fec_monthly_transition(uuid,integer,text,text,jsonb),public.fec_monthly_check(uuid) from public,anon;
grant execute on function public.fec_monthly_open(uuid,date,uuid),public.fec_monthly_save(uuid,integer,jsonb,text),public.fec_monthly_refresh(uuid,integer),public.fec_monthly_transition(uuid,integer,text,text,jsonb),public.fec_monthly_check(uuid) to authenticated;

commit;
