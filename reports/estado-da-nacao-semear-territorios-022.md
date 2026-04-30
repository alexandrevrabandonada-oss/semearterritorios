# Estado da Nação — SEMEAR Territórios 022

## Diagnóstico inicial

O Tijolo 021 criou `normalized_places`, vínculo em `places_mentioned.normalized_place_id`, `/territorios/lugares`, `/territorios/qualidade` e integração com `/pos-banca` e `/mapa` como mapa-lista.

Os riscos restantes eram operacionais: duplicidade de nomes normalizados, classificação incorreta de sensíveis, ausência de evidência para mapa interno e necessidade de validar RLS no banco aplicado.

## Rotas criadas

- `/territorios/normalizacao/qualidade`

## Componentes criados

- `components/territories/normalization-quality-page.tsx`
- `components/territories/internal-map-readiness-panel.tsx`

## Bibliotecas criadas

- `lib/normalized-places-quality.ts`

A biblioteca calcula:

- possíveis duplicidades;
- nomes ambíguos;
- lugares sensíveis;
- lugares sem menção;
- lugares com muitas menções;
- bairros com lugares normalizados;
- recomendação determinística antes do mapa.

## Documentos criados/atualizados

Criado:

- `docs/decisao-mapa-interno.md`

Atualizados:

- `docs/escopo-futuro-mapa-interno.md`
- `docs/normalizacao-de-lugares.md`

## Como usar o painel de qualidade da normalização

1. Abrir `/territorios/normalizacao/qualidade`.
2. Ver o resumo geral de lugares normalizados.
3. Revisar alertas de duplicidade, ambiguidade, sensíveis e lugares sem bairro.
4. Usar filtros por bairro, visibilidade, tipo e problema.
5. Abrir `/territorios/lugares` para corrigir normalização.
6. Copiar o relatório de qualidade da normalização.
7. Anexar o texto à decisão em `docs/decisao-mapa-interno.md`.

## Como interpretar prontidão para mapa interno

O componente de prontidão classifica:

- `Não pronto`: há bloqueios ou critérios essenciais ausentes.
- `Quase pronto`: a base está próxima, mas ainda há pendências.
- `Pronto para desenho técnico`: critérios globais suficientes para desenhar escopo sem prototipar ainda.
- `Pronto para protótipo interno`: critérios da ação principal também estão atendidos.

Critérios usados:

- 20+ escutas revisadas;
- 3+ territórios com dados;
- devolutiva aprovada quando há ação selecionada;
- dossiê fechado quando há ação selecionada;
- revisão territorial concluída;
- lugares estruturados normalizados;
- nenhum lugar sensível pendente;
- nenhuma duplicidade relevante;
- mapa sem fala original ou dado pessoal.

## Estado da privacidade

- `/mapa` continua como mapa-lista, sem mapa geográfico, sem Leaflet, sem GeoJSON e sem geocodificação.
- `visibility = sensitive` não é usado para exibição de lugares no mapa-lista.
- `place_type = sensivel_nao_publicar` continua oculto no mapa-lista.
- O relatório copiável de normalização não inclui fala original, entrevistador, endereço, telefone, CPF ou e-mail.
- `/territorios/lugares` usa fala apenas internamente para heurística de alerta; a lista não exibe fala original.

## Recomendação final

Recomendação técnica atual: **desenho técnico antes**.

Motivo: o sistema agora tem ferramentas para validar normalização, duplicidades e sensíveis, mas a decisão final depende de dados aplicados no banco real/homologação e validação de RLS. O mapa geográfico ainda não deve ser implementado sem o relatório de qualidade territorial, o relatório de normalização e a decisão formal preenchida.

## Próximo tijolo sugerido

Tijolo 023 sugerido: decisão formal e desenho técnico do mapa interno autenticado, usando os relatórios de `/territorios/qualidade` e `/territorios/normalizacao/qualidade`. Só avançar para protótipo se houver 20+ escutas revisadas, 3+ territórios, sensíveis resolvidos e duplicidades revisadas.
