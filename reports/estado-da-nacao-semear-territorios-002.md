# Estado da Nação - SEMEAR Territórios 002

Data: 2026-04-27  
Tijolo: 2 - Modelo de dados Supabase

## Resumo

Foi criada a primeira migration SQL do banco do SEMEAR Territórios, cobrindo ações, escutas, bairros/territórios, temas, lugares mencionados e relatórios mensais. A estrutura preserva a separação metodológica entre fala original/síntese livre e interpretação/codificação da equipe.

Não houve conexão com Supabase pelo app, não houve aplicação da migration no banco remoto e nenhuma credencial sensível foi gravada no projeto.

## Arquivos alterados

Criados:

- `supabase/migrations/20260427171000_create_semear_core_schema.sql`
- `supabase/seed.sql`
- `lib/database.types.ts`
- `reports/estado-da-nacao-semear-territorios-002.md`

## Tabelas criadas na migration

- `profiles`
- `neighborhoods`
- `actions`
- `listening_records`
- `themes`
- `listening_record_themes`
- `places_mentioned`
- `monthly_reports`

## Enums criados

### `source_type`

- `feira`
- `cras`
- `escola`
- `praca`
- `roda`
- `oficina`
- `caminhada`
- `outro`

### `review_status`

- `draft`
- `reviewed`

### `action_type`

- `banca_escuta`
- `roda`
- `oficina`
- `caminhada`
- `reuniao_institucional`
- `devolutiva`
- `outro`

## Campos e rastreabilidade

Todas as tabelas possuem UUID como primary key.

Todas as tabelas possuem:

- `created_at`
- `updated_at`

As tabelas operacionais possuem `created_by` quando faz sentido:

- `neighborhoods`
- `actions`
- `listening_records`
- `themes`
- `listening_record_themes`
- `places_mentioned`
- `monthly_reports`

A tabela `profiles` usa `id` vinculado a `auth.users(id)`.

## Privacidade

A migration não cria campos para:

- CPF;
- telefone;
- endereço pessoal do entrevistado;
- dado de saúde individual identificável.

O campo `saúde` existe apenas como tema coletivo/agregado, sem identificação individual.

## RLS

Row Level Security foi habilitada em todas as tabelas.

Políticas iniciais:

- `anon` não recebe acesso direto às tabelas.
- usuários autenticados podem ler os dados internos.
- usuários autenticados podem inserir registros operacionais quando `created_by = auth.uid()`.
- usuários autenticados podem atualizar registros internos.
- cada usuário só pode atualizar seu próprio `profile`.

Essa é uma política simples para MVP interno. Ela deve ser refinada quando houver papéis reais de equipe, coordenação e administração.

## Seeds

Foi criado seed de temas iniciais em:

- `supabase/seed.sql`

A migration também inclui o mesmo `insert ... on conflict do nothing` para garantir que os temas existam após aplicação do schema.

Temas iniciais:

- ar/poluição
- pó/sujeira
- saúde
- calor
- árvores/sombra
- água/rio
- lixo/resíduos
- abandono
- poder público
- empresas
- qualidade de vida
- não percebe problema
- inesperado/outro

Não foram semeados bairros porque nenhuma lista oficial de bairros/territórios foi fornecida. Isso evita inventar dado territorial.

## Tipos TypeScript

Foi criado `lib/database.types.ts` com tipos básicos para:

- enums;
- linhas das tabelas;
- inserts;
- updates;
- estrutura `Database` compatível com o formato usado por clientes Supabase tipados.

Esses tipos são manuais e devem ser substituídos por tipos gerados pelo Supabase CLI quando o projeto tiver fluxo de geração definido.

## Verificação

Comandos rodados:

- `npm run lint` - passou sem warnings ou erros.
- `npm run build` - passou com sucesso.
- `npm run verify` - não executado porque o script `verify` ainda não existe em `package.json`.

## Credenciais

As credenciais fornecidas na conversa não foram gravadas em arquivos do projeto.

Recomendação: rotacionar a `service_role` e a senha do banco se elas tiverem sido expostas fora de um ambiente seguro, porque esses valores dão acesso privilegiado.

## Próximos passos

1. Adicionar Supabase CLI ao fluxo do projeto, se for o padrão desejado.
2. Aplicar a migration em ambiente de desenvolvimento controlado.
3. Gerar tipos oficiais com Supabase CLI após aplicar a migration.
4. Criar script `verify` no `package.json`.
5. Implementar autenticação interna.
6. Refinar RLS por papéis (`equipe`, `coordenacao`, `admin`) antes de produção.
7. Implementar o módulo Escutas usando os campos já definidos em `listening_records`.

## Riscos

1. A migration ainda não foi executada contra o banco remoto.
2. As políticas RLS são adequadas para MVP interno, mas amplas para produção.
3. Não há testes automatizados de SQL neste repositório.
4. Os tipos TypeScript são manuais e podem divergir se a migration mudar.
5. O projeto ainda não tem `verify`.
