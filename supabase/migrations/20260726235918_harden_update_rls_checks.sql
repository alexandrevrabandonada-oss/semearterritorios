-- Garante que a linha após UPDATE ainda atende à mesma regra que autorizou
-- sua edição. Evita troca de autor ou de propriedade por usuários da equipe.

alter policy "Apenas admin e coordenação podem editar bairros"
  on public.neighborhoods
  with check (public.get_user_role() in ('admin', 'coordenacao'));

alter policy "Equipe edita próprias ações; admin e coordenação editam qualquer uma"
  on public.actions
  with check (
    public.get_user_role() in ('admin', 'coordenacao')
    or (public.get_user_role() = 'equipe' and created_by = auth.uid())
  );

alter policy "Equipe edita próprias escutas; admin e coordenação editam qualquer uma"
  on public.listening_records
  with check (
    public.get_user_role() in ('admin', 'coordenacao')
    or (public.get_user_role() = 'equipe' and created_by = auth.uid())
  );

alter policy "Admin e coordenacao podem atualizar temas"
  on public.themes
  with check (public.get_user_role() in ('admin', 'coordenacao'));

alter policy "Equipe edita próprios vínculos; admin e coordenação editam qualquer um"
  on public.listening_record_themes
  with check (
    public.get_user_role() in ('admin', 'coordenacao')
    or (public.get_user_role() = 'equipe' and created_by = auth.uid())
  );

alter policy "Equipe edita próprios lugares; admin/coordenação editam qualquer um"
  on public.places_mentioned
  with check (
    public.get_user_role() in ('admin', 'coordenacao')
    or (public.get_user_role() = 'equipe' and created_by = auth.uid())
  );

alter policy "Apenas admin e coordenação podem editar relatórios"
  on public.monthly_reports
  with check (public.get_user_role() in ('admin', 'coordenacao'));
