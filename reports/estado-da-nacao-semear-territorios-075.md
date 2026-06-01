# Estado da Nação - SEMEAR Territórios - Tijolo 075

## Diagnóstico inicial

O Tijolo 074 deixou o relatório mensal interpretativo funcional, mas ainda precisava de fechamento técnico/editorial. A homologação exigia confirmar verificações, linguagem pública, PDF, agrupamentos, sinais qualitativos, modo interno e modo público.

Durante a homologação, foram encontrados quatro pontos de ajuste:

- o PDF impresso ainda não recebia explicitamente o modo interno/público;
- textos públicos ainda podiam mencionar pendências internas nos aprendizados/encaminhamentos;
- o agrupamento de prioridades usava apenas as prioridades mais frequentes, podendo ocultar termos novos que deveriam cair em "Outros";
- classificadores por palavra-chave podiam capturar trechos internos de palavras.

## Resultado do `npm run verify`

Verificação final executada com sucesso:

- `npm run lint`: passou;
- `npm run build`: passou;
- `npm run test:reports`: passou, 4 testes;
- `npm run test:transparencia`: passou, 14 testes;
- `npm run verify`: passou.

O script `verify` agora inclui os testes do relatório mensal interpretativo.

## Validação do relatório de abril

Cenário homologado por teste determinístico:

- 2 ações;
- 99 escutas;
- 34,3% de cobertura territorial;
- 65 escutas sem território de referência;
- temas principais: ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos.

Confirmações:

- não gera conclusão forte por bairro com cobertura crítica;
- nota metodológica aparece no relatório;
- leitura executiva cita o alerta metodológico;
- prioridades aparecem agrupadas por macroeixo;
- sinais qualitativos usam exemplos sanitizados;
- encaminhamentos aparecem no fechamento;
- modo público remove pendências internas do Markdown;
- modo público não exibe fala bruta nem campo técnico.

A tentativa de consulta anônima ao Supabase retornou 0 registros por restrição de acesso/autenticação. A validação com dados reais carregados na tela ainda depende de sessão autenticada.

## Validação do PDF

O PDF foi corrigido para respeitar o modo selecionado:

- versão interna mantém pendências de revisão;
- versão pública remove pendências de revisão;
- capa informa se a versão é interna ou pública;
- aprendizados e encaminhamentos públicos não carregam pendências internas.

Validação visual completa do PDF com dados reais segue pendente por exigir sessão autenticada no navegador.

## Validação do modo público

O modo público foi revisado para não mostrar:

- pendências internas;
- CSV operacional;
- status de dossiê/devolutiva;
- lista bruta;
- fala original;
- campo técnico `respondent_neighborhood_id`;
- status raw como `draft`;
- dado pessoal nos exemplos testados.

O texto público mantém linguagem de devolutiva/prestação e reforça cautela territorial quando a cobertura está crítica.

## Validação do modo interno

O modo interno continua útil para coordenação:

- mostra pendências operacionais;
- mostra qualidade territorial;
- mostra ações sem dossiê fechado;
- mostra status de dossiê e devolutiva;
- mantém alertas metodológicos;
- mantém encaminhamentos de revisão;
- mantém anexo técnico agregado.

Relatórios semanais relacionados permanecem no hub de relatórios, sem criar nova feature dentro do detalhe mensal.

## Ajustes de linguagem

Foram revisados termos automáticos ruins. O relatório evita `acao(oes)` e `escuta(s)` na saída institucional.

Também foram removidas menções públicas a "fala original" no anexo público, substituindo por linguagem institucional sobre lista bruta, dado pessoal e campo técnico.

## Conferência de dados sensíveis

O teste de relatório valida sanitização de:

- e-mail;
- telefone;
- número longo semelhante a identificador;
- fala bruta no modo público;
- campo técnico territorial.

Não houve alteração em RLS, schema, publicação, IA, OCR ou mapa.

## Documentos criados

- `docs/homologacao-relatorio-mensal-interpretativo.md`
- `reports/conferencia-relatorio-abril-2026.md`
- `reports/estado-da-nacao-semear-territorios-075.md`
- `tests/monthly-reports.test.ts`

## Riscos restantes

- Falta validar visualmente o PDF com usuário autenticado e dados reais.
- A consulta anônima não acessa o relatório real por restrição de autenticação/RLS.
- O agrupamento por palavras-chave é determinístico e conservador; termos novos continuam indo para "Outros" até revisão humana.
- A publicação externa ainda depende de decisão humana e checklist antes de envio para UFF/APS/FEC.

## Próximo tijolo recomendado

Próximo tijolo recomendado: validação assistida com usuário autenticado do fluxo `/relatorios/2026-04`, incluindo captura de PDF interno e público, sem adicionar novas análises, IA, OCR ou mapa.
