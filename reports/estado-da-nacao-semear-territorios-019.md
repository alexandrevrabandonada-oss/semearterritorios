# Estado da Nação — SEMEAR Territórios 019

## Diagnóstico inicial

Foram revisados:

- `docs/decisao-pos-banca-e-proximo-passo.md`;
- `docs/matriz-priorizacao-mapa.md`;
- `docs/relatorio-pos-banca-template.md`;
- `docs/checklist-fechamento-primeira-banca.md`;
- dashboard com “Última operação”;
- `/acoes/[id]/piloto`;
- `/acoes/[id]/devolutiva`;
- `/acoes/[id]/dossie`;
- `/relatorios/[mes]`.

O sistema já tinha dados suficientes no app para calcular, por ação, total de escutas, revisadas, rascunhos, territórios envolvidos, lugares mencionados, temas, status da devolutiva e status do dossiê. Faltava uma tela dedicada para consolidar esses dados e emitir decisão formal do próximo passo.

## Rota criada

- `/pos-banca` — Consolidação pós-banca.

## Componentes criados

- `components/post-action/post-action-consolidation-page.tsx`
- `components/post-action/post-action-decision-panel.tsx`

## Biblioteca criada

- `lib/post-action-decision.ts`

Ela gera recomendação determinística e texto copiável da decisão pós-banca.

## Documentos atualizados/criados

Criados:

- `docs/escopo-futuro-mapa-interno.md`

Atualizados:

- `docs/matriz-priorizacao-mapa.md`
- `app/ajuda/page.tsx`
- `lib/semear-data.ts`

## Como usar /pos-banca

1. Abrir `/pos-banca`.
2. Selecionar a ação da banca.
3. Conferir dados da ação, indicadores, temas, palavras, lugares e prioridades.
4. Ver o diagnóstico automático.
5. Conferir a recomendação formal.
6. Clicar em “Copiar decisão pós-banca”.
7. Colar no documento de decisão ou registro institucional.

## Como interpretar a decisão

A recomendação é informativa e determinística:

- dado sensível pendente bloqueia devolutiva/mapa;
- devolutiva não aprovada ou dossiê não fechado recomenda fechar ciclo;
- menos de 20 escutas revisadas recomenda priorizar digitação/revisão;
- 20+ revisadas com menos de 3 territórios recomenda novas ações em outros territórios;
- 20+ revisadas e 3+ territórios permite avançar para escopo de mapa interno autenticado.

## Recomendação técnica: mapa agora ou depois

**Mapa depois, salvo se `/pos-banca` demonstrar 20+ escutas revisadas, 3+ territórios, devolutiva aprovada, dossiê fechado e nenhum alerta sensível.**

## Se mapa agora, qual escopo

O escopo deve ser o de `docs/escopo-futuro-mapa-interno.md`:

- mapa interno autenticado;
- agregação por bairro/território;
- temas por bairro;
- intensidade de escutas;
- lugares mencionados sanitizados;
- sem falas originais;
- sem dados pessoais;
- sem página pública.

## Se mapa depois, o que falta

- Mais escutas revisadas;
- mais territórios envolvidos;
- devolutiva aprovada;
- dossiê fechado;
- relatório mensal conferido;
- matriz de priorização preenchida.

## Riscos restantes

- A decisão depende da qualidade dos dados preenchidos nas escutas.
- Lugares mencionados podem exigir padronização antes de qualquer mapa.
- O mapa público continua fora de escopo por risco de exposição.
- A tela `/pos-banca` não persiste a decisão; ela gera texto para registro documental.

## Próximo tijolo sugerido

Se `/pos-banca` indicar base suficiente: **Tijolo 020 — Mapa Interno Autenticado por Território**.

Se indicar base insuficiente: **Tijolo 020 — Refinamento de Revisão e Padronização de Lugares Mencionados**.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
