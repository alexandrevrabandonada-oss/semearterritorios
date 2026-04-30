# Estado da Nação — SEMEAR Territórios 017

## Diagnóstico pós-uso

Este tijolo preparou o fechamento da primeira operação real. Nesta sessão não houve acesso direto ao banco de produção/homologação com dados reais da banca, portanto os números operacionais abaixo devem ser preenchidos pela coordenação após consulta ao ambiente real:

- Ações reais cadastradas:
- Escutas reais digitadas:
- Escutas em rascunho:
- Escutas revisadas:
- Alertas de possível dado sensível:
- Devolutiva gerada: sim / não
- Devolutiva aprovada: sim / não
- Dossiê fechado: sim / não
- Relatório mensal reconheceu a ação: sim / não

O app já possui os pontos para levantar esses dados em `/`, `/acoes/[id]/piloto`, `/acoes/[id]/devolutiva`, `/acoes/[id]/dossie` e `/relatorios/[mes]`.

## Documentos criados

- `docs/relatorio-pos-banca-template.md`
- `docs/checklist-fechamento-primeira-banca.md`

## Ajustes pequenos feitos

- Dashboard recebeu card “Última operação”.
- Relatório mensal reforça que copiar/exportar usa texto-base determinístico oficial, sem IA generativa.

## Dados gerais da primeira operação

Não preenchidos nesta sessão por falta de acesso ao ambiente real. Usar `docs/relatorio-pos-banca-template.md` para registrar:

- data da banca;
- local;
- equipe;
- fichas em papel;
- fichas digitadas;
- escutas revisadas;
- temas, palavras, lugares e prioridades;
- problemas de operação;
- problemas no app;
- decisões de ajuste.

## Problemas encontrados

Nenhum erro técnico foi identificado em lint/build. Problemas reais de uso devem ser registrados no relatório pós-banca.

## Decisões tomadas

- Não criar feature grande.
- Não alterar RLS.
- Não ampliar IA.
- Não criar mapa/PWA/página pública.
- Consolidar o pós-banca em documentos e um card operacional no dashboard.

## Status da devolutiva

O status deve ser conferido em `/acoes/[id]/devolutiva` ou no card “Última operação” do dashboard:

- não criada;
- rascunho;
- revisada;
- aprovada.

## Status do dossiê

O status deve ser conferido em `/acoes/[id]/dossie`, `/acoes/[id]`, relatório mensal ou dashboard:

- aberto;
- em revisão;
- fechado;
- reaberto.

## Status do relatório mensal

O relatório mensal já mostra:

- ação do mês;
- escutas do mês;
- pendências;
- status do dossiê;
- devolutiva aprovada ou não;
- cópia/exportação determinística.

## Recomendação para o próximo tijolo

Antes de avançar para mapa geográfico real ou PWA/offline, preencher o relatório pós-banca com dados reais e priorizar correções pequenas observadas pela equipe. Se o uso real estiver estável, o próximo tijolo pode ser “Ajustes Pós-Banca e Priorização do Mapa”.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
