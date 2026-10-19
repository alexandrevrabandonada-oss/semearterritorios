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
  if p_record_kind not in ('cycle','activity') or p_decision not in ('approved','needs_changes') then
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
);
create policy "fec_cycles_update_executor_open" on public.fec_cycles
for update to authenticated using (
  owner_id = auth.uid() and status in ('draft','needs_changes')
  and public.fec_has_assignment(engagement_id,'executor')
) with check (
  owner_id = auth.uid() and status in ('draft','submitted')
  and public.fec_has_assignment(engagement_id,'executor')
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
revoke all on function public.fec_has_assignment(uuid,text) from public;
revoke all on function public.fec_can_read_cycle(uuid) from public;
revoke all on function public.fec_can_edit_cycle(uuid) from public;
revoke all on function public.fec_review_record(text,uuid,text,text) from public;
grant execute on function public.fec_has_assignment(uuid,text) to authenticated;
grant execute on function public.fec_can_read_cycle(uuid) to authenticated;
grant execute on function public.fec_can_edit_cycle(uuid) to authenticated;
grant execute on function public.fec_review_record(text,uuid,text,text) to authenticated;

-- Intencionalmente nenhum SELECT publico, servico de upload ou API anonima.
-- Nao ha INSERT, UPDATE ou DELETE para fec_engagements/fec_access_grants na role authenticated.
commit;
