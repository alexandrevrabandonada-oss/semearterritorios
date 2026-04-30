# Estado da Nação — SEMEAR Territórios 012

## Diagnóstico inicial

O Tijolo 011 deixou o fluxo principal apto para operação real da primeira banca: autenticação/RLS, ações, escutas, digitação em lote, checklist de qualidade, filtros de revisão, síntese determinística e relatórios mensais.

No diagnóstico do Tijolo 012, o sistema já permitia testar 30+ escutas com esforço razoável via `/escutas/lote`, sempre salvando como rascunho. A separação entre `draft` e `reviewed` já aparecia em listagens e detalhes, mas ainda faltava uma visão consolidada por ação para medir prontidão, pendências e devolutiva. A listagem de escutas também tinha filtros de qualidade iniciais, com uma regra duplicada para “sem tema” que foi corrigida.

## Arquivos alterados

- `components/actions/action-detail.tsx`
- `components/actions/action-synthesis.tsx`
- `components/listening-records/listening-records-list.tsx`

## Arquivos criados

- `app/acoes/[id]/piloto/page.tsx`
- `components/actions/action-pilot-page.tsx`
- `components/actions/action-readiness-panel.tsx`
- `components/actions/action-operation-checklist.tsx`
- `lib/action-pilot.ts`
- `scripts/seed-demo-banca.sql`
- `reports/estado-da-nacao-semear-territorios-012.md`

## Rotas criadas

- `/acoes/[id]/piloto` — Piloto da Banca de Escuta para uma ação específica.

## Componentes criados

- `ActionReadinessPanel`: classifica a prontidão da ação sem bloquear o uso.
- `ActionOperationChecklist`: mostra checklist operacional da banca em `/acoes/[id]` e no piloto.
- `ActionPilotPage`: consolida métricas, pendências, achados e relatório simples da operação.

## Como usar o piloto da banca

1. Abra uma ação em `/acoes/[id]`.
2. Clique em “Piloto da banca”.
3. Confira totais digitados, rascunhos, revisadas, pendências de qualidade, possíveis dados sensíveis, temas, palavras, lugares, prioridades e observações inesperadas.
4. Use “Digitar mais fichas” para ir ao modo lote.
5. Use “Revisar escutas” para abrir a listagem filtrada por ação e rascunhos.

## Exportação da síntese

A “Síntese Determinística da Ação” agora permite copiar:

- texto curto para relatório;
- Markdown completo;
- devolutiva pública simples com o título “O que ouvimos na feira”.

Esse fluxo segue determinístico e não usa IA.

## Como usar o seed demo

O seed foi criado como SQL local em `scripts/seed-demo-banca.sql`.

Uso sugerido em desenvolvimento:

```bash
psql "$DATABASE_URL" -f scripts/seed-demo-banca.sql
```

O arquivo está marcado como DEV/DEMO, cria a ação “Banca de Escuta — Feira Livre”, um bairro fictício e 20 escutas sem dados pessoais. Não roda automaticamente e não deve ser executado em produção.

## Critérios de prontidão

- Em digitação: nenhuma ou poucas escutas, ou pendência técnica grave.
- Pronta para revisão: existem escutas digitadas e sem pendência técnica grave detectada.
- Em revisão: há escutas revisadas, mas ainda existem rascunhos.
- Pronta para síntese: 80% ou mais das escutas estão revisadas.
- Pronta para relatório: 100% das escutas estão revisadas.

A exceção “coordenação marcou como suficiente, com justificativa” foi prevista no utilitário, mas ainda não foi exposta em tela porque não há campo persistente para isso no schema atual.

## Controle de qualidade da digitação

A listagem de escutas agora exibe marcadores e filtros para:

- fala muito curta;
- possível dado sensível;
- sem palavras usadas;
- sem tema;
- revisada sem resumo.

O piloto também consolida esses indicadores por ação.

## Relatório da operação

O piloto mostra “Relatório da Operação da Banca” com:

- total digitado;
- primeira e última digitação por `created_at`;
- total revisado via painel de métricas;
- pendências;
- principais achados;
- recomendação operacional: continuar digitando, revisar pendências, pronta para síntese ou pronta para relatório.

## Verificação

Comandos executados com sucesso:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Riscos restantes

- A detecção de possível dado sensível é heurística e pode gerar falsos positivos ou falsos negativos.
- O seed demo em SQL depende de execução manual com conexão local correta.
- A marcação “coordenação considera suficiente” ainda precisa de campo próprio se virar decisão operacional persistente.
- A rota de revisão usa query string na listagem, mas ainda não há uma tela dedicada de fila por ação.

## Próximos passos recomendados

- Rodar o seed demo em ambiente local e validar a operação com 20 a 30 fichas.
- Testar revisão real com equipe, medindo tempo e pendências recorrentes.
- Decidir se a suficiência por coordenação deve virar campo auditável.
- Só depois avançar para mapa geográfico real ou PWA offline.
