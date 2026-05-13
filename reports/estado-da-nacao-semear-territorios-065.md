# Estado da Nacao - SEMEAR Territorios - Tijolo 065

## Diagnostico inicial
O Tijolo 064 deixou um risco explicito: faltava schema e fluxo editorial para transformar falas brutas em trechos representativos seguros para uso no dossie e na devolutiva publica.

## Migration criada
- Arquivo: supabase/migrations/20260511150000_create_listening_record_public_quotes.sql
- Escopo:
  - tabela listening_record_public_quotes
  - indices por action_id, listening_record_id e status
  - trigger de updated_at
  - trigger de guarda editorial e privacidade
  - funcao SQL public_quote_has_critical_risk

## Tabela criada
Tabela listening_record_public_quotes com campos:
- listening_record_id, action_id
- quote_text, sanitized_text
- theme_label, context_note
- status: draft, needs_review, approved_internal, approved_public, rejected, archived
- sensitive_risk, risk_notes
- reviewed_by/reviewed_at
- approved_by/approved_at
- created_by/created_at/updated_at

## RLS e seguranca
- anon: sem acesso
- authenticated: leitura para perfis autorizados
- equipe: cria/edita rascunhos e revisao em fluxo proprio
- coordenacao/admin: aprovam, rejeitam e aprovam para publico
- approved_public bloqueado se:
  - sanitized_text vazio
  - papel sem permissao
  - detector com risco critico

## Detector de privacidade
- Arquivo: lib/public-quote-privacy.ts
- Detecta:
  - CPF
  - telefone
  - e-mail
  - CEP
  - endereco especifico (rua + numero)
  - moradia especifica
  - nome completo provavel
  - local de trabalho/escola especifico
  - saude identificavel
- Regras:
  - CPF/telefone/e-mail/endereco/CEP bloqueiam approved_public
  - demais categorias geram alerta para revisao

## Selecao por escuta
- Arquivos:
  - components/listening-records/public-quote-candidate-panel.tsx
  - components/listening-records/listening-record-detail.tsx
- Entrega:
  - bloco "Fala candidata a devolutiva" em /escutas/[id]
  - selecao de trecho curto
  - edicao sanitizada
  - tema e nota de contexto
  - salvar rascunho / enviar para revisao

## Fila de revisao
- Arquivos:
  - app/escutas/falas/page.tsx
  - components/listening-records/public-quotes-queue.tsx
  - components/listening-records/listening-records-list.tsx
- Entrega:
  - nova rota /escutas/falas
  - filtros por acao, status, tema e risco
  - cards com trecho original interno, versao sanitizada, alertas e acoes editoriais

## Workflow editorial
Estados implementados:
- draft
- needs_review
- approved_internal
- approved_public
- rejected
- archived

Regras implementadas:
- approved_public exige sanitized_text e permissao de coordenacao/admin
- approved_public bloqueado por risco critico
- edicao de sanitized_text apos aprovacao retorna para needs_review (trigger)

## Integracao com dossie
- Arquivo: components/actions/action-dossier-page.tsx
- Entrega:
  - secao "Falas representativas revisadas" separada em internas e publicas
  - exibicao de tema, contexto, status e alertas
  - markdown do dossie inclui falas approved_internal e approved_public

## Integracao com devolutiva
- Arquivo: components/actions/action-debrief-page.tsx
- Entrega:
  - bloco "Vozes do territorio" no modo publico
  - exibe apenas approved_public
  - mensagem de ausencia quando nao ha falas aprovadas

## Markdown e impressao
- Arquivos:
  - lib/action-debriefs.ts
  - components/actions/action-dossier-page.tsx
- Entrega:
  - markdown da devolutiva inclui "Vozes do territorio" apenas com approved_public
  - markdown do dossie inclui falas revisadas internas/publicas com status

## Transparencia Viva (preparacao)
- Arquivo: lib/transparency-snapshots.ts
- Entrega:
  - helper countApprovedPublicQuotesByAction para integracao futura
  - sem publicacao automatica de falas neste tijolo

## Documentacao
- Atualizado: app/ajuda/page.tsx
  - nova secao "Falas representativas sanitizadas"
- Criado: docs/testes-falas-representativas-sanitizadas-065.md

## Testes realizados
- Cenarios documentados:
  1. fala segura aprovada publica
  2. CPF bloqueia approved_public
  3. telefone bloqueia approved_public
  4. endereco bloqueia approved_public
  5. edicao apos aprovacao volta para revisao
  6. dossie exibe approved_internal e approved_public
  7. devolutiva publica exibe apenas approved_public
- Validacao tecnica:
  - npm run lint: OK
  - npm run build: OK
  - npm run verify: OK

## Riscos restantes
- Falta auditoria dedicada por transicao de status da fala (historico fino por etapa editorial).
- Teste ponta a ponta depende de massa de homologacao para exercitar todos os cenarios de negocio com dados reais.

## Proximo tijolo recomendado
Tijolo 066: trilha de auditoria editorial de falas (historico por alteracao de status/texto, justificativa obrigatoria e painel de governanca de risco por acao).
