# Auditoria das falas representativas sanitizadas

## Objetivo

Registrar trilha editorial completa para cada fala representativa usada em dossie e devolutiva, com responsabilizacao explicita sobre selecao, edicao, revisao e aprovacao.

## O que foi implementado

- Campos obrigatorios de justificativa na tabela de falas:
  - `public_approval_reason`
  - `rejection_reason`
  - `archive_reason`
  - `last_edit_reason`
- Tabela de auditoria `listening_record_public_quote_audits` com eventos:
  - `created`, `text_changed`, `sanitized_text_changed`, `sent_to_review`, `approved_internal`, `approved_public`, `rejected`, `archived`, `restored`, `risk_detected`, `status_changed`
- Trigger de workflow reforcado para:
  - exigir justificativas nas transicoes sensiveis
  - bloquear aprovacao publica com risco critico
  - registrar eventos automaticamente com autor e timestamp
- Fila editorial `/escutas/falas` com:
  - ultimo evento por fala
  - campo de justificativa editorial
  - link para historico completo por fala
- Rota de historico `/escutas/falas/[id]` com trilha cronologica de eventos.

## Regras operacionais

- Aprovacao publica exige:
  - texto sanitizado preenchido
  - ausencia de risco critico
  - justificativa de aprovacao publica
- Rejeicao exige motivo.
- Arquivamento exige motivo.
- Edicao de texto apos status `approved_public` exige `last_edit_reason`.

## Governanca no dossie e devolutiva

- Dossie da acao passa a exibir:
  - distribuicao por status
  - cobertura de auditoria
  - quantidade com risco critico
  - edicoes apos aprovacao
  - pendencias de justificativa
- Devolutiva em modo tecnico interno mostra:
  - falas aprovadas publicas
  - quantas possuem auditoria
  - quantas possuem justificativa de aprovacao
  - sinal de conformidade editorial.

## Observacoes de seguranca

- Nenhum dado de auditoria e exposto na devolutiva publica.
- A superficie publica continua restrita a falas `approved_public` e sanitizadas.

## Atualizacao de producao (Tijolo 068)

- Migration remota aplicada e sincronizada via fluxo versionado (`supabase db push`).
- Correcao em producao da funcao `public_quote_has_critical_risk` (regex SQL compativel com PostgreSQL).
- Correcao em producao da FK `listening_record_public_quote_audits_quote_id_fkey` para `DEFERRABLE INITIALLY DEFERRED`.
- Validacao automatizada remota confirmou:
  - colunas novas presentes
  - trigger gerando evento por mudanca de status
  - 11 event_types aceitos
  - bloqueio de event_type invalido
  - anon sem visibilidade de registro conhecido da auditoria
