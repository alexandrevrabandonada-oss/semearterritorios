# SEMEAR Territórios - Estado da Nação
**Sprint 011: Operação Real da Primeira Banca e Digitação em Lote**

## Resumo Executivo
Nesta sprint o sistema recebeu a funcionalidade chave para a operação de campo do projeto: o **Modo de Digitação em Lote da Banca de Escuta**. Ele viabiliza a rápida digitalização de formulários preenchidos no papel pela equipe de campo durante ações em praças e feiras, preservando a fala original com as travas de LGPD, garantindo que as escutas sejam salvas como rascunhos para posterior avaliação.

Adicionalmente, foi incluída a visualização de **Síntese Determinística da Ação**, que extrai um resumo das escutas diretamente para embasar a escrita oficial dos relatórios.

## 1. Diagnóstico Inicial
O sistema estava blindado com autenticação e validações pesadas, o que inviabilizava o fluxo rápido de digitação por exigir o travamento do estado em formulários individuais. Além disso, a nomeclatura histórica "Hub Jogos Pré-Camp" ainda constava em arquivos obsoletos de relatórios.

### Correção de Nomenclatura
O nome do projeto foi definitivamente atualizado em todos os relatórios (`008.md`, `009.md`, `010.md`) para **SEMEAR Territórios**.

## 2. Nova Rota e Componente de Digitação em Lote
- **`app/escutas/lote/page.tsx`**: Rota focada inteiramente na operação de digitação contínua.
- **`listening-record-batch-form.tsx`**: Permite travar a *Ação* (pré-carregando *Bairro* e *Data*) e a *Origem* (ex: "feira").
- Possui um detector Regex em tempo real que exibe um `<Alert>` se detectar CPFs, números de telefone ou emails na fala livre.
- Conta o número de sessões digitadas e limpa os campos para a próxima ficha automaticamente, forçando que as escutas geradas comecem obrigatoriamente no status `draft`.

## 3. Checklist de Qualidade 
- Criado o componente **`listening-quality-checklist.tsx`**.
- Ele avalia uma escuta nos seguintes critérios: fala original, ação, bairro, data, elaboração do resumo da equipe, presença de tema (ou nota inesperada) e prioridade.
- Adicionado visualmente ao final do painel de leitura individual (`/escutas/[id]`).

## 4. Gestão e Fila de Revisão
- Os filtros na listagem de escutas (`/escutas`) foram expandidos para incluir buscas por falhas de qualidade: **Sem tema marcado**, **Sem resumo da equipe** e **Sem prioridade apontada**.
- Foram incluídos *Cards Resumo* no topo da página de listagem apontando os totais gerais, rascunhos, revisadas e o quantitativo crítico de escutas sem tema.

## 5. Síntese Determinística de Ação
- Criado o sub-componente **`action-synthesis.tsx`**.
- Acoplado ao detalhamento de Ações (`/acoes/[id]`).
- Este componente faz uma leitura estatística de todas as escutas daquela ação listando: total pendente, temas mais citados (Top 5), palavras recorrentes (Top 10), lugares citados e observações.
- Possui o botão **Copiar síntese** formatando o texto limpo para colagem nos relatórios do Google Docs ou painel mensal. Sem interferência da IA.

## Riscos Restantes
- **Carga de Dados na Nuvem:** A inserção muito acelerada de escutas ainda não foi testada contra eventuais gargalos ou restrições do Supabase (embora as transações sejam simples).
- **Digitação em Offline:** Se a internet cair no meio do fluxo, não existe sistema de caching no navegador. A digitação atual assume conexão estável no escritório.

## Próximos Passos
1. Levar o fluxo offline para o navegador via Service Workers (PWA) caso a equipe necessite digitar diretamente no celular durante a feira.
2. Iniciar a fase de visualização dos dados geográficos com o cruzamento das áreas prioritárias e lugares citados em um mapa iterativo (Tijolo 12).
