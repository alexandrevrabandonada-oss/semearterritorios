-- DEV/DEMO ONLY: dados ficticios para testar o piloto da primeira Banca de Escuta.
-- Uso local sugerido:
--   supabase db reset --local
--   psql "$DATABASE_URL" -f scripts/seed-demo-banca.sql
-- Nao executar em producao e nao misturar com carga real.

insert into public.themes (name, description)
values
  ('ar/poluição', 'Menções sobre qualidade do ar, fumaça, fuligem ou poluição.'),
  ('calor', 'Menções sobre calor, sensação térmica ou desconforto ambiental.'),
  ('árvores/sombra', 'Menções sobre arborização, sombra, praças e conforto ambiental.'),
  ('lixo/resíduos', 'Menções sobre lixo, descarte, coleta e resíduos.'),
  ('água/rio', 'Menções sobre água, rios, córregos, enchentes ou drenagem.'),
  ('poder público', 'Menções sobre prefeitura, Estado, serviços públicos ou políticas públicas.'),
  ('qualidade de vida', 'Menções amplas sobre bem-estar, cotidiano e condições de vida.'),
  ('inesperado/outro', 'Tema aberto para falas que não cabem nos marcadores iniciais.')
on conflict (name) do nothing;

do $$
declare
  bairro_id uuid;
  acao_id uuid;
  falas text[] := array[
    'Na feira falta sombra e fica muito quente perto das barracas.',
    'Quando chove a agua fica parada na rua da feira.',
    'O lixo acumula depois do movimento e demora para recolher.',
    'Seria bom ter mais arvores e banco para descansar.',
    'A poeira incomoda quando passa carro no entorno.',
    'A feira e importante, mas precisa de banheiro e limpeza.',
    'Tem muita gente idosa que sofre com o calor.',
    'A praca ao lado poderia ter mais cuidado.',
    'O cheiro do lixo aparece no fim da manha.',
    'A iluminacao ajuda, mas alguns pontos ficam escuros cedo.',
    'Falta sinalizacao para atravessar com seguranca.',
    'As criancas ficam sem lugar protegido do sol.',
    'A coleta de residuos deveria acontecer logo apos a feira.',
    'Quando venta, a sujeira espalha nas barracas.',
    'O espaco e bom para conversar com vizinhos.',
    'Muita gente pede sombra perto do ponto de onibus.',
    'A canaleta entope e a agua volta para a calcada.',
    'A feira melhora a vida do bairro, so precisa organizacao.',
    'O barulho preocupa menos que o lixo acumulado.',
    'Seria bom uma devolutiva mostrando o que foi ouvido.'
  ];
  prioridades text[] := array[
    'mais sombra',
    'drenagem da agua',
    'limpeza apos a feira',
    'arborizacao',
    'reduzir poeira',
    'banheiro e limpeza',
    'cuidado com pessoas idosas',
    'manutencao da praca',
    'coleta de residuos',
    'iluminacao',
    'travessia segura',
    'protecao contra sol',
    'coleta rapida',
    'limpeza das barracas',
    'manter espaco de encontro',
    'sombra no ponto',
    'desentupir canaleta',
    'organizacao da feira',
    'lixo acumulado',
    'devolutiva publica'
  ];
  tema_nome text;
  record_id uuid;
begin
  insert into public.neighborhoods (name, city, notes)
  values ('Bairro Demo da Feira', 'Cidade Demo', 'Bairro ficticio para seed DEV/DEMO.')
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
    'Banca de Escuta — Feira Livre',
    'banca_escuta',
    current_date,
    bairro_id,
    'Feira livre central do bairro demo',
    'Testar fluxo controlado de digitacao, revisao e devolutiva.',
    'Equipe demo SEMEAR',
    60,
    'Acao ficticia para piloto local.',
    'realizada',
    'DEV/DEMO: nao usar como dado real.'
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
      case when i <= 12 then 'Resumo demo sem dado pessoal.' else null end,
      prioridades[i],
      case when i % 3 = 0 then 'entorno da feira' else 'feira livre' end,
      prioridades[i],
      case when i in (15, 20) then 'Observacao demo para devolutiva.' else null end,
      case when i <= 12 then 'reviewed' else 'draft' end
    )
    returning id into record_id;

    tema_nome := case
      when i in (1, 4, 7, 12, 16) then 'árvores/sombra'
      when i in (2, 17) then 'água/rio'
      when i in (3, 9, 13, 14, 19) then 'lixo/resíduos'
      when i in (5) then 'ar/poluição'
      when i in (10, 11, 18) then 'poder público'
      else 'qualidade de vida'
    end;

    insert into public.listening_record_themes (listening_record_id, theme_id, notes)
    select record_id, id, 'Tema demo'
    from public.themes
    where name = tema_nome
    limit 1;
  end loop;
end $$;
