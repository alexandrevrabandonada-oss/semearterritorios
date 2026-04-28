# Estado da Nação - SEMEAR Territórios 004

Data: 2026-04-27  
Tijolo: 4 - Módulo de Escutas

## Resumo

Foi implementado o módulo de Escutas para digitação das fichas em papel da Banca de Escuta e demais ações. O módulo permite cadastrar, listar, ver, editar e marcar escutas como revisadas, preservando a separação entre fala original/síntese livre e codificação da equipe por temas.

## Arquivos alterados

Criados:

- `app/escutas/nova/page.tsx`
- `app/escutas/[id]/page.tsx`
- `components/listening-records/listening-record-form.tsx`
- `components/listening-records/listening-records-list.tsx`
- `components/listening-records/listening-record-detail.tsx`
- `lib/listening-records.ts`
- `reports/estado-da-nacao-semear-territorios-004.md`

Alterado:

- `app/escutas/page.tsx`

## Rotas implementadas

- `/escutas` - lista de escutas com filtros.
- `/escutas/nova` - formulário de nova escuta.
- `/escutas/[id]` - detalhe, edição e revisão.

## Funcionalidades

- CRUD de escutas via Supabase.
- Relação muitos-para-muitos com temas em `listening_record_themes`.
- Seleção múltipla de temas/tags.
- Filtros por:
  - bairro;
  - ação;
  - tema;
  - status;
  - mês.
- Estado vazio.
- Loading e erro.
- Botão `Marcar como revisada`.
- Formulário amplo e confortável para digitação.
- Destaque visual para `Fala original / síntese livre`.

## Campos implementados

- ação vinculada;
- bairro/território;
- data;
- tipo de origem;
- entrevistador;
- faixa etária aproximada opcional;
- fala original / síntese livre;
- resumo da equipe;
- palavras usadas pela pessoa;
- lugares citados;
- prioridade apontada;
- observações inesperadas;
- status: rascunho ou revisado;
- temas marcados pela equipe.

## Segurança e método

O formulário exibe aviso explícito para não registrar:

- CPF;
- endereço pessoal;
- telefone;
- dados de saúde individual identificável.

As tags são apresentadas como `Temas marcados pela equipe`, separadas da fala original. Isso preserva a diferença entre escuta e interpretação/codificação.

## Verificação

Comandos rodados:

- `npm run lint` - passou.
- `npm run build` - passou.
- `npm run verify` - passou.

## Pendências operacionais

Para uso real do módulo, ainda é necessário:

1. aplicar as migrations do banco no Supabase;
2. configurar `.env.local` com as variáveis públicas do Supabase;
3. implementar autenticação/login;
4. cadastrar bairros/territórios;
5. garantir que os temas iniciais estejam semeados no banco.

## Riscos

1. Sem autenticação implementada, a RLS impedirá salvamento por usuários anônimos.
2. Os tipos Supabase ainda são manuais e podem divergir do banco se as migrations forem alteradas.
3. A exclusão/recriação das tags no modo edição é simples e adequada ao MVP, mas pode precisar de auditoria fina depois.
4. Ainda não há testes automatizados de interação.

## Próximos passos

1. Implementar autenticação interna.
2. Implementar módulo de Territórios para alimentar bairros.
3. Aplicar migrations e seed no Supabase.
4. Criar fluxo de Escutas integrado a Ações já realizadas.
5. Preparar relatório mensal a partir de escutas revisadas.
