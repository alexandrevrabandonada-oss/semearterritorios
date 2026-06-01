# Conferência do relatório mensal interpretativo - Abril de 2026

## Dados conferidos

Cenário de homologação do mês de abril de 2026:

- ações: 2;
- escutas: 99;
- cobertura territorial: 34,3%;
- escutas sem território de referência: 65;
- temas principais: ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos.

A consulta anônima ao Supabase retornou 0 registros por restrição de acesso/autenticação nesta sessão. Por isso, a conferência automatizada foi feita com massa local determinística reproduzindo o cenário informado, sem criar dados no banco e sem publicar nada.

## Problemas encontrados

1. O PDF impresso ainda não respeitava totalmente o modo público, pois a folha de impressão recebia apenas o relatório e não o modo selecionado.
2. O modo público herdava aprendizados/encaminhamentos com menção a pendências internas.
3. O agrupamento de prioridades usava somente as 8 prioridades mais frequentes, o que podia ocultar termos novos que deveriam cair em "Outros".
4. A classificação por palavra-chave capturava trechos internos de palavras, como "ar" dentro de outras palavras, deslocando alguns exemplos para macroeixos errados.

## Ajustes realizados

- PDF passou a receber o modo interno/público.
- Pendências, CSV e status de dossiê/devolutiva foram ocultados do modo público.
- Aprendizados e encaminhamentos públicos passaram a filtrar menções a pendências internas.
- Agrupamento de prioridades passou a considerar todas as prioridades abertas antes de exibir os rankings.
- Regex de classificação foi ajustada para evitar captura de sílabas dentro de palavras.
- Novo teste automatizado `tests/monthly-reports.test.ts` cobre abril de 2026, modo público, agrupamentos e sanitização.
- `npm run verify` passou a executar também `npm run test:reports`.

## Status do PDF

Status: aprovado por revisão de código e build.

Limitação: a inspeção visual autenticada da rota real não foi concluída nesta sessão porque a página exige login. O fluxo de impressão foi revisado no componente e o build validou a rota `/relatorios/[mes]`.

## Status do modo público

Status: aprovado nos testes determinísticos.

Confirmações:

- não exibe pendências internas no Markdown público;
- não exibe fala bruta;
- não exibe campo técnico `respondent_neighborhood_id`;
- não exibe status raw como `draft`;
- remove CSV e detalhes de dossiê/devolutiva da tela pública;
- mantém nota metodológica e cautela territorial.

## Status do modo interno

Status: aprovado para uso de coordenação.

Confirmações:

- mantém pendências operacionais;
- mostra qualidade territorial;
- mostra ações sem dossiê fechado;
- mostra status de dossiê/devolutiva;
- mantém alertas metodológicos;
- mantém encaminhamentos de revisão.

Relatórios semanais relacionados continuam disponíveis no hub de relatórios, não como nova camada dentro do detalhe mensal.

## Pronto para uso institucional

O relatório mensal interpretativo está pronto para uso institucional interno e para preparação de versão pública, desde que haja revisão humana antes do envio externo.

Com cobertura territorial crítica, o relatório deve permanecer sem conclusão forte por bairro.

## Pendências restantes

- Validar visualmente o PDF com usuário autenticado e dados reais carregados.
- Registrar decisão humana antes de envio para UFF/APS/FEC.
- Manter novas análises, IA, OCR e mapas fora deste fechamento.
