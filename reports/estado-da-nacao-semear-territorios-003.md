# Estado da Nação - SEMEAR Territórios 003

Data: 2026-04-27  
Tijolo: 3 - Módulo de Ações

## Resumo

Foi implementado o módulo de Ações com listagem, filtros, criação, visualização e edição via Supabase. O módulo respeita a regra de que uma ação pode existir antes das escutas e não coleta dados pessoais de participantes.

O app usa variáveis públicas de ambiente para o Supabase e não grava credenciais sensíveis no repositório.

## Arquivos alterados

Criados:

- `.env.example`
- `app/acoes/nova/page.tsx`
- `app/acoes/[id]/page.tsx`
- `components/actions/action-detail.tsx`
- `components/actions/action-form.tsx`
- `components/actions/actions-list.tsx`
- `lib/actions.ts`
- `lib/supabase/client.ts`
- `supabase/migrations/20260427173000_extend_actions_module.sql`
- `reports/estado-da-nacao-semear-territorios-003.md`

Alterados:

- `app/acoes/page.tsx`
- `lib/database.types.ts`
- `package.json`
- `package-lock.json`

## Rotas implementadas

- `/acoes` - lista de ações com filtros.
- `/acoes/nova` - formulário de nova ação.
- `/acoes/[id]` - detalhe da ação e edição.

## Campos implementados

- título;
- data;
- bairro/território;
- tipo de ação;
- local;
- objetivo;
- equipe;
- público estimado;
- resumo;
- status;
- observações.

Status suportados:

- planejada;
- realizada;
- reprogramada;
- cancelada.

## Supabase

Foi instalado `@supabase/supabase-js`.

Foi criado cliente browser em `lib/supabase/client.ts`, usando:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Foi criada migration complementar para o módulo:

- `supabase/migrations/20260427173000_extend_actions_module.sql`

Ela adiciona:

- enum `action_status`;
- `actions.objective`;
- `actions.team`;
- `actions.estimated_public`;
- `actions.summary`;
- `actions.status`;
- índices para `status` e `action_type`.

## UX implementada

- Lista com filtros por mês, bairro, tipo e status.
- Botão `Nova ação`.
- Cards de resumo das ações.
- Estado vazio.
- Tratamento de loading.
- Tratamento de erro.
- Formulário claro com validação mínima.
- Página de detalhe com botão de edição.
- Aviso de privacidade para não registrar dados pessoais do público.

## Segurança e privacidade

O formulário não pede:

- CPF;
- telefone;
- endereço pessoal;
- dados pessoais de participantes.

A ação registra apenas dados coletivos e organizacionais da atividade territorial.

## Verificação

Comandos rodados:

- `npm run lint` - passou.
- `npm run build` - passou.
- `npm run verify` - passou.

O script `verify` foi adicionado ao `package.json` como:

```bash
npm run lint && npm run build
```

## Pendências operacionais

Para o CRUD funcionar contra o Supabase real, ainda é necessário:

1. configurar `.env.local` localmente com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
2. aplicar as migrations no banco Supabase;
3. garantir usuário autenticado, pois as políticas RLS atuais bloqueiam operações sem login;
4. cadastrar bairros/territórios ou criar o módulo de Territórios para alimentar o select.

## Riscos

1. A migration complementar ainda não foi aplicada no banco remoto.
2. O módulo depende de autenticação, mas o fluxo de login ainda não foi implementado.
3. Sem bairros cadastrados, o campo bairro aparece apenas com `Sem bairro definido`.
4. Os tipos TypeScript ainda são manuais e devem ser substituídos por geração oficial do Supabase CLI.
5. As políticas RLS ainda são simples para MVP interno e devem ser refinadas antes de produção.

## Próximos passos

1. Implementar autenticação interna.
2. Aplicar migrations no Supabase de desenvolvimento.
3. Criar o módulo de Territórios para cadastrar bairros.
4. Implementar o módulo de Escutas vinculado a `actions.id`.
5. Gerar tipos oficiais do Supabase após estabilizar o schema.
