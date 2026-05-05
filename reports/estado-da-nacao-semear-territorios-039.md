# Estado da nação — Tijolo 039: Território de referência do entrevistado

**Data de conclusão:** 2025-05  
**Status:** ✅ Concluído — lint, build e verify passando

---

## 1. Diagnóstico inicial

Antes deste tijolo, o sistema registrava apenas o bairro onde a **banca aconteceu** (território da ação). Não havia nenhuma forma de capturar o bairro de referência da pessoa escutada — onde ela mora, trabalha, estuda ou circula.

Isso limitava análises de origem territorial das falas: não era possível saber se as pessoas escutadas em um bairro vinham todas dali ou de outras regiões da cidade.

---

## 2. Modelagem de dados e migration

**Arquivo criado:** `supabase/migrations/20260505120000_add_respondent_territory_to_listening_records.sql`

Três campos nullable adicionados à tabela `listening_records`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `respondent_city` | `text NULL` | Município de referência (ex: "Volta Redonda") |
| `respondent_neighborhood_id` | `uuid NULL` (FK → `neighborhoods.id`) | Bairro oficial de referência do entrevistado |
| `respondent_territory_relation` | `text NULL` | Vínculo: mora, trabalha/estuda, circula, fala_sobre, nao_informado |

- FK com `ON DELETE SET NULL` para segurança referencial
- Índice criado em `respondent_neighborhood_id` para filtros eficientes
- Nenhum campo é obrigatório — privacidade garantida desde a modelagem

---

## 3. Tipos TypeScript atualizados

**Arquivo:** `lib/database.types.ts`

- Novo union type: `RespondentTerritoryRelation = "mora" | "trabalha_estuda" | "circula" | "fala_sobre" | "nao_informado"`
- 3 novos campos adicionados ao tipo `ListeningRecord`
- Nova FK adicionada ao array `Relationships` do tipo genérico do banco

**Arquivo:** `lib/listening-records.ts`

- `respondentTerritoryRelationOptions`: array com 5 opções e rótulos em português
- `getRespondentTerritoryRelationLabel()`: função que retorna label dado um valor ou null

---

## 4. Formulários operacionais atualizados

### /escutas/lote (`components/listening-records/listening-record-batch-form.tsx`)
- Seção "Território de referência do entrevistado" adicionada ao formulário de lote
- Microcopy: "Registre apenas o território agregado de referência da pessoa. Não registre rua, número ou endereço."
- Select de bairro só aparece quando município = "Volta Redonda"
- Campos do entrevistado são preservados entre fichas consecutivas (útil em bancas com público fixo)

### /escutas/nova (`components/listening-records/listening-record-form.tsx`)
- Mesma seção adicionada ao formulário individual
- Modo de edição carrega os campos a partir do registro existente
- Lógica condicional idêntica ao lote

---

## 5. Listagens e filtros

### /escutas (`components/listening-records/listening-records-list.tsx`)
- Query atualizada com join: `respondent_neighborhoods:respondent_neighborhood_id(id, name)`
- 3 novos filtros: município de referência, bairro de referência, vínculo
- Novo filtro de qualidade: "Sem território de referência"
- Card de escuta exibe badge azul com bairro + vínculo quando preenchido

### /escutas/revisao-territorial (`components/listening-records/territorial-review-queue.tsx`)
- Filtro de bairro da ação renomeado para maior clareza
- Novo filtro: "Bairro de referência"
- Badge âmbar "Sem território de referência" quando vazio
- Badge de referência quando preenchido: "Ref.: [bairro] · [vínculo]"

---

## 6. /pos-banca

**Arquivo:** `components/post-action/post-action-consolidation-page.tsx`

- Nova seção "Leitura por território de referência do entrevistado" inserida no painel de consolidação
- Agrupa escutas por `respondent_neighborhood_id`, exibindo:
  - Contagem de escutas por bairro de referência
  - Vínculos predominantes
  - Temas mais citados
  - Palavras recorrentes
  - Prioridades mencionadas
- Seção só renderiza quando há ao menos 1 escuta com território de referência
- Rodapé indica quantas escutas não têm território de referência

---

## 7. Devolutiva, dossiê e relatórios

### Devolutiva (`lib/action-debriefs.ts`)
- Nova função `buildRespondentTerritorySection()` gera seção markdown
- Seção "## Leitura por território de referência do entrevistado" inserida entre "Próximos passos" e "Nota metodológica"
- Agrupa por bairro de referência, mostra vínculos, palavras recorrentes, prioridades

### Relatórios mensais (`lib/monthly-reports.ts`, `components/reports/monthly-report-detail.tsx`)
- `RecordWithRelations` atualizado com `respondent_neighborhoods` opcional
- Query do componente atualizada com join para `respondent_neighborhood_id`
- `buildMonthlyReportMarkdown()` ganhou seção "## Territorio de referencia do entrevistado"
- `buildMonthlyReportCsv()` ganhou 3 novas colunas: `municipio_referencia_entrevistado`, `bairro_referencia_entrevistado`, `vinculo_territorio`

---

## 8. Visão agregada /territorios

**Arquivo:** `components/territories/territories-admin-overview.tsx`

- Query atualizada para incluir `respondent_neighborhood_id` nas escutas
- 4 novos campos no tipo `TerritoryUsageSummary`: `neighborhoodsWithRespondentRef`, `recordsWithRespondentRef`, `respondentByNeighborhood` (Map), `actionByNeighborhood` (Map)
- Novo painel "Escutas por território de referência do entrevistado" exibido quando há dados
- Cards por bairro mostram contagem de referências e sobreposição com ações no mesmo bairro

---

## 9. /ajuda

**Arquivo:** `app/ajuda/page.tsx`

- Novo painel: "Território da ação × território de referência do entrevistado"
- Explica a diferença entre os dois conceitos
- Alerta explícito: nunca registrar rua, número, CEP ou coordenada — apenas bairro oficial

---

## 10. Garantias de privacidade

- Todos os 3 campos são nullable — nunca obrigatórios
- Não há coleta de endereço, CEP, coordenada ou qualquer dado mais fino que bairro
- Bairro de referência só é salvo para Volta Redonda (cidade com lista oficial)
- Microcopy em todos os formulários reforça a regra de não coletar endereço pessoal
- Seção /ajuda documenta o princípio para a equipe

---

## 11. Correções técnicas aplicadas

- Supabase TypeScript inference com dupla FK para `neighborhoods`: resolvido com `as unknown as` nos casts necessários (comportamento esperado do Supabase codegen)
- Iteradores de `Map` e `Set` com target ES5: substituído `[...x.entries()]` por `Array.from(x.entries())` em todos os arquivos afetados

---

## 12. Arquivos alterados (resumo)

| Arquivo | Tipo de alteração |
|---------|-------------------|
| `supabase/migrations/20260505120000_...sql` | Criado |
| `lib/database.types.ts` | Atualizado |
| `lib/listening-records.ts` | Atualizado |
| `lib/action-debriefs.ts` | Atualizado |
| `lib/monthly-reports.ts` | Atualizado |
| `components/listening-records/listening-record-batch-form.tsx` | Atualizado |
| `components/listening-records/listening-record-form.tsx` | Atualizado |
| `components/listening-records/listening-records-list.tsx` | Atualizado |
| `components/listening-records/territorial-review-queue.tsx` | Atualizado |
| `components/post-action/post-action-consolidation-page.tsx` | Atualizado |
| `components/reports/monthly-report-detail.tsx` | Atualizado |
| `components/reports/monthly-reports-hub.tsx` | Atualizado |
| `components/territories/territories-admin-overview.tsx` | Atualizado |
| `components/dashboard.tsx` | Atualizado |
| `app/ajuda/page.tsx` | Atualizado |

---

## 13. Riscos residuais

- **Subpreenchimento:** O campo é opcional e depende de a equipe perguntar e a pessoa aceitar compartilhar. Análises por território de referência só serão confiáveis com volume suficiente de registros.
- **Municípios além de VR:** Bairros de outras cidades não têm lista oficial no sistema. O campo `respondent_city` captura o texto livre, mas `respondent_neighborhood_id` só é salvo para Volta Redonda.
- **Viés de seleção:** Pessoas que declaram seu território de referência podem não ser representativas do total.

---

## 14. Próximo tijolo recomendado

**Tijolo 040 — Análise cruzada: território da ação vs. território de referência**

Quando houver volume suficiente de dados (≥50 escutas com referência), criar um painel comparativo que mostre:
- Proporção de escutas "locais" (referência = território da ação) vs. "externas"
- Mapa de fluxo entre bairros de origem e bairros de ação
- Filtro por período para ver evolução temporal

Pré-condição: migration deste tijolo aplicada em produção e equipe treinada no novo campo.
