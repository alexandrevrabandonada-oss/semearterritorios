# Estado da Nação - SEMEAR Territórios 001

Data: 2026-04-27  
Tijolo: 1 - Base visual e estrutural do app, sem banco

## Resumo

Foi criada a base inicial do SEMEAR Territórios como aplicação Next.js com App Router, TypeScript e Tailwind CSS. A home agora funciona como dashboard inicial, com navegação principal, identidade institucional, cards com dados mockados e páginas vazias para os módulos do MVP.

Não houve conexão com Supabase, criação de banco, uso de dados reais ou implementação de autenticação neste tijolo.

## Arquivos alterados

Arquivos de configuração criados:

- `.eslintrc.json`
- `.gitignore`
- `next-env.d.ts`
- `next.config.mjs`
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

Arquivos da aplicação criados:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `app/acoes/page.tsx`
- `app/escutas/page.tsx`
- `app/territorios/page.tsx`
- `app/mapa/page.tsx`
- `app/relatorios/page.tsx`
- `components/app-shell.tsx`
- `components/dashboard.tsx`
- `components/empty-module-page.tsx`
- `lib/semear-data.ts`

Relatórios:

- `reports/estado-da-nacao-semear-territorios-000.md`
- `reports/estado-da-nacao-semear-territorios-001.md`

## Rotas criadas

- `/` - Dashboard inicial
- `/acoes` - Estado vazio do módulo Ações
- `/escutas` - Estado vazio do módulo Escutas
- `/territorios` - Estado vazio do módulo Territórios
- `/mapa` - Estado vazio do módulo Mapa
- `/relatorios` - Estado vazio do módulo Relatórios

## O que foi implementado

- Layout institucional com nome `SEMEAR Territórios`.
- Subtítulo `Escuta, memória e cartografia popular`.
- Paleta inicial com verde profundo, off-white, cinza claro e detalhes amarelo/terra.
- Navegação principal com ícones:
  - Dashboard
  - Ações
  - Escutas
  - Territórios
  - Mapa
  - Relatórios
- Dashboard com cards mockados:
  - Total de ações
  - Total de escutas
  - Bairros visitados
  - Temas recorrentes
  - Pendências de revisão
- Estados vazios para módulos sem dados.
- Dados mockados centralizados e tipados em `lib/semear-data.ts`.
- Componentes reutilizáveis para casca do app, dashboard e páginas vazias.

## Verificação

Comandos rodados:

- `npm run lint` - passou sem warnings ou erros.
- `npm run build` - passou e gerou build estático das rotas.
- `npm run verify` - não executado porque o script `verify` ainda não existe em `package.json`.
- Servidor local iniciado com `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Acesso local a `http://127.0.0.1:3000` respondeu com status `200`.

Resultado do build:

- Next.js compilou com sucesso.
- Rotas estáticas geradas:
  - `/`
  - `/acoes`
  - `/escutas`
  - `/mapa`
  - `/relatorios`
  - `/territorios`

## Supabase

Supabase não foi configurado neste tijolo.

Não foram criados:

- cliente Supabase;
- variáveis `.env`;
- migrações;
- tabelas;
- políticas RLS;
- autenticação.

## Dados

Os números do dashboard são mockados e existem apenas para validar a interface.

Não há dados reais de pessoas, territórios, ações ou escutas.

## Riscos e observações

1. O projeto ainda não tem Git inicializado neste diretório.
2. A autenticação ainda não existe; o app ainda não está protegido.
3. Supabase e RLS ainda não foram configurados.
4. `npm audit` apontou 5 vulnerabilidades em dependências transitivas após a instalação: 1 moderada e 4 altas. Não foi aplicado `npm audit fix --force` porque poderia alterar versões com impacto fora do escopo do Tijolo 1.
5. O script `verify` ainda não existe.
6. A navegação existe e as páginas foram criadas, mas os módulos ainda não têm CRUD, filtros, persistência ou regras de acesso.

## Próximos passos recomendados

1. Inicializar Git no diretório oficial do projeto.
2. Criar um script `verify` combinando lint e build.
3. Implementar autenticação interna com Supabase Auth.
4. Criar migrações iniciais do banco com RLS preparada.
5. Implementar o primeiro módulo funcional: Escutas, mantendo separação entre fala original/síntese livre e interpretação da equipe.
6. Revisar dependências e vulnerabilidades depois que a base estiver versionada.
