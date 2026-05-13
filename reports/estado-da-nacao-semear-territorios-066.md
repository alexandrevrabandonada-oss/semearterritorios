# Estado da Nacao - SEMEAR Territorios (Tijolo 066)

## Entrega

Implementada a Auditoria Editorial das Falas Representativas Sanitizadas, com trilha de eventos, justificativas obrigatorias e indicadores de governanca no dossie e na devolutiva interna.

## Escopo concluido

- Migracao `20260511170000_public_quote_audits_and_required_reasons.sql`:
  - colunas de justificativa em `listening_record_public_quotes`
  - tabela `listening_record_public_quote_audits`
  - trigger de workflow com registro automatico de eventos
  - enforcement de motivo obrigatorio para transicoes sensiveis
  - politicas RLS para leitura e registro de auditoria
- Tipagem:
  - novos tipos para eventos e tabela de auditoria em `lib/database.types.ts`
- UI editorial:
  - fila `/escutas/falas` com ultimo evento, justificativa e acesso ao historico
  - painel da escuta com justificativa para aprovacoes, rejeicoes, arquivamento e edicoes sensiveis
  - nova rota `/escutas/falas/[id]` para trilha detalhada
- Governanca:
  - dossie com painel de governanca editorial e secao markdown dedicada
  - devolutiva em modo tecnico interno com indicador de conformidade de auditoria e justificativa
- Documentacao:
  - `docs/auditoria-falas-representativas.md`
  - `docs/testes-auditoria-falas-representativas-066.md`
  - atualizacao de orientacao em `/ajuda`

## Garantias de privacidade

- Aprovacao publica segue bloqueada para falas com risco critico.
- Devolutiva publica continua sem exposicao de dados internos de auditoria.
- Exigencia de justificativa aumenta rastreabilidade da decisao editorial.

## Pendencias

- Executar validacao final com `npm run lint`, `npm run build` e `npm run verify` apos fechamento de todos os ajustes do 066.
