# Estado da Nação — SEMEAR Territórios 013

## Diagnóstico inicial

O sistema já tinha o fluxo de operação da banca consolidado em `/acoes/[id]`, `/acoes/[id]/piloto`, `/escutas`, `/escutas/lote`, síntese determinística e relatório mensal. O `monthly_reports` atende relatórios por mês, mas não é adequado para salvar uma devolutiva revisada por ação, com aprovação e snapshot de totais. Por isso foi criada uma tabela específica para devolutivas de ação.

O componente `action-synthesis` já exportava uma devolutiva pública simples, mas sem persistência, revisão humana, status de aprovação ou versão de impressão institucional.

## Arquivos alterados

- `app/globals.css`
- `components/actions/action-detail.tsx`
- `lib/database.types.ts`

## Arquivos criados

- `app/acoes/[id]/devolutiva/page.tsx`
- `components/actions/action-debrief-page.tsx`
- `lib/action-debriefs.ts`
- `supabase/migrations/20260429000000_create_action_debriefs.sql`
- `reports/estado-da-nacao-semear-territorios-013.md`

## Migration criada

`supabase/migrations/20260429000000_create_action_debriefs.sql`

Cria a tabela `action_debriefs` com:

- vínculo único por `action_id`;
- textos públicos editáveis;
- `generated_markdown`;
- `team_review_text`;
- status `draft`, `reviewed` ou `approved`;
- `totals_snapshot` em JSONB;
- `approved_by` e `approved_at`;
- RLS sem acesso anônimo.

Políticas:

- usuários autenticados podem ler;
- equipe, coordenação e admin podem criar rascunhos/revisadas;
- equipe edita as próprias devolutivas não aprovadas;
- coordenação/admin podem revisar e aprovar.

## Rotas criadas

- `/acoes/[id]/devolutiva` — tela “O que ouvimos nesta ação”.

## Componentes criados

- `ActionDebriefPage`: carrega ação, escutas, perfil, devolutiva existente e permite gerar, revisar, salvar, aprovar, copiar, baixar Markdown e imprimir.

## Como gerar devolutiva

1. Abra uma ação em `/acoes/[id]`.
2. No card “Devolutiva da ação”, clique em “Abrir devolutiva”.
3. Use “Gerar rascunho determinístico”.
4. Revise os campos:
   - título público;
   - texto público;
   - principais achados;
   - próximos passos;
   - nota metodológica;
   - anotações da equipe.
5. Salve como rascunho.

O gerador usa dados agregados e preferencialmente escutas revisadas. Não usa IA.

## Como revisar e aprovar

- “Salvar rascunho”: mantém a devolutiva como preparação interna.
- “Marcar revisada”: indica que a equipe revisou, mas ainda não aprovou circulação.
- “Aprovar”: disponível apenas para coordenação/admin e registra `approved_by` e `approved_at`.

Se houver possível dado sensível, a interface bloqueia a aprovação e mostra aviso.

## Como imprimir

Na tela `/acoes/[id]/devolutiva`, clique em “Imprimir”.

A impressão usa CSS `@media print` e remove controles operacionais, mantendo:

- título;
- dados da ação;
- indicadores;
- síntese;
- próximos passos;
- rodapé “Projeto SEMEAR — UFF + APS”.

Não foi criado PDF nativo neste tijolo.

## Regras de privacidade

- A devolutiva não inclui `interviewer_name`.
- A devolutiva não inclui fala original completa automaticamente.
- Escutas com alerta de possível dado sensível são excluídas da base usada para texto público.
- Lugares com padrão de endereço pessoal são sanitizados no texto público.
- A tela mostra aviso quando existem registros com possível dado sensível.
- Não foi criada página pública sem autenticação.
- Não houve alteração para enfraquecer RLS.
- Não foi usado `service_role` no frontend.

## Estados vazios e pendências

A tela informa:

- sem escutas;
- sem escutas revisadas;
- rascunhos ainda pendentes;
- possível dado sensível;
- pronta para devolutiva após revisão humana.

## Verificação

Executado durante o tijolo:

- `npm run lint`
- `npm run build`

O `npm run verify` foi executado ao final do ciclo.

## Riscos restantes

- A detecção de dados sensíveis é heurística e precisa de revisão humana.
- O controle de aprovação depende da migration estar aplicada no Supabase.
- A tabela guarda uma devolutiva principal por ação; versionamento histórico completo ainda não existe.
- A aprovação por coordenação/admin é reforçada por RLS, mas a UX depende do perfil local carregado.

## Próximos passos

- Aplicar a migration no ambiente de desenvolvimento/staging.
- Testar aprovação com usuários `equipe`, `coordenacao` e `admin`.
- Validar a impressão com uma devolutiva real da primeira banca.
- Se necessário, criar versionamento de devolutivas antes de circulação institucional ampla.
