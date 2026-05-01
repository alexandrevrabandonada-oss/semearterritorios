-- TEMPLATE: limpeza segura de bairros operacionais.
-- Objetivo: remover bairros de seed operacional depois que a lista oficial estiver ativa.
--
-- Regra de seguranca:
-- - So remove bairros que NAO estao referenciados em actions, listening_records,
--   places_mentioned e normalized_places.
-- - Se existir referencia, o bairro e mantido.
--
-- Uso sugerido:
-- 1) Ajustar a lista de nomes no array abaixo.
-- 2) Copiar para uma migration nova em supabase/migrations/.
-- 3) Aplicar com: npx supabase db push --db-url "<SUA_DB_URL>" --include-all --yes

with candidatos as (
  select unnest(array[
    'Zona Sul',
    'Zona Oeste',
    'Vila Nova',
    'Vila Esperanca',
    'Vila Uniao',
    'Jardim Primavera',
    'Jardim das Flores',
    'Jardim Planalto',
    'Jardim Alvorada',
    'Parque Verde',
    'Parque Central',
    'Parque Industrial',
    'Santa Cruz',
    'Sao Jose',
    'Santo Antonio',
    'Novo Horizonte',
    'Alto da Serra',
    'Boa Vista',
    'Bela Vista',
    'Morada Nova'
  ]::text[]) as nome
),
alvos as (
  select n.id, n.name
  from public.neighborhoods n
  join candidatos c on c.nome = n.name
),
bloqueados as (
  select distinct a.id
  from alvos a
  join public.actions ac on ac.neighborhood_id = a.id
  union
  select distinct a.id
  from alvos a
  join public.listening_records lr on lr.neighborhood_id = a.id
  union
  select distinct a.id
  from alvos a
  join public.places_mentioned pm on pm.neighborhood_id = a.id
  union
  select distinct a.id
  from alvos a
  join public.normalized_places np on np.neighborhood_id = a.id
)
delete from public.neighborhoods n
using alvos a
where n.id = a.id
  and n.id not in (select id from bloqueados);
