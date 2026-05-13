# Validação Remota da Auditoria de Falas — Tijolo 068

**Data:** 2026-05-11  
**Projeto Supabase:** gtpitwhslqjgbuwlsaqg  
**Objetivo:** comprovar deploy remoto da auditoria de falas e validar funcionamento em produção.

## 1) Status da migration remota

Validação por CLI:

- `supabase migration list --db-url ...` antes do push: havia pendências até `20260511170000`.
- `supabase db push --db-url ... --include-all --yes`: aplicado com sucesso.
- `supabase migration list --db-url ...` após push: local = remoto.

Migrations aplicadas no remoto nesta execução:

- `20260508100000_report_import_fields.sql`
- `20260509100000_add_extraction_quality.sql`
- `20260509110000_weekly_report_pilot_reviews.sql`
- `20260511000000_listening_record_field_audits.sql`
- `20260511113000_add_territorial_risk_override_to_transparency.sql`
- `20260511150000_create_listening_record_public_quotes.sql`
- `20260511170000_public_quote_audits_and_required_reasons.sql`

## 2) Achados críticos encontrados no remoto

Durante o smoke técnico, surgiram dois problemas de produção:

1. `public.public_quote_has_critical_risk` com regex no estilo JavaScript (`(?:...)`) inválida em PostgreSQL.
2. Trigger `BEFORE INSERT` gravando auditoria antes da linha existir, causando violação de FK `listening_record_public_quote_audits_quote_id_fkey`.

## 3) Correções versionadas aplicadas

Foram criadas e aplicadas migrations corretivas:

- `20260511200000_fix_public_quote_risk_regex.sql`
  - reescreve regex para sintaxe compatível com PostgreSQL.
- `20260511203000_make_quote_audit_fk_deferrable.sql`
  - torna a FK `listening_record_public_quote_audits_quote_id_fkey` em `DEFERRABLE INITIALLY DEFERRED`.

Após isso, `supabase migration list --db-url ...` confirmou as duas no remoto.

## 4) Validação técnica automatizada em produção

Script executado:

- `scripts/validate_public_quotes_audit_remote.mjs`

Resultado final:

- OK: colunas novas em `listening_record_public_quotes` acessíveis (`public_approval_reason`, `rejection_reason`, `archive_reason`, `last_edit_reason`)
- OK: tabela `listening_record_public_quote_audits` acessível
- OK: trigger validado por efeito (`sent_to_review` gerado após mudança de status)
- OK: os 11 `event_type` aceitos
- OK: `event_type` inválido bloqueado pela constraint
- OK: `anon` não enxerga registro conhecido de auditoria
- OK: cleanup de quote técnico executado

## 5) RLS da auditoria

Evidência funcional coletada:

- `anon` não acessa registro conhecido de auditoria.

Limite de validação nesta sessão:

- Não foi possível validar com token real de `authenticated/equipe/coordenacao/admin` (faltam credenciais de login de usuários reais nesta sessão).

## 6) Trigger e fluxo editorial

Evidência coletada:

- Mudança de status para `needs_review` gerou evento de auditoria correspondente.

Limites de validação nesta sessão:

- Aprovação pública com usuário real `coordenacao/admin` não foi executada por ausência de sessão autenticada real de frontend.

## 7) Rotas solicitadas

Rotas estão presentes no build do app:

- `/escutas/falas`
- `/escutas/falas/[id]`
- `/acoes/[id]/dossie`
- `/acoes/[id]/devolutiva`

Limite nesta sessão:

- Não houve execução de navegação autenticada real em produção nessas rotas (falta credencial de usuário operacional).

## 8) Conclusão

- Deploy remoto da auditoria de falas: **concluído**.
- Produção: **estável após duas correções versionadas**.
- Schema e trilha de auditoria: **validados tecnicamente**.
- Validação de papéis reais (`equipe`, `coordenacao/admin`) permanece como etapa operacional assistida por login real.
