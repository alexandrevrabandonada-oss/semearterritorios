-- Tijolo 038: login Google com perfil obrigatório e RLS reforçado.
-- Objetivo: autenticação pode ocorrer via OAuth, mas autorização continua dependente de profiles.role.

alter table public.profiles
  alter column role drop default,
  alter column role drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- PROFILES
-- Sem perfil autorizado, o usuário só pode enxergar o próprio registro.
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Todos os autenticados podem ver perfis" on public.profiles;
drop policy if exists "Admins e Coordenação podem atualizar qualquer perfil, ou o próprio usuário" on public.profiles;

create policy "Usuário vê próprio perfil e equipe autorizada vê todos"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.get_user_role() in ('admin', 'coordenacao', 'equipe')
);

create policy "Apenas admin e coordenação atualizam perfis"
on public.profiles for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));

-- NEIGHBORHOODS
drop policy if exists "Leitura pública de bairros" on public.neighborhoods;
drop policy if exists "Autenticados podem ler bairros" on public.neighborhoods;
create policy "Somente perfis autorizados podem ler bairros"
on public.neighborhoods for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- ACTIONS
drop policy if exists "Autenticados podem ler ações" on public.actions;
create policy "Somente perfis autorizados podem ler ações"
on public.actions for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- LISTENING_RECORDS
drop policy if exists "Autenticados podem ler escutas" on public.listening_records;
create policy "Somente perfis autorizados podem ler escutas"
on public.listening_records for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- THEMES
drop policy if exists "Autenticados podem ler temas" on public.themes;
create policy "Somente perfis autorizados podem ler temas"
on public.themes for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- LISTENING_RECORD_THEMES
drop policy if exists "Autenticados podem ler temas da escuta" on public.listening_record_themes;
create policy "Somente perfis autorizados podem ler temas da escuta"
on public.listening_record_themes for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- PLACES_MENTIONED
drop policy if exists "Autenticados podem ler lugares mencionados" on public.places_mentioned;
create policy "Somente perfis autorizados podem ler lugares mencionados"
on public.places_mentioned for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- MONTHLY_REPORTS
drop policy if exists "Autenticados podem ler relatórios" on public.monthly_reports;
create policy "Somente perfis autorizados podem ler relatórios"
on public.monthly_reports for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- ACTION_DEBRIEFS
drop policy if exists "Autenticados podem ler devolutivas de ação" on public.action_debriefs;
create policy "Somente perfis autorizados podem ler devolutivas"
on public.action_debriefs for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- ACTION_CLOSURES
drop policy if exists "Autenticados podem ler fechamentos de ação" on public.action_closures;
create policy "Somente perfis autorizados podem ler fechamentos"
on public.action_closures for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));

-- INTERNAL_MAP_HOMOLOGATIONS
drop policy if exists "Autenticados podem ler homologações do mapa" on public.internal_map_homologations;
create policy "Somente perfis autorizados podem ler homologações do mapa"
on public.internal_map_homologations for select to authenticated
using (public.get_user_role() in ('admin', 'coordenacao', 'equipe'));
