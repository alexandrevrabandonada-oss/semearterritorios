# Estado da Nação - SEMEAR Territórios - Tijolo 076b

## Login autenticado

O login manual funcionou.

Ambiente validado:

- rota: `/relatorios/2026-04`;
- URL local: `http://127.0.0.1:3077/relatorios/2026-04`;
- navegador: Chrome;
- perfil: `Pessoa 1`.

A rota carregou o relatório real após a sessão autenticada.

## Dados reais conferidos

Dados exibidos na tela real:

- ações: 2;
- escutas: 99;
- cobertura territorial: 34.3%;
- escutas sem território de referência: 65;
- temas principais presentes: ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos.

Não foi encontrada conclusão forte por bairro. A leitura manteve alerta metodológico de cobertura crítica.

## Validação do modo interno

Modo interno aprovado.

Confirmado na tela:

- pendências operacionais;
- qualidade territorial;
- alerta de ações sem dossiê fechado;
- status de dossiê;
- status de devolutiva;
- alertas metodológicos;
- encaminhamentos de revisão.

Não foram encontrados:

- `undefined`;
- `NaN`;
- status cru em inglês;
- campo técnico.

## Validação do modo público

Modo público aprovado após ajuste.

Na primeira validação, o modo público ainda mostrava:

- card/painel de pendências internas;
- ocorrência textual da expressão "fala bruta" em encaminhamento/Markdown.

Ajustes feitos:

- modo público deixou de renderizar card/painel de pendências;
- modo público deixou de renderizar painel de escutas para exportação;
- linguagem pública passou de "fala bruta" para "transcrição individual";
- anexo público passou de "lista bruta" para "lista individualizada".

Revalidação pública aprovada:

- leitura executiva presente;
- temas dominantes presentes;
- prioridades agrupadas presentes;
- sinais qualitativos relevantes presentes;
- nota metodológica territorial presente;
- aprendizados presentes;
- encaminhamentos públicos presentes.

Não foram encontrados no modo público:

- pendências internas;
- CSV operacional;
- status crus `draft`, `reviewed` ou `published`;
- campos técnicos;
- fala original/transcrição individual;
- entrevistador;
- e-mail;
- CPF;
- telefone;
- endereço;
- anexos internos;
- auditoria interna;
- `undefined` ou `NaN`.

## Validação do PDF interno

O diálogo nativo de salvar PDF não foi automatizado.

A folha de impressão interna (`print-sheet`) foi validada pelo DOM do navegador:

- capa presente;
- indicadores presentes;
- leitura executiva presente;
- nota metodológica presente;
- pendências internas presentes;
- rodapé limpo presente.

## Validação do PDF público

O diálogo nativo de salvar PDF não foi automatizado.

A folha de impressão pública (`print-sheet`) foi validada pelo DOM do navegador:

- capa presente;
- identificação de versão pública presente;
- leitura executiva presente;
- nota metodológica presente;
- pendências internas ausentes;
- status cru ausente;
- campo técnico ausente;
- transcrição individual/dado sensível ausente.

Pendência: abrir manualmente o preview de impressão antes de envio externo para confirmar ausência de página quase vazia, card cortado ou texto sobreposto.

## Screenshots

Capturas geradas:

- `reports/screenshots/relatorio-abril-2026-interno.png`
- `reports/screenshots/relatorio-abril-2026-publico.png`

## Checklist

Checklist atualizado:

- `reports/checklist-visual-relatorio-abril-2026.md`

Status: aprovado para uso interno e aprovado para preparação de versão pública após revisão humana final no preview de impressão.

## Decisão humana

Decisão atualizada:

- `reports/decisao-humana-relatorio-abril-2026.md`

Opções marcadas:

- aprovado para uso interno;
- aprovado para versão pública após revisão.

Responsável final de envio segue pendente de preenchimento humano.

## Resultado do verify

Verificação final executada com sucesso:

- `npm run lint`: passou;
- `npm run build`: passou;
- `npm run verify`: passou;
- `test:reports`: 4 testes passaram;
- `test:transparencia`: 14 testes passaram.

## Pendências restantes

1. Conferir manualmente o preview nativo de impressão/salvar PDF.
2. Registrar responsável humano final antes de envio externo.
3. Manter a nota metodológica visível na versão pública.
4. Não acrescentar conclusão forte por bairro, pois a cobertura territorial é de 34.3% e há 65 escutas sem território de referência.

## Escopo preservado

Não houve:

- nova análise;
- IA;
- OCR;
- mapa;
- alteração de schema;
- alteração de RLS;
- publicação automática;
- exposição de dado sensível.
