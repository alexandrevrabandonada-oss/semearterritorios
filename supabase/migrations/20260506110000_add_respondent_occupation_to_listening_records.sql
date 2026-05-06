-- Tijolo 041 — Ocupação / atividade principal do entrevistado
--
-- Campo opcional para leitura agregada de perfis ocupacionais,
-- sem coleta de empregador, local de trabalho específico ou cargo identificável.

ALTER TABLE listening_records
  ADD COLUMN IF NOT EXISTS respondent_occupation text NULL;

COMMENT ON COLUMN listening_records.respondent_occupation IS
  'Ocupação/atividade principal em nível geral (ex.: estudante, aposentado, comércio). Não informar empresa, escola, setor específico ou local de trabalho.';

CREATE INDEX IF NOT EXISTS idx_listening_records_respondent_occupation
  ON listening_records (respondent_occupation);
