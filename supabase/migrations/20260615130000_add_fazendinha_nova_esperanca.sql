-- Migration para adicionar os bairros "Fazendinha" e "Nova Esperança"
-- Bairros/territórios são agregações para leitura territorial, não localização individual de pessoas.

insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)
values
  ('Fazendinha', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 53, null, 'Adicionado via solicitação do usuário. Faz parte da área de Vila Brasília (não oficial no PDF, mas operacionalizado).', 'oficial'),
  ('Nova Esperança', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 54, null, 'Adicionado via solicitação do usuário. Setor Centro Norte.', 'oficial')
on conflict (name) do update
set
  city = excluded.city,
  region = excluded.region,
  sector = excluded.sector,
  official_code = excluded.official_code,
  aliases = excluded.aliases,
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();
