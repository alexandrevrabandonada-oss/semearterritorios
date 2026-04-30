# Estado da Nação — SEMEAR Territórios 021

## Diagnóstico inicial

O Tijolo 020 já havia criado a revisão territorial com `territorial_review_status`, `territorial_review_notes`, `places_mentioned`, fila em `/escutas/revisao-territorial`, mapa-lista em `/mapa` e indicadores em `/pos-banca`.

O risco principal era a falta de normalização global: o mesmo lugar poderia aparecer com variações de escrita entre revisores. Também faltava relatório por território para dizer quais bairros estão prontos, em revisão ou bloqueados por sensibilidade.

## Decisão de modelagem

Foi adotada a tabela `normalized_places`, mantendo `places_mentioned` como camada de menção estruturada e adicionando `places_mentioned.normalized_place_id`.

Campos principais:

- `neighborhood_id`
- `normalized_name`
- `place_type`
- `visibility`: `internal`, `public_safe`, `sensitive`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

A decisão mantém segurança: não há geocodificação, não há GeoJSON, não há mapa público e lugares sensíveis ficam explicitamente marcados para não publicação.

## Migration criada

- `supabase/migrations/20260429003000_create_normalized_places.sql`

A migration cria `normalized_places`, adiciona vínculo em `places_mentioned`, índices, trigger de `updated_at` e policies RLS para leitura autenticada, criação por equipe/coordenação/admin e edição por coordenação/admin.

## Rotas criadas

- `/territorios/lugares`
- `/territorios/qualidade`

## Componentes criados

- `components/territories/places-normalization-page.tsx`
- `components/territories/territorial-quality-page.tsx`

## Bibliotecas criadas

- `lib/territorial-quality.ts`

A biblioteca calcula, por bairro/território:

- total de escutas;
- escutas revisadas;
- revisão territorial pendente;
- revisão territorial concluída;
- registros que precisam atenção;
- lugares totais;
- lugares estruturados;
- lugares normalizados;
- lugares sensíveis;
- percentual de qualidade territorial;
- recomendação: `insuficiente`, `em revisão`, `bom para mapa interno` ou `bloqueado por sensível`.

## Como normalizar lugares

1. Abrir `/territorios/lugares`.
2. Filtrar por “não normalizados”.
3. Conferir bairro, tipo, ação e escuta vinculada.
4. Vincular a nome normalizado existente ou criar novo nome.
5. Definir visibilidade:
   - `internal` para uso interno autenticado;
   - `public_safe` para uso agregado em devolutiva pública;
   - `sensitive` para não publicar.
6. Se a referência parecer endereço pessoal, casa ou família, marcar como sensível.

## Como usar o relatório de qualidade territorial

Abrir `/territorios/qualidade` para ver cards por bairro. O botão “Copiar relatório territorial” gera uma síntese em Markdown com:

- síntese geral;
- territórios prontos para mapa interno;
- territórios em revisão;
- pendências;
- recomendação.

## Mudanças em `/pos-banca`

`/pos-banca` passou a considerar:

- lugares normalizados;
- lugares não normalizados;
- lugares sensíveis;
- territórios prontos para mapa interno;
- territórios bloqueados por sensível.

A recomendação determinística agora pede normalização antes do mapa quando há lugares estruturados sem `normalized_place_id`.

## Mudanças em `/mapa`

O mapa continua sendo mapa-lista, sem Leaflet, sem GeoJSON e sem geocodificação.

Alterações:

- usa `normalized_places.normalized_name` quando existir;
- oculta `visibility = sensitive`;
- mantém ocultação de `sensivel_nao_publicar`;
- exibe badge “pronto para mapa interno” ou “dados territoriais em revisão” por bairro.

## Documentação

Criado:

- `docs/normalizacao-de-lugares.md`

Atualizados:

- `docs/guia-revisao-territorial.md`
- `docs/escopo-futuro-mapa-interno.md`

## Critérios para futuro mapa interno

O futuro mapa interno autenticado só deve avançar quando houver:

- 20+ escutas revisadas;
- 3+ territórios;
- devolutiva aprovada;
- dossiê fechado;
- revisão territorial concluída;
- lugares estruturados normalizados;
- nenhum lugar sensível pendente no recorte;
- nenhum uso de fala original ou dado pessoal.

## Riscos restantes

- A detecção de dado sensível continua heurística.
- Normalização depende de revisão humana consistente.
- Não há versionamento histórico detalhado das mudanças de normalização.
- RLS deve ser validado no banco aplicado, especialmente policies novas de `normalized_places`.

## Recomendação para Tijolo 022

Não implementar mapa geográfico ainda se os dados reais não atingirem os critérios. O próximo tijolo recomendado é uma rodada de validação operacional da normalização: aplicar em dados reais, revisar duplicidades e confirmar se há territórios suficientes para desenhar o escopo técnico do mapa interno autenticado.
