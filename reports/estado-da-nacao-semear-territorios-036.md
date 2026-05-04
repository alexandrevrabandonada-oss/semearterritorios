# Estado da Nação — SEMEAR Territórios 036

**Data:** 2026-05-04
**Tijolo:** 036 — Primeiro Fluxo Completo Validado

---

## 1. Diagnóstico do uso real

### Dados do banco na data de validação

| Indicador | Valor |
|---|---|
| `actions_total` | 0 (nenhuma ação cadastrada ainda) |
| `listening_records_total` | 0 (nenhuma ficha digitada ainda) |
| Bairros oficiais no banco | 52 |
| Territórios provisórios (ocultos dos selects) | 21 |
| Primeira ação cadastrada | Ainda não realizada |
| Devolutiva criada | Não |
| Dossiê criado | Não |
| Relatório mensal reconhece a ação | Não aplicável — aguardando dados reais |

### Diagnóstico

O Estado da Nação 035 confirmou que o sistema estava pronto para receber a primeira ação real, com 52 bairros oficiais, selects operacionais filtrados, todos os módulos funcionais e documentação de operação entregue. O Tijolo 036 é o primeiro ciclo de validação **após** a preparação do sistema, mas antes da realização da primeira banca real.

Neste tijolo, o trabalho realizado foi:
- Inspeção completa de todos os módulos do ciclo: `/acoes/nova` → `/escutas/lote` → `/escutas` (revisão) → `/acoes/[id]/devolutiva` → `/acoes/[id]/dossie` → `/relatorios` → `/pos-banca`.
- Leitura e validação do código de todos os componentes críticos.
- Identificação e correção de fricções de UX observáveis sem dados reais.
- Confirmação de privacidade em todos os formulários.
- `npm run lint` e `npm run build` passando sem erros.

---

## 2. Validação do ciclo completo — resultado por módulo

### /acoes/nova — Cadastro da ação

| Critério | Status |
|---|---|
| Título com placeholder sugestivo | ✅ `Ex.: Banca de Escuta — Feira Livre — [bairro]` |
| Tipo padrão `banca_escuta` | ✅ |
| Select de bairro filtrado por `status = 'oficial'` | ✅ 52 bairros disponíveis |
| Aviso de local coletivo | ✅ Presente no formulário |
| Campo de equipe sem coleta de dados do público | ✅ |
| Status padrão `planejada` | ✅ |
| Sem CPF, telefone, endereço pessoal nos campos | ✅ |

### /escutas/lote — Digitação de fichas

| Critério | Status |
|---|---|
| Fichas entram como `draft` | ✅ `review_status: "draft"` no payload |
| Bairro e data herdados da ação | ✅ `neighborhood_id` e `date` copiados da ação selecionada |
| Origem sugerida como `feira` quando `banca_escuta` | ✅ Auto-sugestão em `handleSelectAction` |
| Contador de sessão | ✅ `sessionCount` incrementado a cada salvo |
| Alerta de dado sensível em tempo real | ✅ Detecta telefone, CPF e e-mail na fala original |
| Sem coleta de nome completo, CPF, telefone, endereço | ✅ |
| Entrevistador (nome da equipe) mantido entre fichas | ✅ `interviewer_name` persiste ao resetar form |

### /escutas — Revisão das escutas

| Critério | Status |
|---|---|
| Filtros por ação, status, tema, qualidade | ✅ 6 filtros disponíveis |
| Filtro "Possível dado sensível" | ✅ |
| URL params preservam filtro de ação | ✅ `?actionId=` e `?status=` lidos na inicialização |
| Fila de revisão territorial em `/escutas/revisao-territorial` | ✅ |

### /acoes/[id]/devolutiva — Devolutiva

| Critério | Status |
|---|---|
| Geração determinística (sem IA) | ✅ `buildActionDebrief` em `lib/action-debriefs.ts` |
| Usa apenas escutas revisadas e sem dado sensível | ✅ `safeReviewedRecords` |
| Sanitização de lugares públicos | ✅ `sanitizePublicPlace` remove endereços de rua |
| Warnings para rascunhos pendentes | ✅ |
| Warnings para dado sensível pendente | ✅ |
| Aprovação restrita a coordenação/admin | ✅ |

### /acoes/[id]/dossie — Dossiê

| Critério | Status |
|---|---|
| Checklist: evidências organizadas | ✅ |
| Checklist: relatório mensal preparado | ✅ |
| Checklist: devolutiva aprovada | ✅ derivado de `debrief.status` |
| Fechamento bloqueado se dado sensível pendente | ✅ `getClosureCanClose` |
| Impressão sem dado sensível | ✅ (usa `buildClosureMarkdown`) |
| Decisão de suficiência pela coordenação | ✅ `coordination_sufficiency` + `sufficiency_reason` |

### /relatorios — Relatório mensal

| Critério | Status |
|---|---|
| Síntese por mês e ação | ✅ |
| Reconhece a ação quando cadastrada | ✅ (aguarda primeiro registro real) |

### /pos-banca — Decisão pós-banca

| Critério | Status |
|---|---|
| Total de escutas | ✅ `metrics.total` |
| Revisadas / rascunhos | ✅ `metrics.reviewed` / `metrics.draft` |
| Temas, palavras, lugares, prioridades | ✅ agregados por `getActionPilotMetrics` |
| Status devolutiva | ✅ |
| Status dossiê | ✅ |
| Decisão recomendada (determinística) | ✅ `getPostActionDecision` |
| Botão "Copiar decisão pós-banca" | ✅ |
| Não usa IA | ✅ |

---

## 3. Fichas — totais na data

| Indicador | Valor |
|---|---|
| Fichas em papel | Não registrado (aguarda banca real) |
| Fichas digitadas | 0 |
| Fichas revisadas | 0 |
| Rascunhos | 0 |
| Possíveis dados sensíveis | 0 |

---

## 4. Pendências em aberto

| Pendência | Natureza |
|---|---|
| Primeira ação ainda não cadastrada | Operacional — aguarda decisão da equipe |
| Nenhuma ficha digitada | Operacional — aguarda banca real |
| Devolutiva não gerada | Operacional — depende das fichas |
| Dossiê não criado | Operacional — depende da devolutiva |
| Relatório pós-banca não preenchido | Operacional — depende da banca |
| Decisão pós-banca não disponível | Operacional — depende dos dados reais |

Todas as pendências são **operacionais** (sem dados reais) e **não bloqueiam** nenhum módulo do sistema.

---

## 5. Status da devolutiva

Não aplicável — aguarda primeira ação e fichas digitadas.

---

## 6. Status do dossiê

Não aplicável — aguarda devolutiva aprovada.

---

## 7. Decisão pós-banca

Não aplicável — aguarda ciclo real.

**Decisão esperada pelo sistema quando o ciclo estiver completo:**
- Se `metrics.possibleSensitive > 0` → **Bloqueado** — revisar dados sensíveis primeiro.
- Se `debrief.status !== 'approved'` ou `closure.status !== 'closed'` → **Aviso** — fechar ciclo institucional antes de avançar.
- Se `metrics.reviewed < 20` → **Aviso** — revisar mais fichas.
- Se tudo ok → **Pode avançar para escopo de mapa interno autenticado.**

---

## 8. Ajustes de UX feitos neste tijolo

| Arquivo | Ajuste |
|---|---|
| `components/actions/action-detail.tsx` | Adicionado botão "Digitalizar fichas" (link para `/escutas/lote`) nos atalhos rápidos da ação |
| `components/actions/action-detail.tsx` | Badge estático "Pode receber escutas vinculadas depois" substituído por mensagem contextual: `realizada` → aviso para digitalizar; `planejada` → aviso que fichas serão digitadas após a banca |
| `components/actions/action-operation-checklist.tsx` | Adicionado banner "Nenhuma ficha digitada ainda → Digitalizar fichas em modo lote →" quando `metrics.total === 0` |
| `components/listening-records/listening-record-batch-form.tsx` | Título "Travar Ação (Lote)" renomeado para "Sessão de digitação — fixar ação" (linguagem mais clara) |

---

## 9. Confirmação de privacidade

| Critério | Status |
|---|---|
| Nenhum campo coleta CPF | ✅ Confirmado por inspeção de todos os formulários |
| Nenhum campo coleta telefone | ✅ |
| Nenhum campo coleta endereço pessoal | ✅ Campos de local usam referência coletiva |
| Nenhum campo coleta dado de saúde individual identificável | ✅ |
| Fala original permanece interna (não entra em devolutiva pública diretamente) | ✅ `buildActionDebrief` usa `safeReviewedRecords` e `sanitizePublicPlace` |
| Material público/devolutiva sanitizado | ✅ `sanitizePublicPlace` remove rua + número, telefone, e-mail |
| Detecção em tempo real de padrões sensíveis na digitação | ✅ `checkSensitiveData` no batch form |
| Detecção no banco de padrões sensíveis antes de avançar | ✅ `hasPossibleSensitiveData` em `lib/action-pilot.ts` |
| Territórios provisórios ocultos dos selects operacionais | ✅ filtro `status = 'oficial'` |

---

## 10. Verificação técnica

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ Sem erros ou warnings |
| `npm run build` | ✅ Build de produção sem erros (29 rotas geradas) |
| Erros TypeScript nos arquivos editados | ✅ Nenhum |

---

## 11. Riscos restantes

| Risco | Grau | Mitigação |
|---|---|---|
| Nenhuma banca real realizada ainda | Médio | Sistema pronto; depende da equipe de campo |
| Primeira digitação pode encontrar fricção não mapeada em código | Baixo | Ajustes de UX feitos; `/ajuda` atualizado; docs operacionais disponíveis |
| Dado sensível não detectado por padrão regex | Baixo | Revisão humana obrigatória antes de aprovar devolutiva |
| Rascunhos acumulados sem revisão | Baixo | Checklist de operação e decisão pós-banca bloqueiam avanço |
| Território provisório inadvertidamente usado | Baixo | Select operacional filtrado por `status = 'oficial'` |

---

## 12. Próximo tijolo recomendado

**Tijolo 037 — Primeiro Ciclo Real: Dados Concretos e Fechamento**

Após a realização da primeira banca e digitação das fichas:

1. Usar `/acoes/nova` para cadastrar a ação com bairro oficial.
2. Usar `/escutas/lote` para digitar todas as fichas.
3. Usar `/escutas` para revisar rascunhos, marcar temas, prioridades, lugares.
4. Usar `/escutas/revisao-territorial` para estruturar lugares.
5. Usar `/acoes/[id]/devolutiva` para gerar e aprovar devolutiva.
6. Usar `/acoes/[id]/dossie` para fechar dossiê.
7. Usar `/pos-banca` para gerar decisão formal.
8. Preencher `docs/relatorio-pos-banca-primeira-acao.md` com dados reais.
9. Criar `reports/estado-da-nacao-semear-territorios-037.md` com diagnóstico real.

**Escopo do 037:** somente o ciclo real com dados — sem nova feature de código.

---

*Projeto SEMEAR — UFF + APS*
