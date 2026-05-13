# Estado da Nação — SEMEAR Territórios — Tijolo 068

**Data:** 2026-05-11  
**Status:** ✅ Concluído com correções remotas versionadas

## 1. Status da migration remota

- `supabase db push` executado no projeto remoto.
- `supabase migration list` confirmou sincronização local/remota.
- A migration de auditoria de falas (`20260511170000`) está aplicada em produção.

## 2. Validação do schema remoto

Validações automatizadas confirmadas:

- colunas novas em `listening_record_public_quotes` existem:
  - `public_approval_reason`
  - `rejection_reason`
  - `archive_reason`
  - `last_edit_reason`
- tabela `listening_record_public_quote_audits` existe
- trigger de workflow produz evento ao mudar status (`sent_to_review`)
- 11 `event_type` aceitos
- `event_type` inválido é bloqueado
- `anon` não enxerga registro conhecido da auditoria

## 3. Testes com coordenação/admin

Nesta sessão, não houve login real de usuário `coordenacao/admin` no frontend de produção.

Status:

- **Parcialmente validado por camada SQL/trigger** (mecânica de auditoria confirmada)
- **Pendente operacional**: fluxo completo com sessão real `coordenacao/admin` em UI

## 4. Testes com equipe

Nesta sessão, não houve login real de usuário `equipe`.

Status:

- **Pendente operacional**: validar sugestão de fala e bloqueio de `approved_public` para `equipe`

## 5. Testes com anon

Executado com chave `anon` via cliente Supabase:

- `anon` não conseguiu visualizar registro conhecido da tabela de auditoria.

## 6. Bloqueio sem justificativa

Não foi executado com sessão real `coordenacao/admin` no frontend nesta sessão.

Status:

- **Pendente operacional** na UI
- Regra segue implementada no trigger e na camada app

## 7. Bloqueio com risco crítico

Não foi executado com sessão real `coordenacao/admin` no frontend nesta sessão.

Status:

- **Pendente operacional** na UI
- Detector determinístico e guarda SQL ativos

## 8. Validação do dossiê

Rotas e componentes presentes e compilando:

- `/acoes/[id]/dossie` com painel de governança editorial

Validação funcional em produção com usuário real:

- **Pendente operacional**

## 9. Validação da devolutiva

Rotas e componentes presentes e compilando:

- `/acoes/[id]/devolutiva` com modo técnico interno e público

Validação funcional em produção com usuário real:

- **Pendente operacional**

## 10. Documentação criada/atualizada

Criados:

- `docs/deploy-auditoria-falas-producao.md`
- `reports/public-quotes-audit-remote-validation.md`
- `reports/estado-da-nacao-semear-territorios-068.md`

Atualizados:

- `docs/homologacao-falas-auditadas-067.md`
- `docs/auditoria-falas-representativas.md`

## 11. Incidentes reais encontrados e corrigidos

Incidente 1:

- Erro: `invalid regular expression: quantifier operand invalid`
- Causa: regex incompatível com PostgreSQL na função de risco
- Correção: migration `20260511200000_fix_public_quote_risk_regex.sql`

Incidente 2:

- Erro: violação de FK na auditoria durante insert de fala
- Causa: trigger `BEFORE INSERT` + FK imediata para `quote_id`
- Correção: migration `20260511203000_make_quote_audit_fk_deferrable.sql`

## 12. Verificação final

Executado no projeto:

- `npm run lint` ✅
- `npm run build` ✅
- `npm run verify` ✅

## 13. Riscos restantes

- Falta validação operacional com credenciais reais para `equipe` e `coordenacao/admin` no frontend de produção.
- Falta evidência funcional de ponta a ponta em UI para cenários de bloqueio sem justificativa e bloqueio por risco crítico.

## 14. Próximo tijolo recomendado

**Tijolo 069 — Bateria Operacional Assistida de Produção (papéis reais)**

Escopo sugerido:

1. executar testes guiados com login real (`equipe`, `coordenacao/admin`)
2. coletar evidências por cenário (aprovação, rejeição, arquivamento, bloqueios)
3. consolidar checklist de aceite operacional para governança contínua
4. manter sem integração com Transparência Viva nesta etapa
