-- SEMEAR | Trilha FEC (aditivo): persistencia inicial isolada.
-- ESTADO: proposta; NAO aplicar sem inventario do banco interno e aval da supervisao.
-- Nao altera tabelas APS, escutas, oficinas, relatorios ou usuarios existentes.
-- Atribuicoes contratuais dependem de provisionamento autorizado (service_role/DBA).
begin;

create table public.fec_engagements (
  id uuid primary key default gen_random_uuid(),
  contract_reference text not null unique check (length(btrim(contract_reference)) > 0),
  title text not null check (length(btrim(title)) > 0),
  status text not null default 'planned'
    check (status in ('planned', 'active', 'closed')),
  created_at timestamptz not null default now()
);

create table public.fec_access_grants (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.fec_engagements(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('executor', 'supervisor')),
  active boolean not null default false,
  granted_at timestamptz not null default now(),
  unique (engagement_id, user_id)
);

-- SECURITY DEFINER somente para verificar vinculos; nenhum grant e criado por usuarios.
-- search_path fixo + referencias qualificadas para evitar shadowing de objetos.
create function public.fec_has_assignment(p_engagement_id uuid, p_role text default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fec_access_grants grant_row
    where grant_row.engagement_id = p_engagement_id
      and grant_row.user_id = auth.uid()
      and grant_row.active
      and (p_role is null or grant_row.role = p_role)
  );
$$;

-- Leitura historica continua possivel apos encerramento; escrita exige contrato ativo.
create function public.fec_scope_is_active(p_engagement_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fec_engagements scope_row
    where scope_row.id = p_engagement_id and scope_row.status = 'active'
  );
$$;

create table public.fec_cycles (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.fec_engagements(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  guiding_question text not null check (length(btrim(guiding_question)) > 0),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'needs_changes', 'approved')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  review_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.fec_activities (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null,
  owner_id uuid not null,
  activity_date date not null,
  activity_type text not null check (activity_type in (
    'cartography_workshop','territorial_reading_workshop','environmental_education_workshop',
    'planting_workshop','training','technical_visit','community_feedback',
    'preparation','systematization','other'
  )),
  objective text not null check (length(btrim(objective)) > 0),
  methodology text not null check (length(btrim(methodology)) > 0),
  participation_kind text not null default 'not_recorded'
    check (participation_kind in ('recorded','estimated','not_recorded')),
  participation_count integer null check (participation_count >= 0),
  participant_accounts text null,
  team_observations text null,
  external_sources text null,
  map_method text null,
  map_legend text null,
  finding_draft text null,
  proposal_draft text null,
  limitations text null,
  next_steps text null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'needs_changes', 'approved')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  review_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cycle_id, owner_id) references public.fec_cycles(id,owner_id) on delete restrict,
  check (
    (participation_kind = 'not_recorded' and participation_count is null)
    or (participation_kind in ('recorded','estimated') and participation_count is not null)
  ),
  check (
    activity_type not in ('preparation','systematization')
    or participation_kind = 'not_recorded'
  ),
  check (
    status not in ('submitted','approved') or activity_type <> 'cartography_workshop'
    or (nullif(btrim(coalesce(map_method,'')),'') is not null
        and nullif(btrim(coalesce(map_legend,'')),'') is not null)
  )
);

create table public.fec_review_log (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.fec_engagements(id) on delete restrict,
  record_kind text not null check (record_kind in ('cycle','activity')),
  record_id uuid not null,
  decision text not null check (decision in ('approved','needs_changes')),
  reason text null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create index fec_access_user_active_idx on public.fec_access_grants(user_id, engagement_id) where active;
create index fec_cycles_owner_idx on public.fec_cycles(owner_id, engagement_id);
create index fec_cycles_territory_idx on public.fec_cycles(neighborhood_id);
create index fec_activities_month_idx on public.fec_activities(activity_date, cycle_id) where status = 'approved';
create index fec_review_log_record_idx on public.fec_review_log(record_kind, record_id, decided_at desc);

create function public.fec_can_read_cycle(p_cycle_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fec_cycles c
    where c.id = p_cycle_id
      and (
        (c.owner_id = auth.uid() and public.fec_has_assignment(c.engagement_id, 'executor'))
        or public.fec_has_assignment(c.engagement_id, 'supervisor')
      )
  );
$$;

create function public.fec_can_edit_cycle(p_cycle_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fec_cycles c
    where c.id = p_cycle_id
      and c.owner_id = auth.uid()
      and c.status in ('draft','needs_changes','approved')
      and public.fec_has_assignment(c.engagement_id, 'executor')
      and public.fec_scope_is_active(c.engagement_id)
  );
$$;

-- Resguarda campos de identidade e impede que o executor fabrique revisoes.
create function public.fec_guard_cycle_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.engagement_id is distinct from old.engagement_id then
    raise exception 'Identidade e vinculo contratual do ciclo sao imutaveis.';
  end if;
  if old.owner_id = auth.uid() then
    if old.status not in ('draft','needs_changes') or new.status not in ('draft','submitted') then
      raise exception 'Executor nao pode aprovar, reabrir ou alterar ciclo encerrado.';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_notes is distinct from old.review_notes then
      raise exception 'Campos de revisao sao exclusivos da supervisao.';
    end if;
  elsif not public.fec_has_assignment(old.engagement_id, 'supervisor') then
    raise exception 'Alteracao sem atribuicao autorizada.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function public.fec_guard_activity_update()
returns trigger language plpgsql set search_path = ''
as $$
declare v_engagement_id uuid;
begin
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.cycle_id is distinct from old.cycle_id then
    raise exception 'Identidade, autor e ciclo-fonte sao imutaveis.';
  end if;
  select c.engagement_id into v_engagement_id
  from public.fec_cycles c where c.id = old.cycle_id;
  if old.owner_id = auth.uid() then
    if old.status not in ('draft','needs_changes') or new.status not in ('draft','submitted') then
      raise exception 'Executor nao pode aprovar, reabrir ou alterar atividade aprovada.';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_notes is distinct from old.review_notes then
      raise exception 'Campos de revisao sao exclusivos da supervisao.';
    end if;
  elsif not public.fec_has_assignment(v_engagement_id, 'supervisor') then
    raise exception 'Alteracao sem atribuicao autorizada.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger fec_guard_cycle_before_update before update on public.fec_cycles
  for each row execute function public.fec_guard_cycle_update();
create trigger fec_guard_activity_before_update before update on public.fec_activities
  for each row execute function public.fec_guard_activity_update();

-- Revisao por RPC: requer designacao expressa, impede autoavaliacao e exige submissao.
-- Supervisor nao recebe UPDATE generico. Historico de revisao separado e append-only.
create function public.fec_review_record(
  p_record_kind text, p_record_id uuid, p_decision text, p_reason text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_engagement_id uuid;
  v_owner_id uuid;
  v_status text;
begin
  if auth.uid() is null or p_record_kind is null or p_decision is null
     or p_record_kind not in ('cycle','activity') or p_decision not in ('approved','needs_changes') then
    raise exception 'Tipo de registro ou decisao invalida.';
  end if;
  if p_decision = 'needs_changes' and nullif(btrim(coalesce(p_reason,'')),'') is null then
    raise exception 'Solicitacao de ajustes precisa de justificativa.';
  end if;
  if p_record_kind = 'cycle' then
    select c.engagement_id, c.owner_id, c.status
      into v_engagement_id, v_owner_id, v_status
    from public.fec_cycles c where c.id = p_record_id for update;
  else
    select c.engagement_id, a.owner_id, a.status
      into v_engagement_id, v_owner_id, v_status
    from public.fec_activities a
    join public.fec_cycles c on c.id = a.cycle_id
    where a.id = p_record_id for update of a;
  end if;
  if v_owner_id is null then raise exception 'Registro nao encontrado.'; end if;
  if not public.fec_scope_is_active(v_engagement_id) then
    raise exception 'Aditivo inativo: revisao indisponivel.';
  end if;
  if not public.fec_has_assignment(v_engagement_id, 'supervisor')
     or auth.uid() = v_owner_id then
    raise exception 'Somente supervisao designada e distinta do executor pode revisar.';
  end if;
  if v_status <> 'submitted' then raise exception 'Apenas registros enviados podem ser revisados.'; end if;
  if p_record_kind = 'cycle' then
    update public.fec_cycles
    set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_reason
    where id = p_record_id;
  else
    update public.fec_activities
    set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_reason
    where id = p_record_id;
  end if;
  insert into public.fec_review_log(engagement_id,record_kind,record_id,decision,reason,reviewer_id)
  values(v_engagement_id,p_record_kind,p_record_id,p_decision,p_reason,auth.uid());
end;
$$;

alter table public.fec_engagements enable row level security;
alter table public.fec_access_grants enable row level security;
alter table public.fec_cycles enable row level security;
alter table public.fec_activities enable row level security;
alter table public.fec_review_log enable row level security;

create policy "fec_engagements_read_active_assignment" on public.fec_engagements
for select to authenticated using (public.fec_has_assignment(id));

create policy "fec_grants_read_self_or_supervisor" on public.fec_access_grants
for select to authenticated using (
  user_id = auth.uid() or public.fec_has_assignment(engagement_id,'supervisor')
);

create policy "fec_cycles_read_executor_or_supervisor" on public.fec_cycles
for select to authenticated using (
  (owner_id = auth.uid() and public.fec_has_assignment(engagement_id,'executor'))
  or public.fec_has_assignment(engagement_id,'supervisor')
);
create policy "fec_cycles_insert_executor_draft" on public.fec_cycles
for insert to authenticated with check (
  owner_id = auth.uid() and status = 'draft'
  and reviewed_by is null and reviewed_at is null and review_notes is null
  and public.fec_has_assignment(engagement_id,'executor')
  and public.fec_scope_is_active(engagement_id)
);
create policy "fec_cycles_update_executor_open" on public.fec_cycles
for update to authenticated using (
  owner_id = auth.uid() and status in ('draft','needs_changes')
  and public.fec_has_assignment(engagement_id,'executor')
  and public.fec_scope_is_active(engagement_id)
) with check (
  owner_id = auth.uid() and status in ('draft','submitted')
  and public.fec_has_assignment(engagement_id,'executor')
  and public.fec_scope_is_active(engagement_id)
);

create policy "fec_activities_read_owner_or_supervisor" on public.fec_activities
for select to authenticated using (public.fec_can_read_cycle(cycle_id));
create policy "fec_activities_insert_owner_draft" on public.fec_activities
for insert to authenticated with check (
  owner_id = auth.uid() and status = 'draft'
  and reviewed_by is null and reviewed_at is null and review_notes is null
  and public.fec_can_edit_cycle(cycle_id)
);
create policy "fec_activities_update_owner_open" on public.fec_activities
for update to authenticated using (
  owner_id = auth.uid() and status in ('draft','needs_changes')
  and public.fec_can_edit_cycle(cycle_id)
) with check (
  owner_id = auth.uid() and status in ('draft','submitted')
  and public.fec_can_edit_cycle(cycle_id)
);

create policy "fec_review_log_read_owners_or_supervisors" on public.fec_review_log
for select to authenticated using (
  public.fec_has_assignment(engagement_id,'supervisor')
  or (record_kind = 'cycle' and exists (
    select 1 from public.fec_cycles c where c.id = record_id and c.owner_id = auth.uid()
  ))
  or (record_kind = 'activity' and exists (
    select 1 from public.fec_activities a where a.id = record_id and a.owner_id = auth.uid()
  ))
);

-- Nenhuma insercao de vinculos por cliente; apenas provisionamento institucional autenticado
-- por mecanismo administrado fora da API de profissionais (service_role / DBA autorizado).
revoke all on public.fec_engagements, public.fec_access_grants,
  public.fec_cycles, public.fec_activities, public.fec_review_log from anon, authenticated;
grant select on public.fec_engagements, public.fec_access_grants,
  public.fec_review_log to authenticated;
grant select, insert, update on public.fec_cycles, public.fec_activities to authenticated;
grant all on public.fec_engagements, public.fec_access_grants,
  public.fec_cycles, public.fec_activities, public.fec_review_log to service_role;
revoke all on function public.fec_scope_is_active(uuid) from public;
grant execute on function public.fec_scope_is_active(uuid) to authenticated;
revoke all on function public.fec_has_assignment(uuid,text) from public;
revoke all on function public.fec_can_read_cycle(uuid) from public;
revoke all on function public.fec_can_edit_cycle(uuid) from public;
revoke all on function public.fec_review_record(text,uuid,text,text) from public;
grant execute on function public.fec_has_assignment(uuid,text) to authenticated;
grant execute on function public.fec_can_read_cycle(uuid) to authenticated;
grant execute on function public.fec_can_edit_cycle(uuid) to authenticated;
grant execute on function public.fec_review_record(text,uuid,text,text) to authenticated;

-- Incremento auditado: conhecimento territorial, arquivos privados e revisão rastreável.
-- Esta proposta ainda NÃO foi aplicada. Nenhuma tabela APS é alterada.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.fec_has_assignment(uuid,text) set schema private;
alter function public.fec_scope_is_active(uuid) set schema private;
alter function public.fec_can_read_cycle(uuid) set schema private;
alter function public.fec_can_edit_cycle(uuid) set schema private;
alter function public.fec_review_record(text,uuid,text,text) set schema private;

-- Wrappers expostos são INVOKER; funções privilegiadas ficam no schema não exposto.
create function public.fec_has_assignment(uuid,text default null) returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and private.fec_has_assignment($1,$2)$$;
create function public.fec_scope_is_active(uuid) returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and private.fec_scope_is_active($1)$$;
create function public.fec_can_read_cycle(uuid) returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and private.fec_can_read_cycle($1)$$;
create function public.fec_can_edit_cycle(uuid) returns boolean language sql stable security invoker set search_path='' as $$select auth.uid() is not null and private.fec_can_edit_cycle($1)$$;
revoke all on function public.fec_has_assignment(uuid,text),public.fec_scope_is_active(uuid),public.fec_can_read_cycle(uuid),public.fec_can_edit_cycle(uuid) from public,anon;
grant execute on function public.fec_has_assignment(uuid,text),public.fec_scope_is_active(uuid),public.fec_can_read_cycle(uuid),public.fec_can_edit_cycle(uuid) to authenticated;

alter table public.fec_cycles add column objectives text not null default '',
  add column methodology text not null default '',
  add column stage text not null default 'preparation' check(stage in ('preparation','fieldwork','systematization','feedback','closed'));
alter table public.fec_activities add column themes text not null default '',
  add column field_notes text not null default '',
  add column preliminary_results text not null default '',
  add column canonical_action_id uuid references public.actions(id) on delete restrict;
create function private.fec_guard_action_link() returns trigger language plpgsql set search_path='' as $$
begin
  if new.canonical_action_id is not null and not exists(
    select 1 from public.actions a join public.fec_cycles c on c.id=new.cycle_id
    where a.id=new.canonical_action_id and a.action_date=new.activity_date
      and a.neighborhood_id=c.neighborhood_id and a.status='realizada'
  ) then raise exception 'Evento compartilhado exige ação visível realizada, mesma data e território.'; end if;
  return new;
end; $$;
revoke all on function private.fec_guard_action_link() from public,anon,authenticated;
create trigger fec_activity_action_link before insert or update on public.fec_activities for each row execute function private.fec_guard_action_link();

create table public.fec_knowledge_records (
  id uuid primary key default gen_random_uuid(),
  record_key uuid not null default gen_random_uuid(),
  version integer not null default 1 check(version>0),
  previous_id uuid references public.fec_knowledge_records(id) on delete restrict,
  cycle_id uuid not null,
  owner_id uuid not null,
  kind text not null check(kind in ('evidence','map','diagnosis','finding','proposal')),
  title text not null check(length(btrim(title)) between 1 and 180),
  content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=70000),
  source_activity_ids uuid[] not null default '{}',
  source_record_ids uuid[] not null default '{}',
  community_status text not null default 'not_requested' check(community_status in ('not_requested','pending','partial','confirmed','divergent')),
  community_notes text not null default '',
  proposal_status text not null default 'recorded' check(proposal_status in ('recorded','forwarded','answered','implemented','closed')),
  status text not null default 'draft' check(status in ('draft','submitted','needs_changes','approved')),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz, review_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(cycle_id,owner_id) references public.fec_cycles(id,owner_id) on delete restrict,
  unique(record_key,version),
  check(community_status='not_requested' or length(btrim(community_notes))>0),
  check(kind='proposal' or proposal_status='recorded'),
  check(kind not in ('map','proposal','evidence') or cardinality(source_activity_ids)>0),
  check(kind not in ('finding','diagnosis') or cardinality(source_activity_ids)+cardinality(source_record_ids)>0),
  check(cardinality(source_activity_ids)<=50 and cardinality(source_record_ids)<=50)
);
create index fec_knowledge_cycle_idx on public.fec_knowledge_records(cycle_id,kind,status);
create index fec_knowledge_owner_idx on public.fec_knowledge_records(owner_id);
create index fec_activities_action_idx on public.fec_activities(canonical_action_id) where canonical_action_id is not null;
alter table public.fec_knowledge_records enable row level security;
revoke all on public.fec_knowledge_records from public,anon,authenticated;
grant select,insert,update on public.fec_knowledge_records to authenticated;
grant all on public.fec_knowledge_records to service_role;
create policy fec_knowledge_read on public.fec_knowledge_records for select to authenticated using(public.fec_can_read_cycle(cycle_id));
create policy fec_knowledge_create on public.fec_knowledge_records for insert to authenticated with check(owner_id=auth.uid() and status='draft' and reviewed_by is null and reviewed_at is null and review_notes is null and public.fec_can_edit_cycle(cycle_id));
create policy fec_knowledge_edit on public.fec_knowledge_records for update to authenticated using(owner_id=auth.uid() and status in ('draft','needs_changes') and public.fec_can_edit_cycle(cycle_id)) with check(owner_id=auth.uid() and status in ('draft','needs_changes','submitted') and public.fec_can_edit_cycle(cycle_id));

alter table public.fec_review_log drop constraint fec_review_log_record_kind_check;
alter table public.fec_review_log add constraint fec_review_log_record_kind_check check(record_kind in ('cycle','activity','knowledge'));
alter table public.fec_review_log drop constraint fec_review_log_decision_check;
alter table public.fec_review_log add constraint fec_review_log_decision_check check(decision in ('created','edited','submitted','approved','needs_changes'));
create policy fec_knowledge_history_read on public.fec_review_log for select to authenticated using(record_kind='knowledge' and exists(select 1 from public.fec_knowledge_records k where k.id=record_id and k.owner_id=auth.uid()));

create function private.fec_guard_knowledge() returns trigger language plpgsql security definer set search_path='' as $$
declare v_previous public.fec_knowledge_records; v_source uuid; v_required text[]; v_allowed text[]; v_key text;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória.'; end if;
  if tg_op='INSERT' then
    if new.owner_id<>auth.uid() or new.status<>'draft' or new.reviewed_by is not null or new.reviewed_at is not null or new.review_notes is not null then raise exception 'Autoria ou revisão inválida.'; end if;
    perform 1 from public.fec_cycles where id=new.cycle_id for update;
    if new.previous_id is not null then
      select * into v_previous from public.fec_knowledge_records where id=new.previous_id;
      if not found or v_previous.cycle_id<>new.cycle_id or v_previous.owner_id<>new.owner_id or v_previous.kind<>new.kind or v_previous.status<>'approved'
         or exists(select 1 from public.fec_knowledge_records where record_key=v_previous.record_key and version>v_previous.version) then raise exception 'Nova versão exige última versão aprovada do mesmo produto e ciclo.'; end if;
      new.record_key:=v_previous.record_key; new.version:=v_previous.version+1;
    elsif new.version<>1 or exists(select 1 from public.fec_knowledge_records where record_key=new.record_key) then raise exception 'Cadeia de versões inválida.'; end if;
    new.created_at:=now(); new.updated_at:=now();
  elsif new.record_key is distinct from old.record_key or new.version is distinct from old.version or new.previous_id is distinct from old.previous_id or new.kind is distinct from old.kind then raise exception 'Identidade e versão imutáveis.';
  end if;
  v_required:=case new.kind when 'map' then array['methodology','legend','categories','authorship'] when 'diagnosis' then array['questions','preliminary_findings','divergences'] when 'evidence' then array['evidence_class','description','reference'] else array['description'] end;
  v_allowed:=case new.kind when 'map' then v_required when 'diagnosis' then v_required||array['problems','community_proposals'] when 'evidence' then v_required when 'finding' then array['description','uncertainty'] else array['description','responsible','response'] end;
  foreach v_key in array v_required loop if nullif(btrim(new.content->>v_key),'') is null then raise exception 'Campo obrigatório: %',v_key; end if; end loop;
  if exists(select 1 from jsonb_each(new.content) e where not(e.key=any(v_allowed)) or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>10000) then raise exception 'Conteúdo incompatível com o tipo de produto.'; end if;
  if new.kind='evidence' and new.content->>'evidence_class' not in ('participant_account','team_observation','document','measurement_or_study') then raise exception 'Classe de evidência inválida.'; end if;
  if new.kind='proposal' and new.proposal_status<>'recorded' and nullif(btrim(new.content->>'response'),'') is null then raise exception 'Providência exige resposta documentada.'; end if;
  if cardinality(new.source_activity_ids)<>(select count(distinct s) from unnest(new.source_activity_ids) s) or cardinality(new.source_record_ids)<>(select count(distinct s) from unnest(new.source_record_ids) s) then raise exception 'Fontes repetidas ou nulas.'; end if;
  foreach v_source in array new.source_activity_ids loop
    if not exists(select 1 from public.fec_activities a where a.id=v_source and a.cycle_id=new.cycle_id and a.owner_id=new.owner_id and (new.status<>'approved' or a.status='approved')) then raise exception 'Atividade-fonte inexistente, externa ao ciclo ou não aprovada.'; end if;
  end loop;
  foreach v_source in array new.source_record_ids loop
    if v_source=new.id or not exists(select 1 from public.fec_knowledge_records k where k.id=v_source and k.cycle_id=new.cycle_id and k.owner_id=new.owner_id and k.status='approved') then raise exception 'Produto-fonte deve ser aprovado no mesmo ciclo.'; end if;
  end loop;
  return new;
end; $$;
revoke all on function private.fec_guard_knowledge() from public,anon,authenticated;
create trigger fec_knowledge_guard before insert or update on public.fec_knowledge_records for each row execute function private.fec_guard_knowledge();

create function private.fec_guard_record() returns trigger language plpgsql set search_path='' as $$
declare v_scope uuid; v_old jsonb:=to_jsonb(old); v_new jsonb:=to_jsonb(new);
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória.'; end if;
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at or v_new->'cycle_id' is distinct from v_old->'cycle_id' or v_new->'engagement_id' is distinct from v_old->'engagement_id' then raise exception 'Identidade, autoria e origem imutáveis.'; end if;
  if tg_table_name='fec_cycles' then v_scope:=old.engagement_id; else select engagement_id into v_scope from public.fec_cycles where id=old.cycle_id; end if;
  if not public.fec_scope_is_active(v_scope) then raise exception 'Aditivo inativo.'; end if;
  if old.owner_id=auth.uid() then
    if not public.fec_has_assignment(v_scope,'executor') or old.status not in ('draft','needs_changes') or new.status not in ('draft','needs_changes','submitted') or (new.status='needs_changes' and old.status<>'needs_changes') then raise exception 'Executor não pode aprovar, fabricar revisão nem alterar conteúdo enviado.'; end if;
    if new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at or new.review_notes is distinct from old.review_notes then raise exception 'Revisão exclusiva da supervisão.'; end if;
    if tg_table_name='fec_cycles' and new.status='submitted' and (nullif(btrim(v_new->>'objectives'),'') is null or nullif(btrim(v_new->>'methodology'),'') is null) then raise exception 'Objetivos e metodologia obrigatórios no envio.'; end if;
  else
    if not public.fec_has_assignment(v_scope,'supervisor') or not((old.status='submitted' and new.status in ('approved','needs_changes')) or (old.status='approved' and new.status='needs_changes')) then raise exception 'Transição de revisão inválida.'; end if;
    if (v_new-array['status','reviewed_by','reviewed_at','review_notes','updated_at']) is distinct from (v_old-array['status','reviewed_by','reviewed_at','review_notes','updated_at']) then raise exception 'Supervisor revisa sem reescrever o conteúdo do executor.'; end if;
    if new.status='needs_changes' and nullif(btrim(new.review_notes),'') is null then raise exception 'Justificativa obrigatória.'; end if;
    new.reviewed_by:=auth.uid(); new.reviewed_at:=now();
  end if;
  new.updated_at:=now(); return new;
end; $$;
revoke all on function private.fec_guard_record() from public,anon,authenticated;
drop trigger fec_guard_cycle_before_update on public.fec_cycles;
drop trigger fec_guard_activity_before_update on public.fec_activities;
create trigger fec_guard_cycle_before_update before update on public.fec_cycles for each row execute function private.fec_guard_record();
create trigger fec_guard_activity_before_update before update on public.fec_activities for each row execute function private.fec_guard_record();
create trigger fec_guard_knowledge_before_update before update on public.fec_knowledge_records for each row execute function private.fec_guard_record();

create or replace function private.fec_review_record(p_record_kind text,p_record_id uuid,p_decision text,p_reason text default null) returns void language plpgsql security definer set search_path='' as $$
declare v_table text; v_scope uuid; v_owner uuid; v_status text;
begin
  if auth.uid() is null or p_record_kind is null or p_decision is null or p_record_kind not in ('cycle','activity','knowledge') or p_decision not in ('approved','needs_changes') then raise exception 'Revisão inválida.'; end if;
  if p_decision='needs_changes' and nullif(btrim(p_reason),'') is null then raise exception 'Justificativa obrigatória.'; end if;
  v_table:=case p_record_kind when 'cycle' then 'fec_cycles' when 'activity' then 'fec_activities' else 'fec_knowledge_records' end;
  if p_record_kind='cycle' then
    select engagement_id,owner_id,status into v_scope,v_owner,v_status from public.fec_cycles where id=p_record_id for update;
  else
    execute format('select c.engagement_id,r.owner_id,r.status from public.%I r join public.fec_cycles c on c.id=r.cycle_id where r.id=$1 for update of r',v_table) into v_scope,v_owner,v_status using p_record_id;
  end if;
  if v_owner is null or v_owner=auth.uid() or not private.fec_has_assignment(v_scope,'supervisor') or not private.fec_scope_is_active(v_scope) then raise exception 'Supervisão independente e aditivo ativo obrigatórios.'; end if;
  if v_status<>'submitted' and not(v_status='approved' and p_decision='needs_changes' and p_record_kind<>'knowledge') then raise exception 'Registro precisa estar enviado. Produtos aprovados exigem nova versão.'; end if;
  execute format('update public.%I set status=$1,reviewed_by=auth.uid(),reviewed_at=now(),review_notes=$2 where id=$3',v_table) using p_decision,p_reason,p_record_id;
end; $$;
create function public.fec_review_record(p_record_kind text,p_record_id uuid,p_decision text,p_reason text default null) returns void language sql security invoker set search_path='' as $$select private.fec_review_record($1,$2,$3,$4)$$;
revoke all on function public.fec_review_record(text,uuid,text,text) from public,anon;
grant execute on function public.fec_review_record(text,uuid,text,text) to authenticated;

create function private.fec_audit_record() returns trigger language plpgsql security definer set search_path='' as $$
declare v_scope uuid; v_kind text; v_event text;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória no histórico.'; end if;
  v_kind:=case tg_table_name when 'fec_cycles' then 'cycle' when 'fec_activities' then 'activity' else 'knowledge' end;
  if v_kind='cycle' then v_scope:=new.engagement_id; else select engagement_id into v_scope from public.fec_cycles where id=new.cycle_id; end if;
  v_event:=case when tg_op='INSERT' then 'created' when old.status is distinct from new.status then new.status else 'edited' end;
  if v_event='draft' then v_event:='edited'; end if;
  insert into public.fec_review_log(engagement_id,record_kind,record_id,decision,reason,reviewer_id) values(v_scope,v_kind,new.id,v_event,case when v_event in ('approved','needs_changes') then new.review_notes else null end,auth.uid());
  return new;
end; $$;
revoke all on function private.fec_audit_record() from public,anon,authenticated;
create trigger fec_audit_cycle after insert or update on public.fec_cycles for each row execute function private.fec_audit_record();
create trigger fec_audit_activity after insert or update on public.fec_activities for each row execute function private.fec_audit_record();
create trigger fec_audit_knowledge after insert or update on public.fec_knowledge_records for each row execute function private.fec_audit_record();

-- Anexos identificados pelo produto; bucket e objetos sempre privados.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fec-technical-private','fec-technical-private',false,10485760,array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create table public.fec_knowledge_files (
  id uuid primary key default gen_random_uuid(), record_id uuid not null references public.fec_knowledge_records(id) on delete restrict,
  object_name text not null unique, title text not null check(length(btrim(title)) between 1 and 180),
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
  check(split_part(object_name,'/',1)=record_id::text)
);
create index fec_files_record_idx on public.fec_knowledge_files(record_id);
alter table public.fec_knowledge_files enable row level security;
revoke all on public.fec_knowledge_files from public,anon,authenticated;
grant select,insert on public.fec_knowledge_files to authenticated;
grant all on public.fec_knowledge_files to service_role;
create function private.fec_can_access_file(p_name text,p_write boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.fec_knowledge_records k where k.id::text=split_part(p_name,'/',1) and case when p_write then k.owner_id=auth.uid() and k.status in ('draft','needs_changes') and public.fec_can_edit_cycle(k.cycle_id) else public.fec_can_read_cycle(k.cycle_id) end)
$$;
revoke all on function private.fec_can_access_file(text,boolean) from public,anon;
grant execute on function private.fec_can_access_file(text,boolean) to authenticated;
create policy fec_files_read on public.fec_knowledge_files for select to authenticated using(private.fec_can_access_file(object_name));
create policy fec_files_create on public.fec_knowledge_files for insert to authenticated with check(created_by=auth.uid() and private.fec_can_access_file(object_name,true) and exists(select 1 from storage.objects where bucket_id='fec-technical-private' and name=object_name));
create policy fec_storage_read on storage.objects for select to authenticated using(bucket_id='fec-technical-private' and private.fec_can_access_file(name));
create policy fec_storage_create on storage.objects for insert to authenticated with check(bucket_id='fec-technical-private' and private.fec_can_access_file(name,true));
create policy fec_storage_read_boundary on storage.objects as restrictive for select to authenticated using(bucket_id<>'fec-technical-private' or private.fec_can_access_file(name));
create policy fec_storage_insert_boundary on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'fec-technical-private' or private.fec_can_access_file(name,true));
create policy fec_storage_update_boundary on storage.objects as restrictive for update to authenticated using(bucket_id<>'fec-technical-private') with check(bucket_id<>'fec-technical-private');
create policy fec_storage_delete_boundary on storage.objects as restrictive for delete to authenticated using(bucket_id<>'fec-technical-private');
create policy fec_storage_anon_boundary on storage.objects as restrictive for all to anon using(bucket_id<>'fec-technical-private') with check(bucket_id<>'fec-technical-private');
-- Sem UPDATE/DELETE: substituições são novos objetos/versões; arquivos revisados ficam preservados.
commit;
