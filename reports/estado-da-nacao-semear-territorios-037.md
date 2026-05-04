# Estado da Nação — SEMEAR Territórios 037

**Data:** 2026-05-04
**Tijolo:** 037 — Primeiro Ciclo Real com Dados Concretos e Fechamento Operacional

---

## 1. Diagnóstico real do banco

### Dados na data de execução deste tijolo

| Indicador | Valor |
|---|---|
| `actions_total` | **1** — primeira ação real cadastrada |
| `listening_records_total` | **0** — fichas ainda não digitadas |
| `action_closures` | 0 — sem fechamento de dossiê |
| `action_debriefs` | 0 — sem devolutiva |
| `monthly_reports` | 0 — sem relatório mensal |
| Bairros oficiais | 52 |
| Territórios provisórios (ocultos) | 21 |
| Perfis com papel definido | 1 (admin: alexandrecampos@id.uff.br) |

### Conclusão pela TAREFA 2

`listening_records_total = 0` → o ciclo completo (fichas → revisão → devolutiva → dossiê → pós-banca) **não pode ser validado neste tijolo**. Nenhum dado foi inventado. Nenhuma devolutiva falsa foi gerada. O sistema permanece pronto aguardando digitação das fichas.

---

## 2. Validação da ação real (TAREFA 3)

### Ação cadastrada

| Campo | Valor | Status |
|---|---|---|
| ID | `48d40a2e-c4bc-4d53-b970-9fb5a8bc27ae` | — |
| Título | Banquinha Feira Aterrado | ✅ legível, identificável |
| Tipo | `banca_escuta` | ✅ correto para feira |
| Data | 18/04/2026 | ✅ |
| Bairro | Aterrado — SCS | ✅ status = oficial |
| Local | Feira Aterrado | ✅ referência coletiva, sem endereço pessoal |
| Equipe | Paulo Victor, Penha, Julia, Paula, Giliene | ✅ sem dados do público |
| Público estimado | 498 | ✅ campo numérico agregado |
| Status (antes deste tijolo) | `planejada` | ⚠️ incorreto — ação já realizada |
| Status (após correção neste tijolo) | `realizada` | ✅ corrigido diretamente no banco |
| Ausência de CPF/telefone/endereço pessoal | Confirmada | ✅ |

**Correção realizada:** o status foi atualizado de `planejada` para `realizada` via SQL na gestão remota, pois o campo `summary` já estava preenchido com o resumo da atividade realizada.

---

## 3. Fichas (TAREFA 4)

Nenhuma ficha digitada. As fichas de papel da banca de 18/04/2026 ainda não foram inseridas no sistema.

**Pendência crítica:** a equipe precisa digitar as fichas em `/escutas/lote` para que o ciclo possa avançar.

---

## 4. Revisão (TAREFA 5)

Não aplicável — sem escutas para revisar.

---

## 5. Devolutiva (TAREFA 6)

Não aplicável — sem escutas revisadas para gerar devolutiva.

---

## 6. Dossiê (TAREFA 7)

Não aplicável — sem devolutiva aprovada para fechar dossiê.

---

## 7. Relatório pós-banca (TAREFA 8)

`docs/relatorio-pos-banca-primeira-acao.md` foi preenchido com os dados reais disponíveis:
- Ação, data, local, bairro e equipe preenchidos.
- Seção de fichas marcada como pendente (0 digitadas).
- Seção de conteúdo marcada como pendente.
- Status no sistema atualizado com situação real.
- Decisão: bloquear avanço até digitação das fichas.

---

## 8. /pos-banca (TAREFA 9)

Não é possível gerar decisão útil em `/pos-banca` sem escutas. A página existe e funciona tecnicamente, mas retorna estado vazio para a ação `48d40a2e` pois `listening_records_total = 0`.

---

## 9. Ajustes pequenos realizados (TAREFA 10)

| Ajuste | Arquivo | Descrição |
|---|---|---|
| QuickLink `/pos-banca` adicionado | `app/ajuda/page.tsx` | Atalho para pós-banca estava ausente dos links rápidos do /ajuda |
| Scroll ao topo em erro | `components/listening-records/listening-record-batch-form.tsx` | Erros do formulário de lote ficavam invisíveis com tela scrollada |
| Reordenação de setores no dropdown | `lib/neighborhoods.ts` | SCS movido para posição 2 (antes estava em 6) — Aterrado agora visível sem scroll |
| Status da ação corrigido | banco remoto | `planejada` → `realizada` para "Banquinha Feira Aterrado" |
| Perfil do usuário criado | banco remoto | `alexandrecampos@id.uff.br` com papel `admin` — corrigiu bloqueio RLS no insert de ações |
| Cliente Supabase corrigido | `lib/supabase/client.ts` | Substituído `createClient` por `createBrowserClient` do `@supabase/ssr` para ler sessão SSR |

---

## 10. Privacidade (TAREFA 11)

| Critério | Status |
|---|---|
| Nenhum CPF coletado | ✅ confirmado — campo não existe nos formulários |
| Nenhum telefone coletado | ✅ confirmado |
| Nenhum endereço pessoal registrado | ✅ confirmado — local da ação é "Feira Aterrado" (coletivo) |
| Nenhum dado de saúde individual identificável | ✅ confirmado |
| Fala original permanece interna | ✅ — nenhuma escuta ainda digitada |
| Devolutiva pública sanitizada | ✅ — não existe devolutiva ainda |
| Dossiê não imprime dado sensível | ✅ — não existe dossiê ainda |
| Alerta de dado sensível ativo no formulário de lote | ✅ — detecta telefone, CPF e e-mail em tempo real |

---

## 11. Verificação (TAREFA 12)

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run build` | ✅ Build completo sem erros — todas as 25 rotas compiladas |

---

## 12. O que a equipe precisa fazer agora

**Ordem obrigatória — não pular etapas:**

1. **Digitar as fichas** → acessar `/escutas/lote`, selecionar "Banquinha Feira Aterrado", digitar cada ficha de papel como rascunho. Não incluir CPF, telefone, endereço pessoal ou dado de saúde identificável. Usar campo "Fala original" para o que a pessoa disse, não para dados pessoais.

2. **Revisar as escutas** → acessar `/escutas/revisao-territorial` ou `/escutas`. Para cada escuta: marcar temas, preencher resumo da equipe, indicar prioridade se mencionada, revisar lugares citados, tratar qualquer alerta de dado sensível.

3. **Gerar devolutiva** → acessar `/acoes/48d40a2e-c4bc-4d53-b970-9fb5a8bc27ae/devolutiva`. Revisar o texto gerado, remover falas originais identificáveis, aprovar pela coordenação/admin.

4. **Fechar dossiê** → acessar `/acoes/48d40a2e-c4bc-4d53-b970-9fb5a8bc27ae/dossie`. Preencher checklist, adicionar notas de evidência, fechar ou justificar pendência.

5. **Conferir relatório mensal** → acessar `/relatorios`. Criar relatório para 2026-04 se não existir.

6. **Abrir /pos-banca** → selecionar a ação, ler a decisão, copiar e registrar no `docs/relatorio-pos-banca-primeira-acao.md`.

7. **Preencher o relatório pós-banca** → completar as seções abertas em `docs/relatorio-pos-banca-primeira-acao.md` com dados reais das fichas.

---

## 13. Riscos restantes

| Risco | Severidade | Mitigação |
|---|---|---|
| Fichas de papel extraviadas antes da digitação | Alto | Digitalizar o mais rápido possível; numerar fichas antes da próxima banca |
| Dados pessoais nas fichas de papel | Alto | Revisar cada ficha antes de digitar; acionar alerta de sensível se necessário |
| Status da ação divergente do resumo | Baixo | Corrigido neste tijolo — status agora = `realizada` |
| Sem usuários adicionais cadastrados | Médio | Cadastrar perfis para Paulo Victor, Penha, Julia, Paula, Giliene se forem usar o sistema |

---

## 14. Próximo tijolo recomendado

**Tijolo 038 — Digitação e Revisão das Fichas da Primeira Banca**

Objetivo: com as fichas de papel em mãos, digitar todas em `/escutas/lote`, revisar em `/escutas/revisao-territorial`, gerar devolutiva, fechar dossiê e executar o `/pos-banca` com dados reais. Este será o primeiro ciclo completo do SEMEAR Territórios.
