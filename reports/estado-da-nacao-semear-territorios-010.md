# SEMEAR Territórios - Estado da Nação
**Sprint 010: Consolidação Operacional, Segurança e Prontidão para Uso Real**

## Resumo Executivo
Nesta sprint, o foco saiu da criação de novas "features" e voltou-se totalmente para a estabilização e a segurança da aplicação, garantindo que o MVP esteja pronto para receber dados reais das Bancas de Escuta da APS/SEMEAR. 

O app agora conta com um sistema de autenticação via `@supabase/ssr`, proteção de rotas com Middleware e Row Level Security (RLS) refinado, baseando-se nos papéis de usuários criados na tabela `profiles`. Além disso, foram implementadas validações de qualidade de dados vitais no registro de escutas.

## 1. Diagnóstico Inicial (Antes da Sprint)
- As rotas da aplicação eram abertas e dependiam exclusivamente de bloqueio client-side ingênuo.
- O cliente Supabase configurado (`@supabase/supabase-js`) não suportava validação segura de cookies em ambiente Next.js App Router (SSR).
- As políticas de segurança (RLS) utilizavam uma regra genérica `using (true)` para leitura e edição, dando a qualquer usuário autenticado poderes de Admin.
- Faltavam travas na ficha de escuta para impedir o salvamento sem campos críticos e validações condicionais baseadas no status de revisão.

## 2. Autenticação e Rotas Protegidas
- **Pacote Instalado:** `@supabase/ssr` para lidar com cookies de forma segura entre Server Components e Server Actions.
- **Middleware Global:** Criado `middleware.ts` no diretório raiz. Todas as rotas (exceto `/login` e `/api/*`) redirecionam usuários não autenticados para a tela de login.
- **Login Institucional:** Desenvolvida a interface em `/login` comunicando-se via Server Actions (`actions.ts`) sem vazar chaves ou exibir estados inseguros.

## 3. Matriz de Perfis e RLS (Row Level Security)
Aplicada a migration `20260428000000_refine_rls_policies.sql`, implementando as seguintes regras atreladas à tabela `profiles`:
- **Leitor:** Tem acesso de apenas leitura a todo o sistema.
- **Equipe:** Pode visualizar tudo, criar novos registros (ações, escutas, bairros) e modificar exclusivamente os registros que ela mesma criou (`created_by = auth.uid()`).
- **Coordenação e Admin:** Possuem poder total de leitura, criação e edição sobre todos os dados.
- **Usuários Anônimos (anon):** Sem nenhum acesso direto ao banco.

## 4. Qualidade de Dados nas Escutas
O formulário de escutas (`listening-record-form.tsx`) recebeu uma rigorosa malha de proteção:
- **Avisos de LGPD explícitos:** *"Não registre CPF, endereço pessoal, telefone..."*
- **Obrigatoriedade:** Impossível salvar a escuta sem referenciar Bairro, Ação, Data, Entrevistador e a Fala Livre.
- **Validação Condicional de Revisão:** Se a escuta for marcada como "Revisada", o sistema obriga o preenchimento de Tema (ou justificativa em "Inesperados"), Resumo da Equipe e apontamento de Prioridade.

## 5. Salva-Guarda dos Relatórios e IA
- Foi criada a função **Salvar no banco** (`upsert` na tabela `monthly_reports`), que congela a análise do mês (seja ela humana ou a sugestão da IA).
- Mantidos os avisos de que o gerador da IA é apenas uma análise exploratória que exige revisão, e os dados sensíveis nunca são enviados para a API do Vercel/OpenAI.

## 6. Sementes e Prontidão
- Adicionado o script `neighborhoods.example.sql` para facilitar a inicialização dos territórios oficiais sem hardcoding.
- Todo o build foi validado com `npm run verify` sem erros de lint ou tipagem.

## Próximos Passos
1. Convidar os usuários da Coordenação/Equipe via painel do Supabase.
2. Definir o papel deles (admin, coordenacao, equipe) na tabela `profiles`.
3. Subir os territórios oficiais no banco usando o script de semente.
4. Iniciar a primeira onda de digitação de dados de papel para o banco de dados.
