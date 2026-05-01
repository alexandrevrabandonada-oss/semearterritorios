insert into public.neighborhoods (name, city, notes)
values
  ('Zona Sul', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Zona Oeste', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Vila Nova', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Vila Esperanca', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Vila Uniao', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Jardim Primavera', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Jardim das Flores', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Jardim Planalto', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Jardim Alvorada', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Parque Verde', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Parque Central', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Parque Industrial', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Santa Cruz', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Sao Jose', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Santo Antonio', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Novo Horizonte', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Alto da Serra', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Boa Vista', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Bela Vista', 'Cidade Base', 'Territorio operacional inicial.'),
  ('Morada Nova', 'Cidade Base', 'Territorio operacional inicial.')
on conflict (name) do nothing;
