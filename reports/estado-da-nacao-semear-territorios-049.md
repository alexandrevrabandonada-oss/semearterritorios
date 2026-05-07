# Estado da Nação — SEMEAR Territórios 049

## Diagnóstico inicial

O sistema usava um cabeçalho horizontal grande dentro de `AppShell`, com navegação em botões no topo. As páginas internas já tinham cards, filtros e estados vazios, mas o layout geral não seguia o mockup com sidebar fixa, área de conteúdo ampla e hierarquia de dashboard mais operacional.

Foram verificados:

- `/`
- `/acoes`
- `/acoes/nova`
- `/escutas`
- `/escutas/lote`
- `/territorios`
- `/mapa`
- `/relatorios`
- `/pos-banca`
- `/ajuda`
- `/equipe`
- `/transparencia/snapshots`
- `/transparencia/preview`
- `/transparencia/homologacao`

## Páginas redesenhadas

- `/`: dashboard redesenhado com sidebar, cabeçalho superior, filtros rápidos, KPIs, próxima operação, grid de padrões, mapa-lista resumido e bloco de Transparência Viva.
- Todas as rotas autenticadas que usam `AppShell`: passaram a usar o shell visual com sidebar fixa no desktop e menu recolhido no mobile.

## Componentes criados

- `components/layout/semear-app-shell.tsx`
- `components/ui/page-header.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/filter-bar.tsx`

## Componentes alterados

- `components/app-shell.tsx`
- `components/dashboard.tsx`
- `lib/semear-data.ts`
- `app/globals.css`

## Melhorias de navegação

- Sidebar fixa no desktop.
- Menu mobile recolhido.
- Identidade SEMEAR Territórios no topo da navegação.
- Selo `Sistema interno`.
- Rota ativa com destaque visual.
- Bloco inferior de equipe no shell.

## Melhorias de dashboard

- Cabeçalho mais próximo do mockup.
- Filtros rápidos para período, bairro e tema.
- CTA `Nova ação`.
- Banner explicativo curto.
- KPIs padronizados.
- Seção `Próxima operação` com atalhos.
- Cards para temas, escutas por mês, temas por bairro e palavras recorrentes.
- Mapa-lista territorial resumido.
- Bloco de Transparência Viva sem expor dados brutos.

## Melhorias de mapa-lista

O `/mapa` permanece como mapa-lista, sem geografia real. A principal melhoria visual vem do shell novo e da padronização geral. A rota já preservava:

- aviso de ausência de geocodificação;
- filtros territoriais;
- badges de homologação;
- cards de território;
- ranking de temas;
- lugares sensíveis ocultos;
- acesso ao portão do mapa interno.

## Melhorias de filtros

Foi criado `FilterBar` para uso gradual nas páginas. O dashboard já usa o padrão novo em filtros detalhados, e os filtros rápidos do topo seguem a linguagem visual do mockup.

## Confirmação de segurança

Não houve alteração de schema, migration, RLS, políticas Supabase, autenticação ou lógica de permissão.

Não foi criado mapa geográfico, página pública nova nem integração pública nova.

Não foi usado `service_role` no frontend.

## Verificação

- `npm run lint`: ok
- `npm run build`: ok
- `npm run verify`: ok

## Riscos restantes

- Ainda há páginas internas com cards antigos que podem ser refinados individualmente em tijolos menores.
- O usuário/equipe do bloco inferior da sidebar ainda é estático; pode ser ligado ao perfil autenticado depois.
- O dashboard usa visualização simples para gráfico de barras, sem biblioteca externa.
- Não foi feita uma revisão visual pixel a pixel em todas as rotas internas.

## Próximos passos sugeridos

Tijolo 050: padronização fina de listas e tabelas em `/acoes`, `/escutas`, `/territorios`, `/relatorios`, `/equipe` e Transparência Viva usando os componentes criados neste tijolo.
