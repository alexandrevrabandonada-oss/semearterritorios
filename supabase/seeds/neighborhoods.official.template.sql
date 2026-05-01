-- TEMPLATE: lista oficial de bairros/territorios.
-- Objetivo: substituir seeds operacionais por nomes oficiais do territorio de atuacao.
-- Uso sugerido:
-- 1) Copiar este arquivo para uma migration com timestamp novo em supabase/migrations/.
-- 2) Preencher a lista abaixo com os nomes oficiais.
-- 3) Aplicar com: npx supabase db push --db-url "<SUA_DB_URL>" --include-all --yes
--
-- Observacao: este script faz upsert por nome e nao remove bairros antigos.
-- Se precisar limpar bairros de seed operacional, faca em migration separada e validada.

insert into public.neighborhoods (name, city, notes)
values
  ('EXEMPLO BAIRRO 1', 'EXEMPLO CIDADE', 'Lista oficial APS'),
  ('EXEMPLO BAIRRO 2', 'EXEMPLO CIDADE', 'Lista oficial APS'),
  ('EXEMPLO BAIRRO 3', 'EXEMPLO CIDADE', 'Lista oficial APS')
on conflict (name) do update
set
  city = excluded.city,
  notes = excluded.notes;
