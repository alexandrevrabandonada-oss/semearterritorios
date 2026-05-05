-- Tijolo 039 — Território de Referência do Entrevistado
--
-- Adiciona três campos opcionais a listening_records para registrar
-- o território de referência do entrevistado sem coletar endereço pessoal.
--
-- Separação conceitual:
--   neighborhood_id            = território da ação (onde a banca aconteceu)
--   respondent_neighborhood_id = território de referência do entrevistado
--
-- Regras:
--   • Todos os campos são nullable — não obrigatório neste primeiro momento.
--   • respondent_neighborhood_id aponta apenas para bairros oficiais (validação
--     feita na aplicação via getOfficialNeighborhoodsForSelect).
--   • Se respondent_city não for Volta Redonda, respondent_neighborhood_id pode ficar nulo.
--   • Não armazena rua, número, CEP ou qualquer dado de endereço pessoal.

ALTER TABLE listening_records
  ADD COLUMN IF NOT EXISTS respondent_city             text          NULL,
  ADD COLUMN IF NOT EXISTS respondent_neighborhood_id  uuid          NULL
    REFERENCES neighborhoods (id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS respondent_territory_relation text        NULL;

COMMENT ON COLUMN listening_records.respondent_city IS
  'Município de referência do entrevistado. Default operacional: Volta Redonda. Não armazena endereço.';

COMMENT ON COLUMN listening_records.respondent_neighborhood_id IS
  'Bairro oficial de referência do entrevistado. Só bairros com status = oficial. Nulo quando município não é Volta Redonda ou não informado.';

COMMENT ON COLUMN listening_records.respondent_territory_relation IS
  'Vínculo do entrevistado com o território de referência. Valores: mora | trabalha_estuda | circula | fala_sobre | nao_informado.';

-- Índice para facilitar agregações por território de referência
CREATE INDEX IF NOT EXISTS idx_listening_records_respondent_neighborhood_id
  ON listening_records (respondent_neighborhood_id);
