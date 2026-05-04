# Estado da Nação — SEMEAR Territórios 034

**Data:** 2026-05-04
**Tijolo:** 034 — Ocultar Territórios Provisórios dos Selects Operacionais e Liberar Primeira Ação Real

---

## Diagnóstico inicial

| Indicador | Valor |
|-----------|-------|
| Total de neighborhoods no banco | 73 |
| Bairros oficiais (`status = 'oficial'`) | 52 |
| Territórios provisórios restantes | 21 |
| actions_total | 0 |
| listening_records_total | 0 |
| places_mentioned_total | 0 |
| normalized_places_total | 0 |
| official_code preenchido | 52 (códigos 1 a 52) |
| Setores oficiais | SCN, SO, SN, SL, SS, SCS, SSO |
| Duplicidade de official_code | Nenhuma |
| Duplicidade exata de name/city | Nenhuma |
| Geocodificação | Ausente |
| Dados pessoais | Ausentes |
| SAFE_TO_REMOVE (checagem Tijolo 033) | 73 |
| BLOCKED | 0 |

O diagnóstico confirma que nenhum território provisório possui vínculo operacional.
O estado pré-tijolo é seguro para aplicar a regra de ocultação sem risco de quebrar dados existentes.

---

## Selects que usam neighborhoods — mapeamento completo

| Componente | Tela | Tipo | Ação aplicada |
|---|---|---|---|
| `action-form.tsx` | /acoes/nova, /acoes/[id] edição | Formulário operacional | Filtro `status = 'oficial'` + microcopy |
| `listening-record-form.tsx` | /escutas/nova, /escutas/[id] edição | Formulário operacional | Filtro `status = 'oficial'` + microcopy |
| `actions-list.tsx` | /acoes | Filtro de listagem | Filtro `status = 'oficial'` |
| `listening-records-list.tsx` | /escutas | Filtro de listagem | Filtro `status = 'oficial'` |
| `territorial-review-queue.tsx` | /escutas/revisao-territorial | Filtro operacional | Filtro `status = 'oficial'` |
| `listening-record-detail.tsx` | /escutas/[id] | TerritorialReviewPanel | Filtro `status = 'oficial'` |
| `territories-admin-overview.tsx` | /territorios | Admin | Mantém todos + painel de split |
| `places-normalization-page.tsx` | /territorios/lugares | Admin | Mantém todos (área admin) |
| `listening-record-batch-form.tsx` | /escutas/lote | Lote | Sem select próprio; usa neighborhood_id da ação vinculada |
| `dashboard.tsx` | / | Dashboard | Mantém todos (exibição agregada) |

---

## Regra aplicada aos selects operacionais

**Regra padrão:** selects operacionais exibem apenas `neighborhoods` com `status = 'oficial'`.

**Implementação:**
- Query ao banco com `.eq("status", "oficial")` antes de popular o estado.
- Função auxiliar `getOfficialNeighborhoodsForSelect()` em `lib/neighborhoods.ts` aplica filtro e ordenação.

**Exceção:** telas administrativas (`/territorios`, `/territorios/lugares`) buscam todos os territórios.

**Microcopy adicionado** nos selects operacionais de formulário:
> "São exibidos apenas bairros oficiais validados. Territórios provisórios ficam disponíveis apenas na área administrativa."

---

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `docs/decisao-territorios-provisorios.md` | Decisão documentada: por que existem, por que não são apagados, como revisar |
| `reports/estado-da-nacao-semear-territorios-034.md` | Este relatório |

---

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `lib/neighborhoods.ts` | Adicionadas funções `getOfficialNeighborhoodsForSelect`, `getAllNeighborhoodsForAdmin`, `formatNeighborhoodLabel` |
| `components/actions/action-form.tsx` | Query filtrada por `status = 'oficial'` + microcopy no select |
| `components/listening-records/listening-record-form.tsx` | Query filtrada por `status = 'oficial'` + microcopy no select |
| `components/actions/actions-list.tsx` | Query filtrada por `status = 'oficial'` no filtro de listagem |
| `components/listening-records/listening-records-list.tsx` | Query filtrada por `status = 'oficial'` no filtro de listagem |
| `components/listening-records/territorial-review-queue.tsx` | Query filtrada por `status = 'oficial'` |
| `components/listening-records/listening-record-detail.tsx` | Query filtrada por `status = 'oficial'` para TerritorialReviewPanel |
| `components/territories/territories-admin-overview.tsx` | Novo painel de split oficial/provisório + aviso sobre ocultação |
| `app/ajuda/page.tsx` | Novo bloco "Territórios oficiais e provisórios" |
| `docs/cadastro-primeira-acao-real.md` | Atualizado com instruções de seleção de território oficial |

---

## Status de /territorios

- Exibe todos os 73 territórios (admin).
- Novo painel com 4 métricas: bairros oficiais (52), territórios provisórios (21), provisórios com vínculo (0), provisórios sem vínculo (21).
- Aviso permanente: "Territórios provisórios estão ocultos dos formulários operacionais. Qualquer limpeza futura deve ser feita por migration própria e revisão humana."
- Filtros de setor, status e cidade preservados para revisão individual.

---

## Confirmações

- **Provisórios não aparecem por padrão:** confirmado. Todos os formulários e filtros operacionais aplicam `.eq("status", "oficial")` antes de popular os selects.
- **Nada foi apagado:** confirmado. Nenhum `DELETE` foi executado. Todos os 73 registros permanecem na tabela `neighborhoods`.
- **Nenhum mapa geográfico criado:** confirmado.
- **Nenhuma geocodificação:** confirmado.
- **Nenhum dado pessoal coletado:** confirmado.

---

## Como cadastrar a primeira ação real

1. Acessar `/acoes/nova`.
2. Preencher título no padrão: `Banca de Escuta — Feira Livre — [território]`.
3. Selecionar tipo `banca_escuta`.
4. Selecionar território no campo Bairro/Território — o select exibe apenas os 52 bairros oficiais.
5. Se o território não aparecer no select, acessar `/territorios` e verificar se está marcado como `oficial`.
6. Não usar território provisório sem aprovação da coordenação.
7. Informar local coletivo (feira, praça, escola, CRAS, associação). Nunca residência.
8. Salvar. Após a banca, usar `/escutas/lote` para digitar fichas.

Roteiro completo: `docs/cadastro-primeira-acao-real.md`.

---

## Riscos restantes

| Risco | Avaliação | Mitigação |
|---|---|---|
| Ação editada que tinha território provisório | Baixo — actions_total = 0 | Select não mostrará o provisório, mas o campo ficará vazio. Tratar quando necessário |
| Novo território provisório criado por engano | Baixo | Área admin visível; formulários operacionais ignoram automaticamente |
| Limpeza manual incorreta dos provisórios | Médio | Documentado em `docs/decisao-territorios-provisorios.md`: delete somente por migration + validação humana |
| Grafia de "Jardim Suiça" e "Santa Inez" | Baixo | Decisão pendente registrada em `docs/decisao-grafia-bairros-oficiais.md` |

---

## Próximo tijolo recomendado

**Tijolo 035 — Primeira Ação Real: Cadastro, Fichas e Fechamento**

Pré-requisitos cumpridos:
- 52 bairros oficiais aplicados no banco remoto.
- Formulários operacionais mostram apenas oficiais.
- Privacidade verificada.
- Roteiro de cadastro atualizado.

Sugestão de escopo:
1. Cadastrar a primeira ação real no banco remoto.
2. Usar `/escutas/lote` para digitar ao menos uma ficha de escuta.
3. Revisar escuta em `/escutas/revisao-territorial`.
4. Gerar devolutiva via `/acoes/[id]/devolutiva`.
5. Fechar dossiê via `/acoes/[id]/dossie`.
6. Conferir relatório mensal em `/relatorios`.
7. Preencher relatório pós-banca.
