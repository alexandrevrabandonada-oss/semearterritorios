# Estado da Nação - SEMEAR Territórios 006

Data: 2026-04-27  
Tijolo: 6 - Mapa de Escuta por Bairro

## Resumo

O módulo `/mapa` deixou de ser placeholder e passou a operar como uma visualização territorial inicial em formato de mapa-lista. A tela organiza escutas por bairro, destaca intensidade relativa, mostra temas mais citados e reúne lugares mencionados em cada território.

## Arquivos alterados

Alterado:

- `app/mapa/page.tsx`

Criado:

- `components/mapa/territorial-listening-map.tsx`
- `reports/estado-da-nacao-semear-territorios-006.md`

## Funcionalidades implementadas

O mapa territorial agora mostra:

- filtros por mês e tema;
- cards de bairros ordenados por volume de escutas;
- intensidade visual por número de escutas no recorte;
- ranking de temas por bairro;
- lugares mencionados por bairro;
- métricas-resumo do recorte;
- ranking geral de temas no território.

## Dados utilizados

O módulo busca dados de:

- `listening_records`;
- `neighborhoods`;
- `themes`;
- `listening_record_themes`;
- `places_mentioned`.

Também há fallback para `places_mentioned_text` quando o registro estruturado de lugares ainda não estiver preenchido.

## Estratégia de mapa inicial

Como ainda não existe camada geográfica real, foi adotado um mapa-lista territorial. Essa abordagem entrega leitura territorial imediatamente sem depender de GeoJSON, shapefiles ou definição de limites oficiais dos bairros.

A agregação foi organizada por bairro e por recorte de filtros para facilitar uma futura troca de apresentação por Leaflet ou outra biblioteca cartográfica, sem reescrever a lógica principal de síntese.

## Estados vazios

Quando não há escutas no recorte, a tela orienta a equipe a cadastrar escutas com bairro e temas para ativar a cartografia. Cards de bairros sem dados continuam visíveis, com intensidade zero, para evitar esconder territórios ainda não cobertos.

## Dados e privacidade

O módulo não expõe CPF, telefone, endereço pessoal ou outro dado individual identificável. A visualização trabalha com agregações por bairro e listas de temas/lugares mencionados.

Como a origem continua sendo dado interno de escuta, a proteção via autenticação e RLS segue necessária antes de uso em ambiente de produção.

## Verificação

Comandos planejados para verificação:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Próximos passos

1. Adicionar camada geográfica real com GeoJSON dos bairros.
2. Permitir alternância entre mapa-lista e mapa geográfico.
3. Avaliar agregações SQL ou views materializadas se o volume de escutas crescer.
4. Integrar filtros adicionais por status de revisão e tipo de origem da escuta.