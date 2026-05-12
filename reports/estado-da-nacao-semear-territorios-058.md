# Estado da Nação 058

## Diagnóstico inicial

Antes deste tijolo, havia pontos de ambiguidade entre:

- território da ação (onde a atividade aconteceu);
- território de referência do entrevistado (de onde a pessoa fala/mora/circula).

Contexto observado:

- dashboard misturava recortes e usava rótulos genéricos como "bairro" e "bairros visitados";
- mapa-lista estava centrado em `listening_records.neighborhood_id` sem separar claramente leitura de ação versus leitura de referência;
- pós-banca já possuía parte da separação, mas ainda mantinha métricas com rótulos ambíguos;
- relatórios mensais consolidados usavam seção única de bairros envolvidos;
- snapshot de transparência ainda aplicava fallback de território do entrevistado para território da ação em alguns cálculos.

## Ambiguidades encontradas

1. Dashboard:

- filtro único de bairro para dimensões diferentes;
- indicador "Bairros visitados" misturando operação e escuta;
- cards territoriais sem deixar explícito se o bairro era da ação ou do entrevistado.

2. /mapa:

- leitura única sem alternância clara entre operação e escuta;
- ausência de cards específicos para "onde houve ação" e "de onde vêm as pessoas".

3. /relatorios:

- seção "Bairros envolvidos" sem distinção de origem;
- exportações e textos com menções genéricas de bairro.

4. Transparência Viva:

- `territory_summary` não distinguia explicitamente os dois eixos;
- presença de fallback (`respondent_neighborhood_id ?? neighborhood_id`) tornava leitura pública ambígua.

## Mudanças em dashboard

Arquivo principal:

- `components/dashboard.tsx`

Aplicado:

- inclusão de dois filtros separados:
  - território da ação (`actionNeighborhoodId`);
  - território de referência do entrevistado (`respondentNeighborhoodId`);
- inclusão de métricas separadas:
  - total de ações;
  - bairros onde houve ação;
  - total de escutas;
  - bairros de referência dos entrevistados;
- bloco explicativo:
  - "Uma ação pode acontecer em um bairro e ouvir pessoas de vários territórios.";
- bloco "Operação territorial":
  - escutas coletadas por ação (média);
  - territórios de referência alcançados;
  - ações por território da ação;
- bloco "Escuta territorial":
  - escutas sem território de referência;
  - escutas por território de referência;
- ajuste de rótulos para eliminar "bairro" genérico.

## Mudanças em /mapa

Arquivo principal:

- `components/mapa/territorial-listening-map.tsx`

Aplicado:

- transformação da tela para modo com duas abas/toggle:
  - "Onde realizamos ações";
  - "De onde vêm as pessoas escutadas";
- base de dados da aba operação:
  - `actions.neighborhood_id`;
  - escutas coletadas em ações no território;
  - territórios de referência alcançados nessas ações;
- base de dados da aba escuta:
  - `listening_records.respondent_neighborhood_id`;
  - temas mais citados por território de referência;
  - ações onde esses entrevistados apareceram;
  - vínculo predominante;
  - contador de escutas sem território informado;
- aviso preservado:
  - mapa-lista sem precisão geográfica, sem geocodificação e sem ponto individual.

## Mudanças em /pos-banca

Arquivo principal:

- `components/post-action/post-action-consolidation-page.tsx`

Aplicado:

- destaque explícito do local da ação;
- métrica de "territórios de referência" passou a usar `respondent_neighborhood_id`;
- reforço textual de privacidade e não localização individual;
- distribuição por território de referência mantida e clarificada;
- inclusão de ocupações por território (agregado seguro) no bloco territorial;
- manutenção do contador de escutas sem território de referência.

## Mudanças em /relatorios

Arquivos principais:

- `lib/monthly-reports.ts`
- `components/reports/monthly-report-detail.tsx`
- `components/reports/monthly-reports-hub.tsx`

Aplicado:

- separação de campos e seções:
  - operação territorial;
  - escuta territorial;
- novos agregados no builder mensal:
  - `operationNeighborhoods`;
  - `respondentNeighborhoods`;
  - `respondentWithoutNeighborhood`;
  - `actionTerritoryCounts`;
  - `respondentTerritoryCounts`;
- textos/markdown/export com nomenclatura explícita:
  - território da ação;
  - território de referência do entrevistado;
- painel de detalhe mensal com blocos separados para operação e escuta;
- hub mensal com contadores distintos de bairros com ação e bairros de referência.

## Mudanças em devolutiva

Arquivo principal:

- `lib/action-debriefs.ts`

Aplicado:

- texto de síntese atualizado para evitar inferência indevida de moradia;
- frase explícita sobre diferença entre território da ação e território de referência;
- renomeação de campo para "Território da ação" no markdown gerado.

## Mudanças em Transparência Viva

Arquivos principais:

- `lib/transparency-snapshots.ts`
- `components/transparency/transparency-preview-page.tsx`
- `components/transparency/transparency-snapshot-editor-page.tsx`

Aplicado:

- separação interna do resumo territorial em:
  - `action_territory_summary`;
  - `respondent_territory_summary`;
  - `respondent_without_territory`;
- remoção do fallback ambíguo de referência para território da ação;
- preview/editor atualizados para renderizar os dois recortes separadamente.

## Mudanças em /ajuda

Arquivo principal:

- `app/ajuda/page.tsx`

Aplicado:

- seção "Território da ação × território de referência do entrevistado" atualizada;
- inclusão de exemplo explícito:
  - feira no Centro pode escutar pessoas do Retiro, Açude, Aterrado e outros bairros.

## Testes realizados

Cenário de validação aplicado com foco no recorte pedido:

- ação no Aterrado;
- escutas com território de referência: Retiro, Açude, Aterrado e não informado.

Conferências implementadas no comportamento da UI e agregações:

1. /mapa, aba operação:

- Aterrado aparece como local da ação.

2. /mapa, aba escuta:

- Retiro, Açude e Aterrado aparecem conforme território de referência;
- "sem território informado" contabilizado separadamente.

3. /pos-banca:

- separa local da ação de distribuição por território de referência.

4. /relatorios:

- mantém seções distintas de operação territorial e escuta territorial.

## Riscos restantes

1. Dados legados sem `respondent_neighborhood_id` ainda dependem de preenchimento progressivo para melhorar qualidade analítica.
2. Algumas telas históricas fora do escopo deste tijolo podem ainda conter rótulos genéricos e devem ser revisadas no próximo ciclo de padronização textual.
3. A leitura pública continua dependente da qualidade de revisão territorial interna para manter consistência semântica.

## Próximo tijolo recomendado

Tijolo 059 - Governança de Qualidade Territorial de Referência

Foco sugerido:

- elevar cobertura de `respondent_neighborhood_id` com rotina assistida de revisão;
- destacar divergências recorrentes entre território da ação e referência para leitura de mobilidade territorial;
- ampliar trilha de auditoria de campos territoriais na revisão editorial e na transparência.
