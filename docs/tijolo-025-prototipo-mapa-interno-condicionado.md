# Tijolo 025 — Protótipo do Mapa Interno Condicionado

Não executar se a homologação do mapa interno não estiver GO.

Não executar se `internal_map_homologations.status` não for `approved` ou se `internal_map_homologations.decision` não for `go_prototipo_interno`.

Este documento descreve o escopo máximo de um futuro protótipo visual do mapa interno autenticado, condicionado à homologação formal.

Antes de executar qualquer protótipo visual, abrir `/mapa/interno`, confirmar estado “Autorizado para protótipo” e anexar a decisão persistente aprovada ao planejamento do tijolo. Se `/mapa/interno` indicar bloqueio, o protótipo não deve ser iniciado.

## Condição obrigatória

Antes de iniciar:

- `/territorios/mapa/homologacao` deve indicar GO para protótipo interno autenticado.
- Deve existir registro persistente aprovado em `internal_map_homologations`.
- `/mapa/interno` deve indicar “Autorizado para protótipo”.
- `docs/homologacao-mapa-interno.md` deve estar preenchido.
- `docs/decisao-mapa-interno.md` deve autorizar protótipo.
- RLS deve estar validada no banco aplicado.

## Escopo futuro máximo

- Mapa interno autenticado.
- Sem página pública.
- Agregação por bairro/território.
- Filtros por mês, tema e tipo de ação.
- Lugares normalizados seguros.
- Sem fala original.
- Sem dado pessoal.
- Sem `visibility = sensitive`.
- Sem `place_type = sensivel_nao_publicar`.
- Sem geocodificação de endereço pessoal.
- Se usar mapa visual, usar apenas dados agregados e limites territoriais seguros.

## Fora do escopo

- Página pública.
- Mapa público.
- Geocodificação de endereços.
- Pontos individuais de escuta.
- Falas originais.
- Dados pessoais.
- IA para classificar ou resumir oficialmente o mapa.

## Critérios mínimos

- 20+ escutas revisadas.
- 3+ territórios com dados.
- Revisão territorial concluída.
- Normalização concluída.
- Sem duplicidades relevantes.
- Sem sensíveis pendentes.
- RLS validada.
