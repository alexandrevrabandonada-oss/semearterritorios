insert into public.neighborhoods (name, city, notes)
values
  ('Centro', 'Cidade Genérica', 'Bairro de referência central'),
  ('Zona Leste', 'Cidade Genérica', 'Território de atuação primário'),
  ('Zona Norte', 'Cidade Genérica', 'Território de atuação secundário')
on conflict (name) do nothing;
