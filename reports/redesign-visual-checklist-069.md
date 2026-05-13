# Checklist visual - Tijolo 069

Data: 13/05/2026

## Auditoria do que renderiza de verdade

Rotas principais auditadas:

| Rota | Layout real | Sidebar real | Header/card antes | Substituição aplicada |
| --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` -> `AppShell` -> `SemearAppShell` -> `Dashboard` | `components/layout/semear-app-shell.tsx` | `PageHeader`, `MetricCard`, `Panel`, cards locais | `SemearPageHeader`, `SemearMetricCard`, `SemearCard`, `SemearStatusBadge` |
| `/acoes` | `AppShell` -> `ActionsList` | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/acoes/[id]` | `AppShell` -> `ActionDetail` | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/acoes/[id]/dossie` | `AppShell` -> `ActionDossierPage` | `SemearAppShell` | `rounded-[2rem]`, `bg-white/82`, métricas locais | `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearAlert`, `SemearButton`, `SemearStatusBadge` |
| `/acoes/[id]/devolutiva` | `AppShell` -> `ActionDebriefPage` | `SemearAppShell` | folha administrativa crua | `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearAlert`, `SemearButton`, `SemearStatusBadge` |
| `/escutas` | `AppShell` -> lista de escutas | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/escutas/lote` | `AppShell` -> `ListeningRecordBatchForm` | `SemearAppShell` | formulário pesado com caixas grandes | `SemearPageHeader`, `SemearCard`, `SemearAlert`, `SemearButton`, blocos mobile mais leves |
| `/mapa` | `AppShell` -> `TerritorialListeningMap` | `SemearAppShell` | mapa-lista com hero/card antigo | `SemearPageHeader`, `SemearCard`, `SemearFilterBar`, `SemearMetricCard`, `SemearAlert`, `SemearButton` |
| `/relatorios` | `AppShell` -> hub de relatórios | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/memoria` | `AppShell` -> `ProjectMemoryDashboard` | `SemearAppShell` | arquivo com muitos cards bege | `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearButton`, `SemearStatusBadge` |
| `/memoria/novo` | `AppShell` -> workspace de relatório | `SemearAppShell` | formulário herdado | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/territorios` | `AppShell` -> painel de territórios | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |
| `/pos-banca` | `AppShell` -> consolidação pós-banca | `SemearAppShell` | cards locais | Shell novo aplicado; interior ainda usa padrão anterior em partes |

Componentes antigos encontrados: `components/ui/page-header.tsx`, `components/ui/metric-card.tsx`, `components/ui/filter-bar.tsx`, além de helpers locais `Panel`, `Metric`, `MiniList`, `StateBox` e muitos padrões inline com `bg-semear-offwhite`, `rounded-[2rem]`, `shadow-soft` e cards dentro de cards.

## Checklist por rota prioritária

### `/`

- Antes/problema observado: dashboard com vários blocos isolados, métricas herdadas e hierarquia pouco clara.
- Mudança aplicada: header executivo novo, CTA primário novo, métricas compactas modernas e painel mobile menos pesado.
- Componentes novos usados: `SemearPageHeader`, `SemearButton`, `SemearCard`, `SemearMetricCard`, `SemearStatusBadge`.
- Pendência visual restante: alguns painéis internos do dashboard ainda usam helpers locais para evitar alteração ampla de lógica nesta rodada.

### `/acoes/[id]/dossie`

- Antes/problema observado: parecia checklist administrativo dentro de uma folha grande.
- Mudança aplicada: cabeçalho forte de dossiê, badges de status, KPIs modernos, alerta metodológico e CTA primário para devolutiva.
- Componentes novos usados: `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearAlert`, `SemearButton`, `SemearStatusBadge`.
- Pendência visual restante: painéis analíticos importados de `analytical-panels` ainda têm estilo próprio.

### `/acoes/[id]/devolutiva`

- Antes/problema observado: modo público e técnico divididos, mas com aparência de formulário interno.
- Mudança aplicada: header de peça pública/técnica, métricas limpas e ressalva metodológica em alerta moderno.
- Componentes novos usados: `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearAlert`, `SemearButton`, `SemearStatusBadge`.
- Pendência visual restante: campos editáveis internos ainda são controles locais para preservar comportamento.

### `/escutas/lote`

- Antes/problema observado: formulário longo, caixas grandes e pouco respiro no celular.
- Mudança aplicada: header operacional, sessão fixa mais limpa, blocos brancos, alerta de privacidade discreto e barra de salvamento mais forte.
- Componentes novos usados: `SemearPageHeader`, `SemearCard`, `SemearAlert`, `SemearButton`, `SemearStatusBadge`.
- Pendência visual restante: inputs continuam locais para não mexer na validação e fluxo de submissão.

### `/mapa`

- Antes/problema observado: mapa-lista com aparência de lista antiga e cards pouco hierárquicos.
- Mudança aplicada: header novo, aviso metodológico elegante, filtros em barra comum, KPIs modernos e cards mais compactos.
- Componentes novos usados: `SemearPageHeader`, `SemearCard`, `SemearFilterBar`, `SemearMetricCard`, `SemearAlert`, `SemearButton`.
- Pendência visual restante: rankings laterais completos podem ser refinados em rodada futura.

### `/memoria`

- Antes/problema observado: memória parecia lista burocrática de relatórios.
- Mudança aplicada: linguagem de arquivo vivo, botões hierarquizados, KPIs leves, cards de relatório e linha do tempo mais limpos.
- Componentes novos usados: `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearButton`, `SemearStatusBadge`.
- Pendência visual restante: `/memoria/novo` ainda depende do workspace existente e recebeu o shell novo, mas não foi totalmente redesenhada internamente.

## Critério de aceite visual

| Rota | Mudou visualmente de forma clara? | Ainda parece sistema antigo? | Componentes antigos ainda aparecem |
| --- | --- | --- | --- |
| `/` | Sim | Parcialmente em painéis internos | Helpers locais `Panel`, `OperationList`, `CompactRanking` |
| `/acoes/[id]/dossie` | Sim | Menos; prioridade atendida | Alguns painéis analíticos próprios |
| `/acoes/[id]/devolutiva` | Sim | Menos; formulário ainda visível em modo técnico | `EditableBlock`, `InfoPanel`, `StatusNote` |
| `/escutas/lote` | Sim | Menos; inputs locais permanecem | classes locais de input |
| `/mapa` | Sim | Menos | `TabButton`, cards internos locais |
| `/memoria` | Sim | Menos | `InfoList`, `EmptyCard`, filtros antigos via `FilterBar` |

## Arquivos alterados

- `components/ui/semear-primitives.tsx`
- `components/layout/semear-app-shell.tsx`
- `components/dashboard.tsx`
- `components/actions/action-dossier-page.tsx`
- `components/actions/action-debrief-page.tsx`
- `components/mapa/territorial-listening-map.tsx`
- `components/listening-records/listening-record-batch-form.tsx`
- `components/memory/project-memory-dashboard.tsx`

