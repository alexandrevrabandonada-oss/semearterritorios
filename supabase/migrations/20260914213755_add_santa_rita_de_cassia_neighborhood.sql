-- Adiciona Santa Rita de Cássia à lista operacional de bairros.
-- O bairro é uma agregação territorial para leitura, nunca localização individual.

insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)
values
  (
    'Santa Rita de Cássia',
    'Volta Redonda',
    'Setor Oeste',
    'SO',
    57,
    'Santa Rita de Cassia',
    'Adicionado via solicitação do usuário. Setor Oeste; código sequencial da lista operacional.',
    'oficial'
  )
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
