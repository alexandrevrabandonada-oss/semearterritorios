# Estado da Nação - SEMEAR Territórios - Tijolo 074

## Diagnóstico do relatório anterior

O relatório mensal já consolidava dados corretos do sistema: mês de referência, ações, escutas, cobertura territorial, sínteses, temas, prioridades, ações e pendências. O problema era editorial e institucional: a saída ainda parecia export bruto, com listas longas, pouca hierarquia visual e leitura executiva insuficiente.

Também havia risco de linguagem automática ruim em trechos como `acao(oes)` e exposição de fala bruta em áreas operacionais/exportáveis.

## Nova estrutura

O relatório interpretativo agora organiza a leitura em:

1. capa / resumo do mês;
2. indicadores principais;
3. leitura executiva;
4. o que escutamos;
5. temas dominantes;
6. prioridades agrupadas;
7. sinais qualitativos relevantes;
8. territórios da ação x territórios de referência;
9. qualidade territorial e limites da leitura;
10. aprendizados do mês;
11. encaminhamentos recomendados;
12. ações realizadas;
13. pendências e próximos passos;
14. anexo técnico.

## Agrupamentos criados

As prioridades abertas passaram a ser agrupadas de forma determinística nos macroeixos:

- fiscalização e poder público;
- limpeza urbana e coleta;
- ar, poluição e pó;
- arborização e sombra;
- saúde e qualidade de vida;
- educação ambiental;
- água e rio;
- empresas e CSN;
- outros.

Os antigos temas inesperados foram reorganizados como sinais qualitativos relevantes:

- saúde e desconforto;
- rio e escória;
- fiscalização;
- percepção sobre poluição;
- infraestrutura urbana;
- cuidado coletivo.

Os exemplos exibidos são sanitizados e limitados, sem fala bruta.

## Visual melhorado

A tela ganhou leitura executiva em destaque, cards de indicadores, chips de temas, gráficos de barras simples, nota metodológica como card, blocos de aprendizados e encaminhamentos.

O PDF impresso foi reorganizado com capa forte, indicadores, seções com respiro, gráficos/listas compactas e rodapé limpo. A regra de evitar página vazia foi reforçada com blocos `break-inside: avoid` já existentes no CSS de impressão.

## Modo interno e público

O relatório agora tem alternância entre versão interna e pública.

Modo interno:

- mostra mais detalhes operacionais;
- mantém pendências;
- exibe anexo técnico;
- apoia revisão da equipe.

Modo público:

- remove pendências operacionais;
- evita lista bruta;
- usa linguagem de devolutiva/prestação;
- não exibe fala original nem dado pessoal.

## Testes com abril de 2026

O código foi preparado para o cenário de abril de 2026 com:

- 2 ações;
- 99 escutas;
- cobertura territorial crítica de 34,3%;
- 65 escutas sem território de referência;
- temas principais como ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos.

Com cobertura crítica, o relatório registra alerta metodológico e evita conclusão forte por bairro. O gráfico por território de referência aparece acompanhado do limite de leitura.

## Verificações executadas

- `npm run lint`: passou.
- `npm run build`: passou.

`npm run verify` ainda será executado ao final do ciclo para rodar lint, build e testes de transparência em sequência.

## Riscos restantes

- O agrupamento por palavras-chave é determinístico e conservador, mas pode classificar termos novos em "Outros" até a equipe ajustar vocabulário.
- A validação visual fina do PDF depende de impressão no navegador com dados reais do mês.
- O endpoint antigo de geração de síntese por IA permanece no projeto, mas o fluxo do relatório mensal interpretativo não o chama.
- A versão pública depende de revisão humana antes de qualquer publicação externa.
