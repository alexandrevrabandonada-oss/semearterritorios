create table if not exists public.listening_record_field_audits (
  id uuid primary key default gen_random_uuid(),
  listening_record_id uuid not null references public.listening_records(id) on delete cascade,
  field_name text not null check (field_name in ('respondent_neighborhood_id', 'respondent_city', 'respondent_territory_relation')),
  old_value text,
  new_value text,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists listening_record_field_audits_listening_record_id_idx
on public.listening_record_field_audits (listening_record_id, changed_at desc);

create index if not exists listening_record_field_audits_field_name_idx
on public.listening_record_field_audits (field_name, changed_at desc);

create index if not exists listening_record_field_audits_changed_by_idx
on public.listening_record_field_audits (changed_by);

alter table public.listening_record_field_audits enable row level security;

-- Anon sem acesso
create policy "Anon sem acesso auditoria escutas"
on public.listening_record_field_audits for all to anon
using (false);

-- Equipe pode ler conforme acesso à escuta
create policy "Equipe lê auditoria de escutas conforme acesso"
on public.listening_record_field_audits for select to authenticated
using (
  listening_record_id in (
    select id from public.listening_records lr
    where lr.action_id in (
      select id from public.actions a
      where a.created_by = auth.uid() or a.created_by in (
        select team_member_id from public.action_team_members
        where action_id = a.id and team_member_id = auth.uid()
      )
    )
  )
);

-- Coordenação e admin podem auditar
create policy "Admin audita todas as alteracoes"
on public.listening_record_field_audits for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));

-- Inserts seguem regras de edição de escutas
create policy "Equipe registra alteracoes em escutas proprias"
on public.listening_record_field_audits for insert to authenticated
with check (
  listening_record_id in (
    select id from public.listening_records lr
    where lr.action_id in (
      select id from public.actions a
      where a.created_by = auth.uid() or a.created_by in (
        select team_member_id from public.action_team_members
        where action_id = a.id and team_member_id = auth.uid()
      )
    )
  )
  and changed_by = auth.uid()
);
