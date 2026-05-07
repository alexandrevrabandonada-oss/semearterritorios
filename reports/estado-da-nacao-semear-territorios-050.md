# Estado da Nação — SEMEAR Territórios 050

## Tijolo 050

**Tema:** Modo Mobile Operacional

**Objetivo:** transformar o uso em celular em fluxo operacional de campo, sem degradar o desktop e sem alterar schema, RLS ou autenticação.

## Diagnóstico mobile

Diagnóstico feito por leitura do código e validação local de build, com checagem navegável limitada pelo gate de autenticação do sistema.

Problemas identificados antes das mudanças:
- sidebar desktop não era substituída por navegação operacional mobile robusta;
- header mobile era mínimo demais e sem ação contextual;
- `escutas/lote` ainda mantinha estrutura com sensação de desktop adaptado;
- dashboard mostrava densidade analítica cedo demais para o celular;
- filtros de ações e escutas ocupavam muito espaço em telas pequenas;
- listagens tinham cards, mas faltavam atalhos operacionais por card;
- ações e pós-banca não explicitavam fluxo guiado para leitura em campo;
- transparência interna precisava empilhar melhor os botões e métricas no mobile.

## Componentes criados

Novos componentes de layout:
- `components/layout/mobile-header.tsx`
- `components/layout/mobile-bottom-nav.tsx`
- `components/layout/mobile-app-shell.tsx`

Integração:
- `components/layout/semear-app-shell.tsx`

Resultado:
- desktop mantém sidebar;
- mobile ganha topbar compacta com menu lateral;
- mobile ganha ação contextual por rota;
- mobile ganha bottom navigation fixa com destaque para Digitar.

## Rotas adaptadas

### Shell global
- navegação mobile com drawer e bottom nav;
- ação contextual por rota;
- padding inferior para bottom nav no mobile.

### Dashboard (`/`)
- primeira dobra mobile focada em operação;
- card “Hoje / próxima operação”;
- atalhos principais no topo;
- painel de pendências do dia no mobile;
- padrões resumidos no mobile;
- gráficos mais densos mantidos para desktop.

### Escutas em lote (`/escutas/lote`)
- sessão mobile fixa no topo com ação, bairro, entrevistador e contador;
- formulário reorganizado em blocos operacionais;
- CTA principal visível: `Salvar e digitar próxima`;
- CTA secundário incluído: `Salvar rascunho`;
- sidebar lateral restrita ao desktop largo;
- reforço de privacidade no topo mobile.

### Escutas (`/escutas`)
- filtros recolhíveis no mobile;
- cards com ação, bairro, território de referência, entrevistador e alertas;
- botões `Abrir detalhe` e `Revisar` por card.

### Ações (`/acoes`)
- filtros recolhíveis no mobile;
- cards com total de escutas, situação de devolutiva e situação de dossiê;
- botões `Abrir`, `Digitar fichas` e `Revisar`.

### Nova ação (`/acoes/nova`)
- checkboxes de participantes ampliados para toque;
- barra de ação fixa no rodapé do mobile com Salvar e Cancelar;
- manutenção do aviso sobre local coletivo e bairro oficial.

### Mapa (`/mapa`)
- cards territoriais mantidos e reforçados como leitura principal;
- botão de detalhes por card;
- ranking vertical simples preservado;
- chips roláveis para palavras/lugares recorrentes;
- aviso de mapa-lista sem precisão geográfica preservado.

### Pós-banca (`/pos-banca`)
- bloco mobile de leitura guiada;
- seções sequenciadas com rótulos operacionais;
- foco em decisão, pendência e qualidade territorial.

### Transparência Viva
- `transparencia/snapshots`: botões empilháveis no mobile, métricas em grade compacta;
- `transparencia/homologacao`: botões full-width no mobile quando necessário;
- checklist com área de toque maior.

### Ajuda (`/ajuda`)
- nova seção `Uso no celular`;
- fluxo recomendado em campo explicado;
- reforço de privacidade e limitação do mobile para relatórios grandes.

## Mudanças em `/escutas/lote`

Principais alterações:
- resumo de sessão sticky no mobile;
- organização por etapas;
- botões maiores;
- labels mais claros;
- preservação de uma coluna no mobile;
- reforço de digitação como rascunho;
- fluxo de continuidade com limpeza do formulário após salvar e seguir.

## Mudanças no dashboard

- densidade reduzida na primeira dobra do mobile;
- atalhos operacionais antecipados;
- temas/palavras/bairros em leitura resumida;
- gráficos detalhados mantidos para desktop.

## Mudanças em `/acoes`

- card de ação passou a mostrar dados mais úteis para campo;
- filtros ficaram recolhíveis no mobile;
- ação pode virar ponto de entrada para digitar ou revisar imediatamente.

## Mudanças em `/mapa`

- reforço da leitura em cards;
- inclusão de chips roláveis para palavras/lugares recorrentes;
- CTA para detalhes do território;
- sem qualquer introdução de mapa geográfico.

## Mudanças em `/pos-banca`

- leitura guiada em celular;
- foco em sequência operacional;
- seções rotuladas para reduzir dispersão.

## Testes de largura

Larguras alvo do tijolo:
- 360px
- 390px
- 430px
- 768px
- desktop

Validação efetivamente executada:
- build local e checagem de erros nos arquivos tocados: OK;
- navegação por navegador local confirmou gate correto para rotas internas sem sessão, redirecionando para `/login`;
- inspeção visual autenticada completa das rotas internas **não pôde ser concluída** no navegador integrado porque a sessão real de usuário não estava disponível no ambiente de execução.

Mesmo sem sessão autenticada no navegador integrado, os ajustes foram implementados diretamente nos componentes e validados por:
- análise estrutural das grades, sticky areas, drawers e cards;
- checagem de erros TypeScript/React por arquivo;
- `npm run lint` / `npm run build` / `npm run verify` ao final.

## Confirmação sobre desktop

Desktop continua funcionando como versão principal analítica:
- sidebar preservada;
- layout largo preservado;
- seções densas continuam disponíveis em desktop;
- shell mobile só entra abaixo de `lg`.

## Restrições respeitadas

- nenhum schema novo;
- nenhuma alteração de RLS;
- nenhuma alteração em autenticação;
- nenhum mapa geográfico;
- nenhuma página pública nova;
- desktop não removido;
- rotas existentes preservadas;
- sem uso de `service_role` no frontend.

## Riscos restantes

- faltou validação visual autenticada completa em navegador real nas rotas internas por ausência de sessão compartilhada no ambiente do agente;
- alguns módulos menos frequentes no campo ainda dependem principalmente da melhora do shell e não de redesign profundo de cada tela;
- relatórios e homologações longas seguem mais confortáveis no desktop, apesar de estarem mais utilizáveis no mobile.

## Próximo tijolo recomendado

**Tijolo 051 — Sessão autenticada de homologação mobile + testes visuais automatizados**

Objetivo sugerido:
- criar rotina de validação visual autenticada para 360/390/430/768;
- registrar capturas por rota crítica;
- tratar overflow residual fino;
- preparar base para eventual PWA/offline em tijolo posterior, sem ainda ativar armazenamento local sensível.
