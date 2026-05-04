-- Campos estruturados para metadados oficiais de bairros/territórios.
-- Não altera RLS, não apaga dados e não geocodifica.

alter table public.neighborhoods
  add column if not exists official_code integer,
  add column if not exists sector text,
  add column if not exists region text,
  add column if not exists aliases text,
  add column if not exists status text default 'provisorio';

alter table public.neighborhoods
  drop constraint if exists neighborhoods_status_check,
  add constraint neighborhoods_status_check
    check (status is null or status in ('oficial', 'provisorio', 'revisar', 'nao_usar'));

alter table public.neighborhoods
  drop constraint if exists neighborhoods_sector_check,
  add constraint neighborhoods_sector_check
    check (sector is null or sector in ('SCN', 'SO', 'SN', 'SL', 'SS', 'SCS', 'SSO'));

create unique index if not exists neighborhoods_official_code_unique_idx
  on public.neighborhoods (official_code)
  where official_code is not null;

comment on column public.neighborhoods.official_code is 'Código oficial do bairro na relação oficial de Volta Redonda. Não representa coordenada nem localização individual.';
comment on column public.neighborhoods.sector is 'Sigla do setor oficial: SCN, SO, SN, SL, SS, SCS ou SSO.';
comment on column public.neighborhoods.region is 'Nome do setor oficial usado para agregação territorial.';
comment on column public.neighborhoods.aliases is 'Nomes alternativos/apelidos validados pela equipe territorial, quando houver.';
comment on column public.neighborhoods.status is 'Status operacional da lista territorial: oficial, provisorio, revisar ou nao_usar.';
