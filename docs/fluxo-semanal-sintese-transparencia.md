# Implantação: semanais → sínteses → transparência

O novo fluxo substitui o preenchimento mensal obrigatório, mantendo os mensais manuais anteriores e a importação semanal. Não vincula o profissional à pessoa de qualquer cadastro anterior, não concede administração e não exige ciclos territoriais ou validação comunitária obrigatória.

## Migrações aditivas

- Sistema interno: `20261015232631_weekly_activity_monthly_synthesis.sql` (após a migração mensal anterior). Cria atividades, versões de produtos, vínculos de anexos, sínteses congeladas e histórico; protege a revisão dos semanais no banco.
- Site, repositório irmão SEMEAR PWA: `20261015233422_incoming_monthly_syntheses.sql`. Cria caixa editorial privada, publicação transacional e histórico. Mantém os bloqueios existentes de publicação e fonte pública.
- Complemento do site: `20261016005004_separate_weekly_public_listening_units.sql`. Preserva escutas individuais no contador histórico de escutas; relatos de roda permanecem em sua unidade própria e na síntese textual.
- Não executar seeds nem converter relatórios antigos. Validar o profissional ativo em `team_members` com papel `equipe`.

## Configuração exclusivamente no servidor

Sistema interno: `OPENAI_API_KEY` para a geração opcional; `OPENAI_MONTHLY_SYNTHESIS_MODEL` opcional; `SEMEAR_TRANSPARENCY_URL=https://www.semearsf.org/api/transparencia/receber-fechamento`; `SEMEAR_TRANSPARENCY_SYNC_SECRET` compartilhado, aleatório, mínimo 32 caracteres.

Site: mesmo `SEMEAR_TRANSPARENCY_SYNC_SECRET`; `SUPABASE_URL` (ou a URL pública já configurada) e `SUPABASE_SERVICE_ROLE_KEY` somente no servidor da função receptora. Nunca usar prefixos `NEXT_PUBLIC_`/`VITE_` para a chave de serviço ou segredo de sincronização.

A ausência das chaves não impede edição manual ou consulta: geração/envio apresentam indisponibilidade explícita. Configurar os segredos de forma privada, sem registrá-los em arquivos versionados, logs ou linha de comando. A implantação do site deve preservar suas alterações locais preexistentes; não promover indiscriminadamente toda a árvore de trabalho.

## Verificação

- `npm test`, `npm run lint`, `npm run build` no sistema interno.
- `node scripts/test-weekly-synthesis-db.mjs <caminho do módulo PGlite>`: banco PostgreSQL isolado, permissões, datas, produtos, revisão, congelamento e histórico.
- No site: `npm run typecheck`, `npm run lint`, `npm run build`.
- `npx tsx scripts/test-incoming-syntheses.ts`: validação estrita da projeção pública.
- `npx tsx scripts/test-incoming-receiver.ts`: recepção isolada, autorização, repetição idempotente e conflito de conteúdo.
- `node tools/test-incoming-syntheses-db.mjs <caminho do módulo PGlite>`: caixa privada, revisão obrigatória, substituição concorrente e preservação da publicação anterior.

## Piloto real antes de ampliar

1. Selecionar o profissional correto, uma semana e um mês real.
2. Registrar atividades e produtos, conferir anexos privados, enviar e revisar o semanal.
3. Conferir síntese individual e institucional, inclusive semanas entre meses, oficinas sem estimativa e meses de preparação.
4. Revisar a interpretação e fontes; testar ajustes e nova versão sem sobrescrever aprovação anterior.
5. Preparar PDF público sem dados pessoais, enviar projeção, conferir recibo e revisar no site antes de publicar.
6. Conferir o fechamento na transparência e a permanência do anterior quando uma nova versão estiver pendente.

Não criar dados fictícios na produção. A validação automatizada não substitui este piloto nem uma revisão humana da saída da IA. A lista de atividades oficial existente continua sendo a fonte quantitativa do projeto; os textos dos semanais não geram ações/participantes automaticamente.

## Situação da implantação em 15/10/2026

As migrações acima foram aplicadas nos projetos de destino e registradas em seu histórico. O segredo compartilhado de sincronização e a credencial privada de recepção foram configurados somente no ambiente de produção dos servidores. Não foram criados relatórios de teste na produção.

A publicação do site foi preparada a partir do commit já publicado `12ad798`, acrescido apenas dos cinco arquivos deste fluxo (recepção, validação, página editorial, rota e menu), sem incluir as outras alterações locais. Tipos, lint, build e teste de interface dessa cópia limpa passaram.

A Vercel recusou a publicação do site com `exceeded_serverless_functions_per_deployment`: limite de 12 funções no plano Hobby. A cópia contém 27 arquivos TypeScript na pasta API. A versão pública anterior não foi substituída. A recepção real entre os servidores e o piloto ficam pendentes até decidir entre consolidar APIs preservando suas rotas ou alterar o plano de hospedagem. Nenhuma dessas mudanças foi feita automaticamente.

O sistema interno foi publicado e promovido em produção: `dpl_7NtEwWPEX4GQCyq3bVnJYvV5b7Es`, URL de build `https://semearterritorios-pvsp-rhporagh7.vercel.app`, em `www.semearterritorios.online`. Base Git `716a1d4` mais os arquivos locais deste fluxo, sem commit novo. Build concluído, login HTTP 200, API mensal sem sessão HTTP 401 e páginas privadas redirecionando para login. A consulta de logs de erro dessa implantação não retornou eventos. O piloto autenticado com dados reais e a geração real com IA continuam pendentes.

O site permanece na implantação pública anterior `dpl_5gJ6GDRj1XEQTF9dgrsd6NeN2UVA`. A tentativa isolada `dpl_FEvEAqzpPbbY6JqxUYVxVzuf2r2n` terminou em erro de limite e não foi promovida. A caixa do site e o histórico de substituições continuam vazios, sem registros fictícios.
