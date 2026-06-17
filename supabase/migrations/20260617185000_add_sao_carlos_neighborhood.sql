-- Migration para adicionar o bairro "São Carlos"
-- Bairros/territórios são agregações para leitura territorial, não localização individual de pessoas.

insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)
values
  ('São Carlos', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 55, null, 'Adicionado via solicitação do usuário. Setor Sudoeste.', 'oficial')
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
