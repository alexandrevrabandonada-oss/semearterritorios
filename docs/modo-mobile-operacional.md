# Modo Mobile Operacional

## Conceito

O modo mobile operacional do SEMEAR Territórios não tenta reproduzir o desktop em tela pequena. A proposta é priorizar operação de campo com poucos toques, leitura rápida e segurança de privacidade.

Princípios:
- mobile-first para ações, bancas e feiras;
- digitação em lote como fluxo principal;
- navegação curta, com acesso imediato a Digitar e Escutas;
- cards em vez de tabelas largas;
- filtros recolhíveis no celular;
- desktop preservado com sidebar e densidade analítica maior.

## Principais rotas

### Navegação global
- Mobile usa header compacto com menu lateral.
- Mobile usa bottom navigation fixa com 4 atalhos: Início, Ações, Digitar, Escutas.
- O atalho Digitar leva para `/escutas/lote` e recebe destaque visual.

### Dashboard (`/`)
- No celular, a primeira dobra prioriza “Hoje / próxima operação”.
- Atalhos principais: Digitar fichas, Revisar escutas, Abrir ação, Fechar dossiê.
- Padrões resumidos no mobile: top 3 temas, top 3 palavras e bairros com mais escutas.
- Gráficos mais densos permanecem focados em desktop.

### Digitar fichas (`/escutas/lote`)
- Fluxo principal de campo.
- Sessão fixa com ação, origem e entrevistador.
- Resumo mobile fixo no topo com ação, bairro, entrevistador e contador.
- Formulário agrupado em blocos:
  1. ação e sessão
  2. fala e síntese
  3. território de referência
  4. perfil opcional
  5. temas
  6. revisão e observações
- Dois botões principais:
  - Salvar e digitar próxima
  - Salvar rascunho

### Escutas (`/escutas`)
- Listagem em cards.
- Cada card mostra ação, bairro, território de referência, entrevistador, status, temas e alertas.
- Filtros ficam recolhíveis no celular.
- Revisão pode ser aberta diretamente do card.

### Ações (`/acoes`)
- Listagem em cards.
- Cada card mostra data, território, total de escutas, situação da devolutiva e situação do dossiê.
- Atalhos por card: Abrir, Digitar fichas, Revisar.
- Filtros recolhíveis no celular.

### Nova ação (`/acoes/nova`)
- Formulário em uma coluna no celular.
- Aviso de local coletivo visível.
- Lista de participantes com checkboxes maiores e campo de responsabilidade.
- Barra de ação fixa no rodapé com Salvar e Cancelar.

### Mapa-lista (`/mapa`)
- Mantém lógica de mapa-lista, sem geografia precisa.
- Cards territoriais compactos.
- Ranking de temas em lista vertical.
- Palavras/lugares recorrentes em chips roláveis.
- Aviso mantido: mapa-lista sem precisão geográfica.

### Pós-banca (`/pos-banca`)
- Leitura guiada no celular.
- Sequência: selecionar ação, resumo, pendências, temas, territórios de referência, qualidade territorial e decisão.
- Bloco de leitura guiada aparece no mobile para reduzir dispersão.

### Transparência Viva (`/transparencia/snapshots`, `/transparencia/homologacao`)
- Cards empilhados.
- Botões full-width no celular quando necessário.
- Checklist segue vertical.
- Totais dos snapshots usam grade 2 colunas no mobile.

## Diferença desktop x mobile

### Desktop
- Sidebar fixa.
- Mais densidade analítica.
- Gráficos, comparações e painéis extensos aparecem com mais destaque.
- Melhor para relatórios, homologações e leitura longa.

### Mobile
- Header compacto.
- Menu lateral mobile.
- Bottom navigation fixa.
- Menos informação na primeira dobra.
- Foco em digitação, revisão, pendências e atalhos operacionais.

## Fluxo recomendado em campo

1. Abrir o sistema no celular.
2. Ir para Digitar.
3. Fixar ação, origem e entrevistador.
4. Digitar uma ficha por vez.
5. Salvar e seguir para a próxima ficha.
6. Se necessário, salvar como rascunho.
7. Depois da banca, abrir Escutas para revisar.
8. Só então avançar para devolutiva, dossiê e pós-banca.

## Como digitar fichas no celular

1. Entre em `/escutas/lote`.
2. Selecione a ação da sessão.
3. Escolha o membro da equipe que conduziu a escuta.
4. Registre a fala original com texto legível e sem identificadores pessoais.
5. Preencha território de referência apenas em nível agregado.
6. Marque temas preliminares.
7. Use “Salvar e digitar próxima” para operação contínua.
8. Use “Salvar rascunho” quando quiser interromper e revisar depois.

## Privacidade e segurança

- Não registrar CPF, telefone, endereço, e-mail ou nome completo da pessoa escutada.
- Não registrar ponto geográfico ou endereço exato.
- O mobile não usa `service_role` no frontend.
- Nenhuma regra de autenticação, RLS ou schema foi alterada neste tijolo.
- O mapa continua não geográfico.

## Limitações atuais

- Não há modo offline/PWA neste tijolo.
- Rotas analíticas extensas ainda ficam melhores no desktop.
- A validação visual autenticada em navegador depende de sessão real de usuário.
- O modo mobile melhora a operação, mas não substitui revisão posterior em telas maiores para decisões institucionais complexas.

## Próximos passos

- Refinar layouts mobile de rotas menos usadas em campo, como relatórios longos e módulos administrativos.
- Introduzir testes visuais automatizados com sessão autenticada de homologação.
- Avaliar, em tijolo futuro, base para PWA/offline e rascunho local seguro.
