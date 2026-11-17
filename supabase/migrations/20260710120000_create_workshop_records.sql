-- Tijolo 073: oficina é um registro coletivo, separado de escutas individuais.
create table if not exists public.workshop_records (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.actions(id) on delete cascade,
  workshop_date date,
  facilitator_team_member_id uuid references public.team_members(id) on delete set null,
  rapporteur_team_member_id uuid references public.team_members(id) on delete set null,
  participants_estimated integer check (participants_estimated is null or participants_estimated >= 0),
  participant_profile text, territories_represented text, objective text, methodology text,
  activities_done text, collective_diagnosis text, main_conclusions text, consensus_points text,
  disagreements_or_tensions text, proposals text, priorities text, agreements text, next_steps text,
  materials_produced text, places_mentioned text, themes text, privacy_notes text,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','approved','archived')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.ensure_workshop_record_action_type()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.actions where id = new.action_id and action_type = 'oficina') then
    raise exception 'workshop_records exige ação do tipo oficina';
  end if;
  return new;
end;
$$;
create trigger workshop_records_action_type before insert or update of action_id on public.workshop_records
for each row execute function public.ensure_workshop_record_action_type();

alter table public.workshop_records enable row level security;
create policy "Autenticados leem registros de oficina" on public.workshop_records for select to authenticated using (true);
create policy "Equipe cria próprio rascunho de oficina" on public.workshop_records for insert to authenticated
  with check (public.get_user_role() in ('admin','coordenacao','equipe') and created_by = auth.uid() and status = 'draft');
create policy "Equipe edita próprio rascunho; coordenação revisa" on public.workshop_records for update to authenticated
  using (public.get_user_role() in ('admin','coordenacao') or (public.get_user_role() = 'equipe' and created_by = auth.uid() and status in ('draft','submitted')))
  with check (public.get_user_role() in ('admin','coordenacao') or (created_by = auth.uid() and status in ('draft','submitted')));
