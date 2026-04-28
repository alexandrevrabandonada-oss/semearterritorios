# Estado da Nação - SEMEAR Territórios 000

Data: 2026-04-27  
Diretório analisado: `C:\Projetos\SEMEAR TERRITORIOS`

## Resumo executivo

O diretório `C:\Projetos\SEMEAR TERRITORIOS` está praticamente vazio no momento deste diagnóstico. Não há repositório Git inicializado, não há `package.json`, não há estrutura Next.js, não há rotas, componentes, bibliotecas instaladas ou configuração Supabase detectável neste diretório.

Foi criado apenas este relatório em `reports/estado-da-nacao-semear-territorios-000.md`, conforme solicitado. Nenhuma implementação de produto foi feita.

## Diagnóstico executado

Comandos/inspeções realizadas:

- Listagem do diretório raiz com arquivos ocultos.
- Verificação de status Git.
- Busca por arquivos com `rg --files`.
- Listagem recursiva rasa do diretório atual.
- Listagem do diretório pai `C:\Projetos` para confirmar o contexto.

## Estado atual do projeto

### Repositório

- Git: não inicializado.
- Resultado observado: `fatal: not a git repository (or any of the parent directories): .git`.
- Não há histórico, branch, remoto ou controle de alterações neste diretório.

### Stack atual

Nenhuma stack detectada no diretório atual.

Não foram encontrados:

- `package.json`
- `next.config.*`
- `tsconfig.json`
- `tailwind.config.*`
- `postcss.config.*`
- `app/`
- `pages/`
- `components/`
- `lib/`
- `supabase/`

Conclusão: o projeto SEMEAR Territórios ainda não foi scaffoldado neste diretório.

### Rotas

Nenhuma rota detectada.

Como não existe diretório `app/` ou `pages/`, não há rotas Next.js mapeáveis neste momento.

### Componentes

Nenhum componente detectado.

Não existe diretório `components/`, `src/components/` ou estrutura equivalente.

### Bibliotecas e dependências

Nenhuma biblioteca detectada.

Não existe `package.json`, então não há dependências declaradas, scripts NPM, versão de Next.js, React, TypeScript, Tailwind, shadcn/ui ou Supabase client para verificar.

### Supabase

Nenhuma configuração Supabase detectada.

Não foram encontrados:

- Diretório `supabase/`
- Migrações SQL
- Cliente Supabase em `lib/`
- Variáveis de ambiente `.env*`
- Tipos gerados do banco
- Configuração de auth
- Políticas RLS

### PWA

Nenhuma configuração PWA detectada.

Não foram encontrados:

- `manifest.json`
- service worker
- configuração `next-pwa`
- ícones públicos
- metadados de instalação

## Observações de contexto

No diretório pai `C:\Projetos`, existe um diretório irmão chamado `SEMEAR PWA`. Ele não foi analisado como parte deste diagnóstico porque o diretório de trabalho informado é `C:\Projetos\SEMEAR TERRITORIOS` e a entrega pediu diagnóstico do projeto atual. Se `SEMEAR PWA` for a base correta a ser reaproveitada, o próximo passo deve ser uma decisão explícita: migrar, copiar, adaptar ou manter os projetos separados.

## Riscos atuais

1. O projeto ainda não tem base técnica inicial.
2. Não há controle de versão no diretório atual.
3. Não há contrato de dados implementado.
4. Não há autenticação, RLS ou separação entre fala original e codificação da equipe.
5. Não há estrutura que permita validar rotas, build, lint ou testes.

## Plano de implementação em etapas

### Etapa 1 - Fundação do projeto

- Inicializar Git no diretório correto.
- Criar aplicação Next.js com App Router, TypeScript e Tailwind CSS.
- Definir layout base em português brasileiro.
- Criar estrutura inicial:
  - `app/`
  - `components/`
  - `lib/`
  - `reports/`
  - `supabase/`
- Adicionar scripts mínimos de verificação: lint, typecheck e build.

### Etapa 2 - Design system mínimo

- Configurar Tailwind.
- Adicionar shadcn/ui apenas para componentes que ajudem de fato.
- Criar layout interno com navegação para:
  - Dashboard
  - Ações
  - Escutas
  - Bairros/Territórios
  - Temas/Tags
  - Mapa por bairro
  - Relatório mensal
- Definir estados vazios e linguagem institucional acolhedora.

### Etapa 3 - Supabase e modelo de dados

- Configurar cliente Supabase.
- Criar migrações para:
  - `profiles`
  - `neighborhoods`
  - `actions`
  - `listening_records`
  - `themes`
  - `listening_record_themes`
  - `places_mentioned`
  - `monthly_reports`
- Incluir campos de rastreabilidade:
  - `created_at`
  - `updated_at`
  - `created_by`
- Preparar Row Level Security desde o início, mesmo que as políticas iniciais sejam simples.

### Etapa 4 - Autenticação e acesso interno

- Implementar login via Supabase Auth.
- Proteger rotas internas.
- Criar vínculo entre usuário autenticado e `profiles`.
- Garantir que registros criados recebam `created_by`.

### Etapa 5 - Módulo Escutas

- Criar formulário de escuta com separação explícita entre:
  - fala original / síntese livre;
  - interpretação/codificação da equipe.
- Implementar campos principais de `listening_records`.
- Evitar coleta de CPF, endereço pessoal, telefone e dado de saúde individual identificável.
- Criar listagem com filtros simples por ação, bairro, data, tema e status de revisão.

### Etapa 6 - Ações, bairros e temas

- CRUD simples para ações.
- CRUD simples para bairros/territórios.
- CRUD simples para temas/tags.
- Associação manual entre escutas e temas.

### Etapa 7 - Mapa por bairro e padrões

- Criar visualização territorial por bairro.
- Exibir volume de escutas, temas recorrentes e prioridades mencionadas.
- Evitar qualquer classificação automática como verdade final.

### Etapa 8 - Relatório mensal

- Gerar relatório mensal com base em escutas revisadas.
- Separar citações/sínteses livres de interpretação da equipe.
- Permitir edição humana antes de consolidar o relatório.

### Etapa 9 - PWA simples

- Adicionar manifesto.
- Ícones.
- Metadados.
- Estratégia simples de instalação.
- Avaliar cache apenas depois do fluxo principal estar estável.

## Próximo tijolo recomendado

Antes de implementar, decidir se este diretório vazio será a base oficial do SEMEAR Territórios ou se o diretório irmão `C:\Projetos\SEMEAR PWA` deve ser analisado como ponto de partida.

Se este diretório for confirmado como base oficial, o próximo tijolo deve ser: scaffold inicial Next.js + TypeScript + Tailwind + Git, ainda sem Supabase.
