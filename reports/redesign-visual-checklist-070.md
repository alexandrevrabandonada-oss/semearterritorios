# Checklist visual comparativo - Tijolo 070

Data: 18/05/2026

## /

- Problema antes: dashboard ainda com blocos bege dentro de cards, botões "Ver todos" em badge chamativo, hierarquia fraca entre KPIs e painéis secundários.
- Mudança aplicada: primitives globais de header/card/KPI ficaram mais leves, com card branco, sombra baixa, título maior, ícones em chips suaves e botão primário mostarda; painéis locais trocaram caixas bege por branco e links textuais "Ver todos →".
- Componente substituído: `SemearPageHeader`, `SemearCard`, `SemearMetricCard`, `Panel`, `CompactRanking`, `PedagogicEmpty`.
- O que ainda parece antigo: algumas subseções internas do dashboard continuam extensas e dependem de uma terceira passada para reduzir conteúdo técnico.
- Avaliação: mudou claramente.

## /acoes/[id]/dossie

- Problema antes: checklist documental ocupava o miolo da narrativa, excesso de `rounded-[2rem]`, mini-blocos bege, barra de ação visualmente pesada.
- Mudança aplicada: topo ganhou status executivo à direita, checklist/devolutiva foram movidos para bloco secundário colapsável, painéis locais usam radius moderado, branco e sombra leve, e a barra de ações ganhou fundo/transparência/padding para não parecer sobreposição bruta.
- Componente substituído: `Panel`, `Mini`, rodapé de ações, bloco inicial do dossiê.
- O que ainda parece antigo: painéis analíticos importados de `analytical-panels` podem conter padrões legados pontuais.
- Avaliação: mudou claramente.

## /acoes/[id]/devolutiva

- Problema antes: devolutiva tinha cara de editor/admin, com painéis bege e rodapé de ações pesado.
- Mudança aplicada: modo público ficou mais branco e editorial, painéis laterais usam sombra sutil, exportação/fluxo ganhou barra sticky com fundo e padding, botões ficaram menos pill.
- Componente substituído: `MiniList`, `InfoPanel`, bloco de exportação, bloco de status.
- O que ainda parece antigo: campos editáveis ainda evidenciam interface técnica quando a tela está no modo interno.
- Avaliação: mudou médio.

## /escutas/lote

- Problema antes: fluxo tinha muitos blocos bege/formulário antigo, sticky bottom podia competir com conteúdo no mobile, sidebar local usava `rounded-[2rem]`.
- Mudança aplicada: cards de sessão, fala e território passaram a branco com sombra leve; sticky action bar foi aproximada do rodapé real com padding inferior na página; sidecards reduziram radius.
- Componente substituído: cards locais do formulário, seção de território, barra sticky, cards laterais.
- O que ainda parece antigo: inputs ainda são numerosos por natureza operacional, mas agora estão em blocos mais leves.
- Avaliação: mudou claramente.

## /mapa

- Problema antes: cards territoriais pareciam relatório/tabela simples; ranking inexistente ou pouco visual; abas sem força visual.
- Mudança aplicada: mapa-lista ganhou composição com conteúdo principal e ranking lateral, cards compactos, mini-KPIs, chips de tema, barras horizontais e abas com ativo mostarda.
- Componente substituído: cards de operação, cards de referência, `TabButton`, `RankingPanel`, `MiniStat`.
- O que ainda parece antigo: sem mapa geográfico por regra do tijolo; o formato segue mapa-lista.
- Avaliação: mudou claramente.

## /memoria

- Problema antes: memória misturava relatório com cards bege e links pill repetidos.
- Mudança aplicada: cards de relatório e linha do tempo usam `semear-modern-row`, chips verdes suaves, links textuais menores e painéis brancos.
- Componente substituído: cards de relatório, cards de entrada curada, painel de curadoria, `InfoList`.
- O que ainda parece antigo: filtros continuam densos, mas preservam funcionalidade.
- Avaliação: mudou médio.

## /relatorios

- Problema antes: rota com risco de manter aparência administrativa antiga.
- Mudança aplicada: ganhou parcialmente pelas primitives globais (`SemearPageHeader`, `SemearCard`, `SemearMetricCard`) sem alteração específica de lógica.
- Componente substituído: primitives compartilhados.
- O que ainda parece antigo: precisa de redesenho dedicado em tijolo futuro.
- Avaliação: mudou médio.

## /pos-banca

- Problema antes: rota extensa com visual herdado.
- Mudança aplicada: melhora indireta via primitives globais e shell/sidebar.
- Componente substituído: primitives compartilhados.
- O que ainda parece antigo: conteúdo específico não recebeu segunda composição própria neste tijolo.
- Avaliação: mudou médio.

## Auditoria de screenshots

- Arquivos gerados: `reports/screenshots/redesign-070-dashboard.png`, `reports/screenshots/redesign-070-mapa.png`, `reports/screenshots/redesign-070-lote.png`.
- Observação: sem sessão autenticada no navegador automatizado, as rotas protegidas redirecionaram para `/login`; as imagens registram esse bloqueio de autenticação, não o visual interno final.
- Arquivo não gerado: `reports/screenshots/redesign-070-dossie.png`, porque a rota exige um ID real de ação e sessão autenticada.

## Resultado mínimo

- `/`: mudou claramente.
- `/acoes/[id]/dossie`: mudou claramente.
- `/mapa`: mudou claramente.
- `/escutas/lote`: mudou claramente.
