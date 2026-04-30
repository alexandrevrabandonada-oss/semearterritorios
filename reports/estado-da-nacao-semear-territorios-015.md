# Estado da Nação — SEMEAR Territórios 015

## Diagnóstico inicial

Foram verificados migrations, tipos e rotas principais do fluxo real:

- `public.get_user_role()` existe na migration de refinamento de RLS e é dependência das policies de `action_debriefs` e `action_closures`;
- `action_debriefs` e `action_closures` estão refletidas em `lib/database.types.ts`;
- rotas operacionais existem: `/acoes`, `/acoes/[id]`, `/acoes/[id]/piloto`, `/acoes/[id]/devolutiva`, `/acoes/[id]/dossie`, `/escutas/lote`, `/relatorios/[mes]`;
- impressão de devolutiva e dossiê usa CSS print e remove controles de operação;
- busca por “Hub Jogos Pré-Camp” não retornou ocorrências.

Observação: o schema versionado atual possui papéis `admin`, `coordenacao` e `equipe`. O papel `leitor` não existe no schema atual.

## Documentos criados

- `docs/homologacao-primeira-banca.md`
- `docs/runbook-primeira-banca.md`

## Rota /ajuda criada

Foi criada `/ajuda`, com:

- links para digitação em lote, ações e relatórios;
- checklist resumido da primeira banca;
- passo a passo curto;
- avisos de privacidade;
- explicação dos papéis;
- link na navegação principal.

## Seed demo criado

Arquivo: `scripts/seed-homologacao-banca.sql`

Cria em DEV/DEMO:

- ação “Homologação — Banca de Escuta Feira Livre”;
- bairro fictício;
- 12 escutas fictícias;
- mistura de revisadas e rascunhos;
- temas vinculados;
- uma escuta com telefone fictício `00000-0000` para testar alerta.

Não roda automaticamente e não deve ser usado em produção.

## Smoke test criado

Arquivo: `scripts/smoke-operacao-semear.md`

Cobre:

- login e acesso anônimo;
- rotas principais;
- fluxo equipe;
- fluxo coordenação/admin;
- impressão sem campos sensíveis;
- relatório mensal com status de dossiê.

## Dashboard

O dashboard ganhou o bloco “Próxima operação”, com:

- ações recentes;
- ações com dossiê aberto;
- ações com devolutiva pendente;
- ações com escutas em rascunho;
- links rápidos para digitar fichas, revisar escutas e fechar dossiê.

## Como fazer a homologação

1. Aplicar migrations em ambiente de homologação.
2. Confirmar usuários de teste com papéis esperados.
3. Rodar opcionalmente `scripts/seed-homologacao-banca.sql`.
4. Seguir `docs/homologacao-primeira-banca.md`.
5. Registrar falhas encontradas antes de liberar uso real.

## Como operar a primeira banca

Use `docs/runbook-primeira-banca.md`:

- antes da feira: cadastrar ação, conferir bairro, preparar fichas e equipe;
- depois da feira: digitar em `/escutas/lote`;
- revisão: preencher resumo, temas, prioridade e tratar dado sensível;
- devolutiva: gerar, revisar e aprovar;
- dossiê: conferir checklist, fechar e imprimir;
- relatório mensal: conferir alertas.

## Pendências reais antes de produção

- Aplicar migrations em banco real/staging na ordem correta.
- Testar RLS com usuários reais de cada papel.
- Manter a homologação apenas com `admin`, `coordenacao` e `equipe`, salvo decisão futura de criar `leitor` com migration própria.
- Validar impressão em navegador usado pela equipe.
- Fazer teste com fichas reais anonimizadas ou simuladas pela coordenação.

## Riscos restantes

- Detecção de dado sensível é heurística.
- Seeds DEV/DEMO dependem de execução manual correta.
- O papel `leitor` não faz parte do schema atual e não deve ser usado operacionalmente.
- Homologação manual ainda é necessária para confirmar políticas no Supabase real.

## Próximos passos

- Rodar homologação completa com equipe APS.
- Ajustar microcopy ou fluxo conforme observação da banca real.
- Só depois avançar para mapa geográfico real, PWA/offline ou novas funcionalidades.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
