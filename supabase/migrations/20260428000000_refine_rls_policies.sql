-- Função utilitária para pegar a role do usuário sem recursividade e de forma segura
create or replace function public.get_user_role()
returns text
language sql security definer stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- PROFILES
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Todos os autenticados podem ver perfis"
on public.profiles for select to authenticated using (true);

create policy "Admins e Coordenação podem atualizar qualquer perfil, ou o próprio usuário"
on public.profiles for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao') or id = auth.uid())
with check (public.get_user_role() in ('admin', 'coordenacao') or id = auth.uid());

-- NEIGHBORHOODS
drop policy if exists "Authenticated users can read neighborhoods" on public.neighborhoods;
drop policy if exists "Authenticated users can create neighborhoods" on public.neighborhoods;
drop policy if exists "Authenticated users can update neighborhoods" on public.neighborhoods;

create policy "Autenticados podem ler bairros" on public.neighborhoods for select to authenticated using (true);
create policy "Apenas admin e coordenação podem criar bairros" on public.neighborhoods for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao') and created_by = auth.uid());
create policy "Apenas admin e coordenação podem editar bairros" on public.neighborhoods for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao')) with check (true);

-- ACTIONS
drop policy if exists "Authenticated users can read actions" on public.actions;
drop policy if exists "Authenticated users can create actions" on public.actions;
drop policy if exists "Authenticated users can update actions" on public.actions;

create policy "Autenticados podem ler ações" on public.actions for select to authenticated using (true);
create policy "Autenticados não leitores podem criar ações" on public.actions for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao', 'equipe') and created_by = auth.uid());
create policy "Equipe edita próprias ações; admin e coordenação editam qualquer uma" on public.actions for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao') or (public.get_user_role() = 'equipe' and created_by = auth.uid()))
with check (true);

-- LISTENING RECORDS (Escutas)
-- NOTA DE SEGURANÇA: Dados de escuta são internos e confidenciais. Nunca devem ser expostos a usuários anônimos.
drop policy if exists "Authenticated users can read listening records" on public.listening_records;
drop policy if exists "Authenticated users can create listening records" on public.listening_records;
drop policy if exists "Authenticated users can update listening records" on public.listening_records;

create policy "Autenticados podem ler escutas" on public.listening_records for select to authenticated using (true);
create policy "Autenticados não leitores podem criar escutas" on public.listening_records for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao', 'equipe') and created_by = auth.uid());
create policy "Equipe edita próprias escutas; admin e coordenação editam qualquer uma" on public.listening_records for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao') or (public.get_user_role() = 'equipe' and created_by = auth.uid()))
with check (true);

-- THEMES
drop policy if exists "Authenticated users can read themes" on public.themes;
drop policy if exists "Authenticated users can create themes" on public.themes;
drop policy if exists "Authenticated users can update themes" on public.themes;

create policy "Autenticados podem ler temas" on public.themes for select to authenticated using (true);
create policy "Admin e coordenacao podem criar temas" on public.themes for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao'));
create policy "Admin e coordenacao podem atualizar temas" on public.themes for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao')) with check (true);

-- LISTENING RECORD THEMES
drop policy if exists "Authenticated users can read listening record themes" on public.listening_record_themes;
drop policy if exists "Authenticated users can create listening record themes" on public.listening_record_themes;
drop policy if exists "Authenticated users can update listening record themes" on public.listening_record_themes;

create policy "Autenticados podem ler temas da escuta" on public.listening_record_themes for select to authenticated using (true);
create policy "Autenticados não leitores podem associar temas" on public.listening_record_themes for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao', 'equipe') and created_by = auth.uid());
create policy "Equipe edita próprios vínculos; admin e coordenação editam qualquer um" on public.listening_record_themes for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao') or (public.get_user_role() = 'equipe' and created_by = auth.uid()))
with check (true);

-- PLACES MENTIONED
drop policy if exists "Authenticated users can read places mentioned" on public.places_mentioned;
drop policy if exists "Authenticated users can create places mentioned" on public.places_mentioned;
drop policy if exists "Authenticated users can update places mentioned" on public.places_mentioned;

create policy "Autenticados podem ler lugares mencionados" on public.places_mentioned for select to authenticated using (true);
create policy "Autenticados não leitores podem mencionar lugares" on public.places_mentioned for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao', 'equipe') and created_by = auth.uid());
create policy "Equipe edita próprios lugares; admin/coordenação editam qualquer um" on public.places_mentioned for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao') or (public.get_user_role() = 'equipe' and created_by = auth.uid()))
with check (true);

-- MONTHLY REPORTS
drop policy if exists "Authenticated users can read monthly reports" on public.monthly_reports;
drop policy if exists "Authenticated users can create monthly reports" on public.monthly_reports;
drop policy if exists "Authenticated users can update monthly reports" on public.monthly_reports;

create policy "Autenticados podem ler relatórios" on public.monthly_reports for select to authenticated using (true);
create policy "Apenas admin e coordenação podem criar relatórios" on public.monthly_reports for insert to authenticated 
with check (public.get_user_role() in ('admin', 'coordenacao') and created_by = auth.uid());
create policy "Apenas admin e coordenação podem editar relatórios" on public.monthly_reports for update to authenticated 
using (public.get_user_role() in ('admin', 'coordenacao')) with check (true);
