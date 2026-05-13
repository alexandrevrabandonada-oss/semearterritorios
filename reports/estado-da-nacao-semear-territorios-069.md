# Estado da Nação - SEMEAR Territórios 069

Data: 13/05/2026

## Diagnóstico visual inicial

O app já tinha tentativas de modernização, mas a mudança não estava aplicada de forma consistente nas rotas reais. O shell global existia em `components/layout/semear-app-shell.tsx`, porém as páginas principais ainda carregavam muitos estilos locais com:

- `rounded-[2rem]` e `rounded-3xl` em quase todos os blocos;
- `bg-semear-offwhite` dentro de cards brancos, criando cards dentro de cards;
- `shadow-soft` pesado e repetitivo;
- botões todos parecidos, sem hierarquia clara;
- headers locais por página;
- métricas e alertas duplicados em cada módulo.

## Componentes antigos encontrados

- `components/ui/page-header.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/filter-bar.tsx`
- helpers locais: `Panel`, `Metric`, `Mini`, `MiniList`, `InfoPanel`, `StatusNote`, `StateBox`, `TabButton`, `InfoList`;
- padrões inline de botões com `rounded-full`, `bg-semear-green`, `border-semear-green/15`;
- cards bege e off-white em dashboard, dossiê, devolutiva, mapa, lote e memória.

## Componentes novos aplicados

Criado `components/ui/semear-primitives.tsx` com:

- `SemearPageHeader`
- `SemearCard`
- `SemearMetricCard`
- `SemearAlert`
- `SemearStatusBadge`
- `SemearButton`
- `SemearFilterBar`
- `SemearSection`
- `SemearDataList`

Os componentes foram aplicados em rotas reais, não ficaram apenas como design system.

## Rotas realmente redesenhadas

- `/`
- `/acoes/[id]/dossie`
- `/acoes/[id]/devolutiva`
- `/escutas/lote`
- `/mapa`
- `/memoria`

O shell novo também impacta as demais rotas que usam `AppShell`, incluindo `/acoes`, `/acoes/[id]`, `/escutas`, `/relatorios`, `/territorios` e `/pos-banca`.

## Mudanças no shell

Arquivo: `components/layout/semear-app-shell.tsx`

- sidebar refinada para verde mais fechado;
- largura reduzida e controlada;
- itens ativos com fundo branco e destaque mais claro;
- logo menos pesado;
- perfil no rodapé com bloco mais discreto;
- conteúdo limitado em `max-w-[98rem]`;
- fundo geral mais limpo.

## Mudanças no dashboard

Arquivo: `components/dashboard.tsx`

- header convertido para `SemearPageHeader`;
- CTA principal convertido para `SemearButton`;
- métricas principais convertidas para `SemearMetricCard`;
- card mobile de próxima operação convertido para `SemearCard`;
- painéis principais receberam acabamento mais limpo com bordas suaves e badges.

## Mudanças no dossiê

Arquivo: `components/actions/action-dossier-page.tsx`

- topo redesenhado com `SemearPageHeader`;
- status e prontidão em `SemearStatusBadge`;
- KPIs em `SemearMetricCard`;
- qualidade territorial em `SemearAlert`;
- botões de voltar, imprimir, copiar e abrir devolutiva em `SemearButton`;
- corpo principal dentro de `SemearCard`, reduzindo a aparência de folha administrativa antiga.

## Mudanças na devolutiva

Arquivo: `components/actions/action-debrief-page.tsx`

- topo com diferença visual entre modo público e técnico;
- status e prontidão em badges;
- métricas em cards modernos;
- ressalva metodológica em alerta limpo;
- ações de voltar e gerar rascunho com botões padronizados;
- mantém lógica de edição, aprovação, cópia e download sem alteração.

## Mudanças no mapa

Arquivo: `components/mapa/territorial-listening-map.tsx`

- hero antigo substituído por `SemearPageHeader`;
- nota metodológica em `SemearAlert`;
- filtros em `SemearFilterBar`;
- métricas em `SemearMetricCard`;
- cards de território mais compactos e brancos;
- acessos rápidos com `SemearButton`.

## Mudanças em escutas/lote

Arquivo: `components/listening-records/listening-record-batch-form.tsx`

- header operacional com `SemearPageHeader`;
- aviso de privacidade em `SemearAlert`;
- blocos principais em `SemearCard`;
- botão primário “Salvar e digitar próxima” mais forte;
- barra sticky de salvamento com menos cara de formulário antigo;
- sessão mobile fixa preservada e visualmente limpa.

## Mudanças em memória

Arquivo: `components/memory/project-memory-dashboard.tsx`

- header reposicionado como “Arquivo vivo”;
- ações principais com `SemearButton`;
- KPIs com `SemearMetricCard`;
- filtros e blocos principais dentro de `SemearCard`;
- relatórios e entradas de linha do tempo com cards brancos mais leves;
- badges de contagem padronizados.

## Checklist visual

Documento criado: `reports/redesign-visual-checklist-069.md`

Resumo:

- `/`: mudou claramente; ainda há painéis internos locais.
- `/acoes/[id]/dossie`: mudou claramente; prioridade atendida.
- `/acoes/[id]/devolutiva`: mudou claramente; controles técnicos permanecem.
- `/escutas/lote`: mudou claramente; mobile-first mais operacional.
- `/mapa`: mudou claramente; ainda há refinamento possível em ranking lateral.
- `/memoria`: mudou claramente; `/memoria/novo` ainda depende do workspace herdado.

## Banco, RLS e autenticação

Confirmado: não houve alteração em schema, migrations, RLS, autenticação, policies, client Supabase ou regras de negócio.

Arquivos em `supabase/`, `lib/supabase/` e `middleware.ts` não foram alterados.

## Resultado técnico

Comandos executados:

- `npm run lint`: passou sem warnings ou erros.
- `npm run build`: passou.
- `npm run verify`: passou.

`npm run verify` executou `lint`, `build` e `vitest run tests/transparencia`.

Resultado dos testes:

- 4 arquivos de teste passaram.
- 14 testes passaram.

## Riscos restantes

- Nem todas as rotas obrigatórias tiveram redesign interno completo; algumas receberam o shell novo e permanecem com componentes locais no conteúdo.
- `components/ui/page-header.tsx`, `metric-card.tsx` e `filter-bar.tsx` ainda existem porque outras telas dependem deles.
- Alguns painéis analíticos do dossiê ainda têm identidade própria e podem ser unificados em rodada futura.
- A verificação visual foi documentada, mas não foram geradas screenshots automáticas nesta entrega.

