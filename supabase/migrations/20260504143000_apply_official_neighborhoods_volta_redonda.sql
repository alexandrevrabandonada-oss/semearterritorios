-- Aplicação versionada da lista oficial de bairros de Volta Redonda.
-- Fonte: supabase/seeds/neighborhoods.official.csv, conferido contra mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf.
-- Esta migration NÃO apaga bairros, NÃO limpa registros operacionais e NÃO geocodifica.
-- Bairros/territórios são agregações para leitura territorial, não localização individual de pessoas.
-- Grafias preservadas conforme leitura do PDF: Jardim Suiça e Santa Inez permanecem com pendência registrada em notes.
-- Usa on conflict (name), que é a constraint única real do schema atual.

with official(name, city, region, sector, official_code, aliases, notes, status) as (
  values
  ('Aero Clube', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 2, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Barreira Cravo', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 5, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Belo Horizonte', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 43, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Niterói', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 22, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Retiro', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 24, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('São João Batista', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 26, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Vila Brasília', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 39, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Vila Mury', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 40, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Voldac', 'Volta Redonda', 'Setor Centro Norte', 'SCN', 42, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Açude', 'Volta Redonda', 'Setor Oeste', 'SO', 1, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Belmonte', 'Volta Redonda', 'Setor Oeste', 'SO', 7, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Belmonte', 'Volta Redonda', 'Setor Oeste', 'SO', 50, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Padre Josimo Tavares', 'Volta Redonda', 'Setor Oeste', 'SO', 45, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Siderlândia', 'Volta Redonda', 'Setor Oeste', 'SO', 49, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Santa Cruz II', 'Volta Redonda', 'Setor Norte', 'SN', 48, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Candelária', 'Volta Redonda', 'Setor Norte', 'SN', 9, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Dom Bosco', 'Volta Redonda', 'Setor Norte', 'SN', 12, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Pinto da Serra', 'Volta Redonda', 'Setor Norte', 'SN', 47, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Santa Cruz', 'Volta Redonda', 'Setor Norte', 'SN', 44, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Santa Rita do Zarur', 'Volta Redonda', 'Setor Norte', 'SN', 33, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('São Luiz', 'Volta Redonda', 'Setor Norte', 'SN', 31, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Água Limpa', 'Volta Redonda', 'Setor Leste', 'SL', 3, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Brasilândia', 'Volta Redonda', 'Setor Leste', 'SL', 8, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Santo Agostinho', 'Volta Redonda', 'Setor Leste', 'SL', 34, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Três Poços', 'Volta Redonda', 'Setor Leste', 'SL', 37, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Vila Americana', 'Volta Redonda', 'Setor Leste', 'SL', 38, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Vila Rica', 'Volta Redonda', 'Setor Leste', 'SL', 46, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Casa de Pedra', 'Volta Redonda', 'Setor Sul', 'SS', 10, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Belvedere', 'Volta Redonda', 'Setor Sul', 'SS', 14, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Siderópolis', 'Volta Redonda', 'Setor Sul', 'SS', 36, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Aterrado', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 4, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Bela Vista', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 6, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Amália', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 15, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Paraíba', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 52, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Laranjal', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 18, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Monte Castelo', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 20, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Nossa Senhora das Graças', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 21, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('São Geraldo', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 28, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('São João', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 29, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Sessenta', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 35, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Vila Santa Cecília', 'Volta Redonda', 'Setor Centro Sul', 'SCS', 41, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Duzentos e Quarenta e Nove', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 51, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Conforto', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 11, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Eucaliptal', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 13, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Europa', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 16, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Jardim Suiça', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 17, null, 'Grafia lida no PDF como Jardim Suiça; conferir se a grafia oficial desejada pela APS mantém ou ajusta o acento.', 'oficial'),
  ('Minerlândia', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 19, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Ponte Alta', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 23, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Rústico', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 25, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('Santa Inez', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 32, null, 'Grafia lida no PDF como Santa Inez; conferir se a grafia oficial atual mantém z ou usa s.', 'oficial'),
  ('São Cristóvão', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 27, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial'),
  ('São Lucas', 'Volta Redonda', 'Setor Sudoeste', 'SSO', 30, null, 'Extraído de mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf; conferir visualmente antes de aplicar no banco.', 'oficial')
)
insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)
select name, city, region, sector, official_code, aliases, notes, status
from official
on conflict (name) do update
set city = excluded.city,
    region = excluded.region,
    sector = excluded.sector,
    official_code = excluded.official_code,
    aliases = excluded.aliases,
    notes = excluded.notes,
    status = excluded.status,
    updated_at = now();
