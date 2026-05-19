# Estado da Nação - SEMEAR Territórios 070

Data: 18/05/2026

## Diagnóstico pós-069

O Tijolo 069 criou componentes visuais novos e aplicou em rotas reais, mas a aparência ainda carregava padrões de intranet: cards muito pesados, bege dentro de bege, radius exagerado, botões "Ver todos" repetidos, tabelas/listas simples e barras de ação com sensação de sobreposição.

## O que ainda parecia antigo

- Cards internos em `bg-semear-offwhite` dentro de cards brancos.
- Uso recorrente de `rounded-[2rem]` em painéis administrativos.
- Links e botões secundários com aparência de pill grande em excesso.
- Mapa-lista com cards textuais pouco escaneáveis.
- Dossiê com checklist documental no centro da narrativa.
- Devolutiva com aparência de editor técnico, não de peça pública.
- Sticky de lote/dossiê/devolutiva com risco visual de cobrir conteúdo.

## Mudanças aplicadas

- `SemearPageHeader`, `SemearCard`, `SemearMetricCard` e `SemearAlert` foram refinados para branco/quase branco, sombra leve, radius moderado e tipografia mais forte.
- A sidebar recebeu fundo verde escuro em gradiente, item ativo mostarda, ícones mais leves e perfil de rodapé mais discreto.
- O fundo geral passou a ter off-white quente com gradiente sutil, aproximando o app do mockup.
- Foram adicionadas classes utilitárias globais para links textuais, linhas modernas e painéis suaves.

## Rotas redesenhadas

- `/`: melhora direta via primitives e ajustes locais em painéis, cards internos e links "Ver todos →".
- `/mapa`: redesenho forte com cards territoriais compactos, mini-KPIs, chips e ranking lateral com barras.
- `/acoes/[id]/dossie`: topo mais executivo, status lateral, checklist secundário colapsável e rodapé de ações com sticky seguro.
- `/acoes/[id]/devolutiva`: modo público mais editorial, painéis brancos, exportação e aprovação em barra visualmente mais segura.
- `/escutas/lote`: blocos operacionais clareados, sticky bar corrigida e sidecards menos arredondados.
- `/memoria`: cards de relatórios e linha do tempo modernizados com linhas brancas, chips suaves e links menores.

## Componentes substituídos

- Primitives: `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `SemearAlert`.
- Layout: `SemearAppShell`.
- Dashboard: `Panel`, `CompactRanking`, `PedagogicEmpty`, blocos locais em `bg-semear-offwhite`.
- Mapa: cards de operação/referência, `TabButton`, `MiniStat`, `RankingPanel`.
- Dossiê: `Panel`, `Mini`, barra de ações, bloco de status.
- Devolutiva: `MiniList`, `InfoPanel`, exportação/fluxo.
- Lote: cards de sessão, fala, território e sticky action bar.
- Memória: cards de relatório, cards de entrada, `InfoList`, painel de curadoria.

## Ajustes por área

- Dashboard: KPIs ganharam linguagem mais próxima do mockup, botões primários ficaram mostarda, cards internos bege foram reduzidos e "Ver todos" virou link textual menor.
- Dossiê: checklist saiu do fluxo principal e virou seção secundária colapsável; status fica destacado como card compacto.
- Devolutiva: modo público ficou menos administrativo, com áreas narrativas em branco e controles técnicos visualmente separados.
- Mapa: deixou de parecer lista de relatório e passou a ter ranking lateral, barras horizontais e cards escaneáveis.
- Escutas/lote: formulário continua funcional, mas com menos bege e ação sticky sem obstrução visual.
- Memória: linha do tempo e relatórios ficaram mais leves e menos "admin antigo".
- Sticky/sobreposição: barras de dossiê, devolutiva e lote agora usam fundo branco translúcido, sombra, `bottom-4` e padding inferior quando necessário.

## Checklist visual

Relatório detalhado criado em `reports/redesign-visual-checklist-070.md`.

## Verificação

- `npm run lint`: passou sem warnings ou erros.
- `npm run build`: passou, incluindo geração das rotas `/`, `/mapa`, `/escutas/lote`, `/memoria`, `/acoes/[id]/dossie` e `/acoes/[id]/devolutiva`.
- `npm run verify`: passou.
- Testes de transparência: 4 arquivos, 14 testes aprovados.

## Screenshots

- Criados: `reports/screenshots/redesign-070-dashboard.png`, `reports/screenshots/redesign-070-mapa.png`, `reports/screenshots/redesign-070-lote.png`.
- Limitação: o navegador sem sessão autenticada redirecionou as rotas protegidas para `/login`; os screenshots documentam o bloqueio de autenticação, não o estado visual interno.
- Não foi gerado `redesign-070-dossie.png` por ausência de ID real autenticado no fluxo automatizado.

## Banco, RLS e autenticação

Não houve alteração em migrations, schema, RLS, autenticação, storage, uploads ou regras de negócio. As mudanças ficaram restritas a componentes React/CSS e relatórios.

## Riscos restantes

- `/relatorios` e `/pos-banca` receberam melhoria indireta via primitives, mas ainda merecem redesenho específico.
- Alguns painéis analíticos importados no dossiê podem manter micro-padrões antigos.
- A validação visual automatizada das telas internas depende de sessão autenticada com dados reais.
