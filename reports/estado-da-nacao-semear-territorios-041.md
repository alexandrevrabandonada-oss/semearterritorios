# Estado da nação — Tijolo 041: Ocupação / atividade principal do entrevistado

**Data de conclusão:** 2026-05-06  
**Status:** ✅ Concluído — campo opcional implantado, agregações seguras adicionadas e validações executadas

---

## 1. Diagnóstico inicial

Foram verificados os pontos solicitados do fluxo SEMEAR:

- Schema da tabela `listening_records` e tipagem em `lib/database.types.ts`
- Formulários de escuta: `/escutas/nova` e `/escutas/lote`
- Detalhe/edição de escuta: `/escutas/[id]`
- Listagem/filtros de escutas: `/escutas`
- Fila de revisão territorial: `/escutas/revisao-territorial`
- Consolidação pós-banca: `/pos-banca`
- Devolutiva e dossiê da ação: `/acoes/[id]/devolutiva` e `/acoes/[id]/dossie`
- Relatórios mensais e exportação CSV em `/relatorios`
- Conteúdo operacional em `/ajuda`

Conclusão do diagnóstico: o melhor encaixe foi reutilizar o fluxo já existente de privacidade/sensibilidade, adicionando um campo textual opcional com alerta não bloqueante e uso apenas agregado em saídas institucionais.

---

## 2. Migration criada

Arquivo criado:

- `supabase/migrations/20260506110000_add_respondent_occupation_to_listening_records.sql`

Mudanças:

- `ALTER TABLE listening_records ADD COLUMN respondent_occupation text NULL`
- `COMMENT ON COLUMN` com regra explícita de não coletar empregador/local específico
- índice `idx_listening_records_respondent_occupation`

---

## 3. Campos adicionados

Banco:

- `listening_records.respondent_occupation` (nullable)

Tipagem TypeScript:

- `ListeningRecord.respondent_occupation: string | null` em `lib/database.types.ts`

---

## 4. Telas alteradas

### 4.1 /escutas/lote

Arquivo: `components/listening-records/listening-record-batch-form.tsx`

- Adicionado campo opcional `Ocupação / atividade principal`
- Placeholder: `Ex.: aposentada, estudante, comerciante, trabalhador da indústria`
- Microcopy de privacidade:
  - "Campo opcional. Não registre nome da empresa, escola, setor específico ou local de trabalho."
- Persistência em `payload.respondent_occupation`
- Alerta não bloqueante quando houver indício identificável:
  - "Verifique se a ocupação não identifica a pessoa. Prefira descrição geral."

### 4.2 /escutas/nova e /escutas/[id] (edição)

Arquivo: `components/listening-records/listening-record-form.tsx`

- Mesmo campo opcional, placeholder e microcopy
- Carregamento em modo edição
- Salvamento em create/update
- Mesmo alerta não bloqueante de privacidade

### 4.3 /escutas/[id] (detalhe/revisão)

Arquivo: `components/listening-records/listening-record-detail.tsx`

- Exibição de `Ocupação / atividade principal (opcional)`
- Alerta de revisão de privacidade quando o texto parecer identificável

### 4.4 /escutas/revisao-territorial

Arquivo: `components/listening-records/territorial-review-queue.tsx`

- Exibição da ocupação no card de revisão
- Alerta de risco de identificação por ocupação

### 4.5 /escutas (listagem)

Arquivo: `components/listening-records/listening-records-list.tsx`

- Badge discreta de ocupação no card
- Filtro por ocupação
- Busca textual por ocupação

### 4.6 /pos-banca

Arquivo: `components/post-action/post-action-consolidation-page.tsx`

- Nova seção: `Escutas por ocupação / atividade principal`
- Exibe ocupações mais citadas com contagem
- Exibe temas recorrentes por ocupação (quando simples)
- Exibe total sem ocupação informada
- Proteção de privacidade:
  - baixa frequência/risco agrupadas como "outras ocupações"
  - aviso de ocupações com possível detalhamento identificável

### 4.7 /acoes/[id]/devolutiva

Arquivo: `lib/action-debriefs.ts`

- Devolutiva passou a incluir leitura agregada de ocupação em texto seguro
- Inclusão de seção agregada em "Principais achados"
- Inclusão de contagens de sem informação e agrupadas por risco/baixa frequência

### 4.8 /acoes/[id]/dossie

Arquivo: `components/actions/action-dossier-page.tsx`

- Painel determinístico inclui ocupações agregadas
- Métrica de escutas sem ocupação informada

### 4.9 /relatorios

Arquivos:

- `lib/monthly-reports.ts`
- `components/reports/monthly-report-detail.tsx`

Mudanças:

- leitura agregada de ocupações no dataset mensal
- seção de ocupações no markdown/texto mensal
- painel visual no detalhe do relatório

### 4.10 /ajuda

Arquivo: `app/ajuda/page.tsx`

- Nova seção `Ocupação / atividade principal` com:
  - campo opcional
  - objetivo analítico agregado
  - exemplos de registro geral
  - proibição de empresa/escola/setor/local específico
  - orientação para revisar ocupações raras/específicas antes de uso público

---

## 5. Filtros criados

Em `/escutas`:

- `Ocupação` (filtro direto)
- `Busca textual de ocupação`
- Badge de ocupação no card para leitura rápida

---

## 6. Alterações em /pos-banca

Implementado bloco agregado de ocupação com foco em segurança:

- top ocupações por quantidade
- temas recorrentes por ocupação (resumo curto)
- contagem sem ocupação
- agregação automática para baixa frequência/risco

---

## 7. Alterações em devolutiva/dossiê/relatórios

- **Devolutiva:** ocupações agregadas no texto institucional
- **Dossiê:** ocupações agregadas no painel de síntese
- **Relatório mensal:** ocupações agregadas em texto/markdown e no detalhe visual
- **CSV mensal:** nova coluna `ocupacao_atividade_principal`

---

## 8. Garantias de privacidade

Atendido no tijolo:

- ✅ Campo não obrigatório (`NULL` no schema e UX opcional)
- ✅ Sem coleta de empregador/local de trabalho específico no desenho funcional
- ✅ Alerta não bloqueante de revisão quando a ocupação parecer identificável
- ✅ Uso institucional agregado em pós-banca/devolutiva/dossiê/relatórios
- ✅ Agrupamento de baixa frequência/risco para reduzir risco de reidentificação
- ✅ Nenhuma criação de mapa por ocupação
- ✅ Nenhum score/classificação individual por ocupação
- ✅ Compatível com escutas já existentes

---

## 9. Exportação CSV

Arquivo: `lib/monthly-reports.ts`

Adicionada coluna:

- `ocupacao_atividade_principal`

Categoria de ocupação separada **não foi criada** para manter simplicidade e menor custo de manutenção nesta fase.

---

## 10. Verificação executada

Comandos executados:

- `npm run lint` ✅
- `npm run build` ✅
- `npm run verify` ✅

Observação:

- Apareceu aviso de cache do webpack durante build, sem bloquear compilação.

---

## 11. Riscos restantes

- Campo textual livre ainda depende de revisão humana para qualidade semântica.
- Ocupações ambíguas (ex.: texto muito amplo ou pouco padronizado) podem dificultar comparabilidade longitudinal.
- Como não há categoria estruturada neste tijolo, análises comparativas avançadas exigirão normalização posterior.

---

## 12. Próximo tijolo recomendado

**Tijolo 042 — Normalização leve de ocupações (sem exposição individual)**

Sugestão de escopo:

- criar tabela/opções de categoria ocupacional controlada (mantendo texto livre opcional)
- assistente de revisão para mapear texto livre → categoria
- regras de supressão automática por baixa frequência em saídas públicas
- sem tornar obrigatório e sem identificar pessoa
