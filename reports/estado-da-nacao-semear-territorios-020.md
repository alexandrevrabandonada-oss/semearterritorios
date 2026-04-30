# Estado da Nação — SEMEAR Territórios 020

## Diagnóstico inicial

O diagnóstico mostrou que:

- `places_mentioned` já existia como tabela estruturada;
- `places_mentioned_text` ainda era o principal campo usado em várias telas;
- o mapa-lista usava lugares estruturados e fallback de texto livre;
- o relatório mensal ainda trabalha principalmente com campos de texto das escutas;
- não havia status persistente de revisão territorial em `listening_records`.

## Decisão de modelagem adotada

Foi adotada a opção simples e segura:

- adicionar `territorial_review_status` em `listening_records`;
- adicionar `territorial_review_notes` em `listening_records`;
- usar a tabela existente `places_mentioned` para lugares estruturados;
- usar `place_name` como campo estruturado já existente, em vez de criar `place_text`.

Status territorial:

- `pending`: ainda não revisada territorialmente;
- `reviewed`: bairro/lugares conferidos;
- `needs_attention`: há ambiguidade ou risco.

## Migration criada

- `supabase/migrations/20260429002000_add_territorial_review_to_listening_records.sql`

## Rotas criadas

- `/escutas/revisao-territorial`

## Componentes criados

- `components/listening-records/territorial-review-panel.tsx`
- `components/listening-records/territorial-review-queue.tsx`

## Biblioteca criada

- `lib/territorial-review.ts`

Centraliza:

- status de revisão territorial;
- tipos de lugar;
- detecção de lugares sensíveis;
- métricas de qualidade territorial;
- recomendação de qualidade territorial.

## Mudanças em /pos-banca

Foram adicionados indicadores:

- revisão territorial pendente;
- lugares estruturados;
- lugares sensíveis;
- lugares em texto livre sem estrutura.

A decisão pós-banca agora considera qualidade territorial:

- lugares sensíveis bloqueiam mapa/devolutiva pública;
- lugares não estruturados recomendam padronização antes do mapa;
- revisão territorial pendente recomenda concluir revisão antes do mapa.

Também foi adicionada a síntese copiável “Qualidade territorial dos dados”.

## Mudanças em /mapa

O mapa-lista foi mantido, sem mapa geográfico.

Mudanças:

- separa lugares estruturados seguros de texto livre;
- oculta `sensivel_nao_publicar`;
- mostra aviso quando há dados territoriais em revisão;
- indica quantos lugares estão em texto livre;
- remove fallback automático de texto livre como se fosse lugar estruturado.

## Como usar revisão territorial

1. Abrir `/escutas/revisao-territorial`.
2. Filtrar por pendente, precisa atenção, sem bairro, texto livre ou possível dado sensível.
3. Abrir o painel da escuta.
4. Conferir `places_mentioned_text`.
5. Adicionar lugar estruturado.
6. Marcar tipo do lugar.
7. Se houver risco de identificação, usar `sensivel_nao_publicar`.
8. Atualizar status para `reviewed` ou `needs_attention`.

O painel também aparece em `/escutas/[id]`.

## Como preparar dados para mapa interno

- Todas as escutas relevantes devem ter bairro.
- Lugares citados devem ser estruturados em `places_mentioned`.
- Lugares sensíveis devem ser marcados como `sensivel_nao_publicar`.
- Lugares sensíveis não devem aparecer em mapa, devolutiva ou relatório público.
- Não geocodificar endereço pessoal.
- Não usar fala original no mapa.

## Documentação

Criado:

- `docs/guia-revisao-territorial.md`

Atualizado:

- `docs/escopo-futuro-mapa-interno.md`

## Riscos restantes

- O tipo de lugar é escolha humana e pode variar entre revisores.
- Lugares em texto livre antigos precisam revisão manual.
- A detecção de dado sensível continua heurística.
- Ainda não há normalização global de nomes de lugar.
- Não há geocodificação, por decisão de segurança.

## Recomendação para Tijolo 021

Antes de mapa geográfico real, o próximo tijolo recomendado é:

**Tijolo 021 — Normalização de Lugares e Relatório de Qualidade Territorial por Território**.

Se a fila territorial mostrar poucos pendentes, o Tijolo 021 pode avançar para desenho técnico do mapa interno autenticado, ainda sem página pública.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
