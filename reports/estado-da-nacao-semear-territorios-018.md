# Estado da Nação — SEMEAR Territórios 018

## Diagnóstico inicial

Foram revisados:

- `docs/relatorio-pos-banca-template.md`;
- `docs/checklist-fechamento-primeira-banca.md`;
- card “Última operação” no dashboard;
- `/acoes/[id]/piloto`;
- `/acoes/[id]/devolutiva`;
- `/acoes/[id]/dossie`;
- `/relatorios/[mes]`;
- `/ajuda`.

O sistema já permite consultar piloto, devolutiva, dossiê e relatório mensal para preencher os dados reais da primeira banca. Ainda não há uma tela dedicada para registrar o relatório pós-banca dentro do app; por enquanto o fluxo é documental e interno, o que reduz risco e evita feature grande antes de validar o uso real.

## Documentos criados

- `docs/decisao-pos-banca-e-proximo-passo.md`
- `docs/matriz-priorizacao-mapa.md`

## Ajustes feitos

- Card “Última operação” agora mostra:
  - nome da ação;
  - data;
  - total de escutas;
  - revisadas;
  - rascunhos;
  - status da devolutiva;
  - status do dossiê;
  - botões “Abrir ação”, “Ver piloto” e “Ver dossiê”.
- `/ajuda` recebeu bloco “Antes de avançar”.
- Microcopy reforçada em piloto, dossiê e relatório mensal.

## Estado do card “Última operação”

O card usa os dados já carregados no dashboard, sem consulta pesada adicional. Se houver ação recente, resume a operação mais recente e oferece atalhos. Se não houver ação, orienta cadastrar a primeira ação e usar digitação em lote após a banca.

## Como usar o documento de decisão pós-banca

Preencher `docs/decisao-pos-banca-e-proximo-passo.md` após concluir:

- relatório pós-banca;
- devolutiva;
- dossiê;
- conferência do relatório mensal.

O documento transforma os dados reais em decisão: mapa, melhoria operacional, relatório institucional, devolutiva, offline/PWA ou outro caminho.

## Como usar a matriz de priorização do mapa

Preencher `docs/matriz-priorizacao-mapa.md` com evidências:

- público do mapa;
- bairros suficientes;
- escutas revisadas suficientes;
- qualidade de lugares mencionados;
- risco de exposição;
- necessidade real de GeoJSON;
- tipo de mapa recomendado.

## Recomendação técnica: mapa agora ou depois

**Recomendação: mapa depois.**

Motivo: ainda não há números reais consolidados nesta sessão. O critério recomendado é avançar para mapa territorial aprimorado somente se houver pelo menos 20 escutas revisadas e 3 ou mais bairros/territórios com dados agregados de qualidade. Até lá, a prioridade deve ser preencher o relatório pós-banca, fechar dossiê, conferir relatório mensal e validar a matriz.

## Dados mínimos faltantes

- Quantidade real de escutas revisadas.
- Quantidade de bairros/territórios envolvidos.
- Qualidade dos lugares mencionados.
- Status real da devolutiva.
- Status real do dossiê.
- Decisão pós-banca registrada.

## Escopo sugerido para futuro Tijolo do Mapa

Se a matriz recomendar mapa, o próximo tijolo deve ser restrito a:

- mapa interno autenticado;
- agregação por bairro/território;
- temas por bairro;
- intensidade de escuta por território;
- sem falas originais;
- sem endereço pessoal;
- sem página pública.

## Riscos restantes

- Criar mapa cedo demais pode expor território ou sugerir precisão que os dados ainda não têm.
- Lugares mencionados podem estar incompletos, ambíguos ou sensíveis.
- Relatório pós-banca ainda depende de preenchimento humano.
- A decisão de mapa precisa ser validada com coordenação.

## Próximo tijolo sugerido

“Tijolo 019 — Consolidação do Relatório Pós-Banca e Escopo do Mapa Interno”, caso a equipe preencha a decisão pós-banca e a matriz indique volume suficiente. Se não houver volume suficiente, o próximo tijolo deve priorizar refinamento de digitação/revisão.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
