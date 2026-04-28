insert into public.themes (name, description)
values
  ('ar/poluição', 'Menções sobre qualidade do ar, fumaça, fuligem ou poluição.'),
  ('pó/sujeira', 'Menções sobre pó, sujeira acumulada ou resíduos no cotidiano.'),
  ('saúde', 'Menções coletivas sobre saúde e bem-estar sem dados individuais identificáveis.'),
  ('calor', 'Menções sobre calor, sensação térmica ou desconforto ambiental.'),
  ('árvores/sombra', 'Menções sobre arborização, sombra, praças e conforto ambiental.'),
  ('água/rio', 'Menções sobre água, rios, córregos, enchentes ou drenagem.'),
  ('lixo/resíduos', 'Menções sobre lixo, descarte, coleta e resíduos.'),
  ('abandono', 'Menções sobre abandono, falta de cuidado ou ausência de manutenção.'),
  ('poder público', 'Menções sobre prefeitura, Estado, serviços públicos ou políticas públicas.'),
  ('empresas', 'Menções sobre empresas, atividade econômica e responsabilidades privadas.'),
  ('qualidade de vida', 'Menções amplas sobre bem-estar, cotidiano e condições de vida.'),
  ('não percebe problema', 'Registro quando a pessoa não identifica problema no tema perguntado.'),
  ('inesperado/outro', 'Tema aberto para falas que não cabem nos marcadores iniciais.')
on conflict (name) do nothing;
