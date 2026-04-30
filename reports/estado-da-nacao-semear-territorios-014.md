# Estado da Nação — SEMEAR Territórios 014

## Diagnóstico inicial

O sistema já possuía ação, escutas, piloto da banca, checklist operacional, prontidão, síntese determinística, devolutiva por ação e aprovação em `action_debriefs`. Ainda não existia tabela para fechamento operacional da ação, nem persistência para a exceção “coordenação considera suficiente, com justificativa”. O relatório mensal também não indicava se as ações do mês tinham dossiê fechado.

## Migration criada

`supabase/migrations/20260429001000_create_action_closures.sql`

Cria `action_closures` com:

- `action_id` único;
- status `open`, `in_review`, `closed`, `reopened`;
- suficiência por coordenação com justificativa;
- checklist documental em JSONB;
- notas de evidência e notas internas;
- auditoria de fechamento e reabertura: `closed_by`, `closed_at`, `reopened_by`, `reopened_at`;
- RLS sem acesso anônimo.

## Rotas criadas

- `/acoes/[id]/dossie` — tela “Dossiê da ação”.

## Componentes criados

- `components/actions/action-dossier-page.tsx`

## Bibliotecas criadas

- `lib/action-closures.ts`

Centraliza:

- labels de status;
- checklist documental;
- validação de fechamento;
- geração de Markdown do dossiê.

## Arquivos alterados

- `components/actions/action-detail.tsx`
- `components/actions/action-debrief-page.tsx`
- `components/reports/monthly-report-detail.tsx`
- `lib/database.types.ts`

## Como fechar uma ação

1. Abra `/acoes/[id]/dossie`.
2. Revise o resumo operacional, pendências, devolutiva e síntese.
3. Preencha notas de evidência e notas internas, se necessário.
4. Marque checklist documental.
5. Clique em “Fechar ação”.

Regras:

- bloqueia se houver possível dado sensível;
- bloqueia se houver escutas em rascunho, exceto com suficiência justificada pela coordenação/admin;
- alerta se a devolutiva não estiver aprovada, mas não bloqueia;
- registra `closed_by` e `closed_at`;
- muda status para `closed`.

## Como reabrir uma ação

1. Abra o dossiê.
2. Registre a justificativa nas notas internas.
3. Clique em “Reabrir ação”.

Apenas coordenação/admin pode reabrir. O sistema registra `reopened_by` e `reopened_at`, e muda status para `reopened`.

## Como imprimir o dossiê

Na rota `/acoes/[id]/dossie`, use “Imprimir dossiê”.

A impressão mantém:

- dados da ação;
- resumo operacional;
- status de revisão;
- checklist;
- síntese determinística;
- status da devolutiva;
- decisão da coordenação;
- notas de evidência;
- rodapé “Projeto SEMEAR — UFF + APS”.

Não inclui fala original completa, entrevistador, dados sensíveis nem controles de tela.

## Suficiência por coordenação

A exceção prevista no Tijolo 012 agora é persistente em `action_closures`:

- checkbox “Coordenação considera a revisão suficiente para fechamento”;
- justificativa obrigatória para fechar usando essa exceção;
- apenas coordenação/admin pode marcar;
- permite fechar com rascunhos pendentes se não houver dado sensível e houver justificativa.

## Integração com relatório mensal

O relatório mensal agora mostra, para cada ação do mês:

- status do dossiê;
- devolutiva aprovada ou não;
- escutas revisadas;
- pendências críticas.

Também exibe o alerta: “Há ações do mês sem dossiê fechado.” O relatório não é bloqueado.

## Versionamento leve da devolutiva

Não foi criado versionamento histórico complexo. A decisão adotada foi:

- mostrar `updated_at` da devolutiva no dossiê e na devolutiva;
- quando uma devolutiva aprovada for editada e salva como rascunho ou revisada, ela deixa de estar aprovada;
- a tela da devolutiva exibe aviso de que edição de versão aprovada deve retornar para rascunho/revisada.

## Regras de privacidade

- O dossiê não imprime falas originais completas.
- O dossiê não imprime `interviewer_name`.
- O fechamento bloqueia possível dado sensível pendente.
- Não houve uso de `service_role` no frontend.
- Não houve mudança para página pública sem autenticação.
- Não houve mapa geográfico, PWA/offline ou ampliação de IA.

## Verificação

Comandos executados:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Riscos restantes

- A detecção de dado sensível continua heurística.
- O versionamento de devolutiva ainda é leve, sem histórico completo de versões.
- O vínculo com relatório mensal é informativo; não há tabela de relação formal entre dossiê e relatório mensal.
- As policies dependem de `public.get_user_role()` já existir no banco antes da migration do fechamento.

## Próximos passos

- Aplicar migrations `action_debriefs` e `action_closures` em desenvolvimento/staging.
- Testar fechamento e reabertura com usuários `equipe`, `coordenacao` e `admin`.
- Validar impressão do dossiê com uma ação real.
- Avaliar versionamento histórico de devolutivas antes de circulação institucional mais ampla.
