-- Adiciona Nova Primavera à lista operacional de bairros.
-- O bairro é uma agregação territorial para leitura, nunca localização individual.

insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)
values
  ('Nova Primavera', 'Volta Redonda', 'Setor Leste', 'SL', 56, null, 'Adicionado via solicitação do usuário. Setor Leste; código sequencial da lista operacional.', 'oficial')
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
