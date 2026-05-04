# Estado da Nação — SEMEAR Territórios 035

**Data:** 2026-05-04
**Tijolo:** 035 — Primeira Ação Real: Cadastro, Fichas, Escutas e Fechamento

---

## Diagnóstico inicial

| Indicador | Valor |
|---|---|
| Bairros oficiais no banco | 52 |
| Territórios provisórios (ocultos dos selects) | 21 |
| actions_total | 0 |
| listening_records_total | 0 |
| Selects operacionais filtrados por `status = 'oficial'` | sim (Tijolo 034) |
| Sistema liberado para primeira ação real | sim |

### Componentes verificados

| Tela/Componente | Status |
|---|---|
| `/acoes/nova` | Funcional — melhorado com título sugerido e microcopy de local |
| `/escutas/lote` | Funcional — melhorado com auto-sugestão de origem e microcopy de rascunho |
| `/escutas` | Funcional — filtros por ação, status, tema, revisão territorial |
| `/escutas/revisao-territorial` | Funcional — fila com filtros e TerritorialReviewPanel |
| `/acoes/[id]/piloto` | Funcional — checklist de prontidão operacional |
| `/acoes/[id]/devolutiva` | Funcional — geração determinística, aprovação por coordenação/admin |
| `/acoes/[id]/dossie` | Funcional — checklist, fechamento, impressão |
| `/relatorios` | Funcional — síntese mensal por ação e escuta |
| `/pos-banca` | Funcional — consolidação pós-banca com decisão |
| `/ajuda` | Atualizado — novo bloco "Primeira ação real" |

---

## Documentos criados

| Arquivo | Descrição |
|---|---|
| `docs/operacao-primeira-acao-real.md` | Roteiro completo da operação: antes, durante e depois da banca |
| `docs/controle-fichas-papel-primeira-acao.md` | Tabela de controle de fichas com código, digitação, revisão e sensível |
| `docs/revisao-primeiras-escutas.md` | Guia de revisão: fala original, temas, prioridade, lugares, aprovação |
| `docs/devolutiva-primeira-acao.md` | Passo a passo de geração, revisão e aprovação da devolutiva |
| `docs/dossie-primeira-acao.md` | Passo a passo de fechamento do dossiê |
| `docs/relatorio-pos-banca-primeira-acao.md` | Template de relatório pós-banca com todos os campos relevantes |
| `reports/estado-da-nacao-semear-territorios-035.md` | Este relatório |

---

## Mudanças em /acoes/nova

**Arquivo:** `components/actions/action-form.tsx`

| Melhoria | Detalhe |
|---|---|
| Aviso de local atualizado | "Use apenas local coletivo: feira, praça, escola, CRAS, associação. Nunca residência." |
| Aviso de território atualizado | "Selecione apenas bairro oficial — territórios provisórios não aparecem neste formulário." |
| Placeholder de título no modo create | `Ex.: Banca de Escuta — Feira Livre — [bairro]` |
| Microcopy de título sugerido | Exibido apenas no modo `create` |

---

## Mudanças em /escutas/lote

**Arquivo:** `components/listening-records/listening-record-batch-form.tsx`

| Melhoria | Detalhe |
|---|---|
| Auto-sugestão de origem | Quando a ação selecionada tem `action_type = 'banca_escuta'`, `source_type` é automaticamente sugerido como `feira` |
| Microcopy de rascunho atualizado | "Digite a ficha como rascunho. A revisão será feita depois, com calma." |
| Seletor de ação | Usa nova função `handleSelectAction` que aplica a sugestão de origem |

---

## Mudanças em /ajuda

**Arquivo:** `app/ajuda/page.tsx`

- Novo array `firstRealActionChecklist` com 12 itens.
- Novo bloco `Panel` "Primeira ação real" com checklist, links diretos e referência aos docs.

---

## Como cadastrar a primeira ação real

1. Acessar `/acoes/nova`.
2. Título sugerido: `Banca de Escuta — Feira Livre — [bairro]`.
3. Tipo: `banca_escuta`.
4. Selecionar bairro oficial (52 disponíveis no select).
5. Local: referência coletiva — feira, praça, escola, CRAS, associação.
6. Salvar com status `planejada`.
7. Após a banca, atualizar para `realizada`.

## Como digitar fichas

1. Acessar `/escutas/lote`.
2. Selecionar a ação — bairro e data são herdados automaticamente.
3. Se a ação for `banca_escuta`, origem sugere automaticamente `feira`.
4. Digitar cada ficha e clicar em "Salvar e digitar próxima".
5. Todas as fichas entram como `rascunho`.
6. Contador de sessão exibe o total digitado.

## Como revisar escutas

1. Acessar `/escutas` — filtrar por ação e status `rascunho`.
2. Para cada escuta: preencher resumo, marcar temas, registrar prioridade ou "não apareceu prioridade".
3. Verificar lugares citados — sem endereço pessoal.
4. Alterar status para `revisada`.
5. Usar `/escutas/revisao-territorial` para estruturar lugares e status territorial.

## Como gerar devolutiva

1. Abrir a ação em `/acoes/[id]`.
2. Acessar `/acoes/[id]/devolutiva`.
3. Gerar rascunho determinístico.
4. Revisar e remover dado sensível.
5. Aprovar: somente coordenação ou admin.

## Como fechar dossiê

1. Garantir: todas as escutas revisadas, devolutiva aprovada, ação como `realizada`.
2. Acessar `/acoes/[id]/dossie`.
3. Conferir checklist, registrar notas de evidência, fechar.

## Como preencher relatório pós-banca

1. Abrir `docs/relatorio-pos-banca-primeira-acao.md`.
2. Preencher todos os campos: fichas, temas, palavras, lugares, prioridades, problemas, ajustes.
3. Registrar status no sistema (devolutiva, dossiê, relatório mensal).
4. Registrar decisão pós-banca e próximos passos.

---

## Confirmação de privacidade

| Verificação | Status |
|---|---|
| Nenhum formulário pede nome do entrevistado | ✓ |
| Nenhum formulário pede telefone | ✓ |
| Nenhum formulário pede CPF | ✓ |
| Nenhum formulário pede endereço pessoal | ✓ |
| Locais da ação são coletivos (microcopy reforçado) | ✓ |
| Territórios são agregações, não localização individual | ✓ |
| Alerta de dado sensível na digitação em lote | ✓ (existia, mantido) |
| Fala original não aparece em material público sem revisão | ✓ |
| Provisórios ocultos dos selects operacionais | ✓ (Tijolo 034) |

---

## Riscos restantes

| Risco | Avaliação | Mitigação |
|---|---|---|
| Equipe não segue roteiro de privacidade na banca física | Médio | docs/operacao-primeira-acao-real.md + orientação presencial obrigatória |
| Ficha física perdida antes da digitação | Médio | docs/controle-fichas-papel-primeira-acao.md + responsável definido |
| Dado sensível digitado sem perceber alerta | Baixo | Sistema alerta durante digitação; revisão humana obrigatória antes de aprovar |
| Devolutiva aprovada sem revisão completa | Baixo | Aprovação bloqueada a não admin/coordenação |
| Bairro provisório usado por engano | Muito baixo | Select operacional filtrado por `status = 'oficial'` |
| Grafia "Jardim Suiça" / "Santa Inez" pendente | Baixo | Decisão registrada; aguarda definição da coordenação |

---

## Próximo tijolo recomendado

**Tijolo 036 — Primeiro Fluxo Completo Validado**

Após a primeira banca real:
1. Confirmar que o fluxo completo (ação → fichas → revisão → devolutiva → dossiê → relatório) foi percorrido.
2. Preencher `docs/relatorio-pos-banca-primeira-acao.md`.
3. Registrar decisão pós-banca via `/pos-banca`.
4. Identificar ajustes operacionais para a segunda banca.
5. Avaliar se lugares citados precisam ser normalizados.
6. Verificar qualidade territorial em `/territorios/qualidade`.
7. Decidir se o mapa interno está mais próximo de ser autorizado.
