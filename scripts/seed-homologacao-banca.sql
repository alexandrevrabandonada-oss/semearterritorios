-- DEV/DEMO ONLY: seed controlado para homologacao da primeira Banca de Escuta.
-- NÃO RODAR EM PRODUÇÃO.
-- Nao mistura com seed real.
-- Uso local sugerido:
--   psql "$DATABASE_URL" -f scripts/seed-homologacao-banca.sql

insert into public.themes (name, description)
values
  ('ar/poluição', 'Menções sobre qualidade do ar, fumaça, fuligem ou poluição.'),
  ('calor', 'Menções sobre calor e desconforto térmico.'),
  ('árvores/sombra', 'Menções sobre arborização e sombra.'),
  ('lixo/resíduos', 'Menções sobre descarte, coleta e resíduos.'),
  ('água/rio', 'Menções sobre água, drenagem ou córregos.'),
  ('poder público', 'Menções sobre serviços públicos.'),
  ('qualidade de vida', 'Menções sobre cotidiano e bem-estar.'),
  ('inesperado/outro', 'Tema aberto para registros inesperados.')
on conflict (name) do nothing;

do $$
declare
  bairro_id uuid;
  acao_id uuid;
  record_id uuid;
  falas text[] := array[
    'Falta sombra perto das barracas e o calor incomoda bastante.',
    'A coleta de lixo precisa acontecer logo depois da feira.',
    'Quando chove, a água fica parada no canto da praça.',
    'A feira ajuda o bairro porque aproxima os vizinhos.',
    'Seria bom ter mais árvores e bancos para descanso.',
    'A poeira sobe quando passam carros perto das barracas.',
    'A iluminação melhorou, mas alguns pontos seguem escuros.',
    'A prioridade é organizar melhor o descarte dos resíduos.',
    'A pessoa mencionou o telefone ficticio 00000-0000 para testar alerta.',
    'Tem muita gente idosa que precisa de sombra e assento.',
    'O ponto de ônibus perto da feira fica cheio e sem abrigo.',
    'A devolutiva deve mostrar o que foi ouvido sem expor ninguém.'
  ];
  prioridades text[] := array[
    'sombra',
    'coleta de lixo',
    'drenagem',
    'convivência',
    'arborização',
    'reduzir poeira',
    'iluminação',
    'resíduos',
    'revisar dado sensível fictício',
    'sombra e assento',
    'abrigo no ponto',
    'devolutiva pública'
  ];
  tema_nome text;
begin
  insert into public.neighborhoods (name, city, notes)
  values ('Bairro Homologação Feira', 'Cidade Demo', 'Bairro fictício para homologação DEV/DEMO.')
  on conflict (name) do update set notes = excluded.notes
  returning id into bairro_id;

  insert into public.actions (
    title,
    action_type,
    action_date,
    neighborhood_id,
    location_reference,
    objective,
    team,
    estimated_public,
    summary,
    status,
    notes
  )
  values (
    'Homologação — Banca de Escuta Feira Livre',
    'banca_escuta',
    current_date,
    bairro_id,
    'Feira livre fictícia de homologação',
    'Validar fluxo operacional com dados fictícios.',
    'Equipe de homologação SEMEAR',
    30,
    'Ação fictícia para homologação do fluxo completo.',
    'realizada',
    'DEV/DEMO: não usar como dado real.'
  )
  returning id into acao_id;

  for i in 1..array_length(falas, 1) loop
    insert into public.listening_records (
      action_id,
      neighborhood_id,
      date,
      source_type,
      interviewer_name,
      approximate_age_range,
      free_speech_text,
      team_summary,
      words_used,
      places_mentioned_text,
      priority_mentioned,
      unexpected_notes,
      review_status
    )
    values (
      acao_id,
      bairro_id,
      current_date,
      'feira',
      'Equipe demo',
      null,
      falas[i],
      case when i <= 7 then 'Resumo fictício revisado, sem dado pessoal.' else null end,
      prioridades[i],
      case when i in (3, 4, 10) then 'praça da feira' else 'feira livre' end,
      prioridades[i],
      case when i in (4, 12) then 'Registro inesperado fictício para homologação.' else null end,
      case when i <= 7 then 'reviewed' else 'draft' end
    )
    returning id into record_id;

    tema_nome := case
      when i in (1, 5, 10, 11) then 'árvores/sombra'
      when i in (2, 8) then 'lixo/resíduos'
      when i = 3 then 'água/rio'
      when i = 6 then 'ar/poluição'
      when i = 7 then 'poder público'
      when i = 9 then 'inesperado/outro'
      else 'qualidade de vida'
    end;

    insert into public.listening_record_themes (listening_record_id, theme_id, notes)
    select record_id, id, 'Tema fictício de homologação'
    from public.themes
    where name = tema_nome
    limit 1;
  end loop;
end $$;
