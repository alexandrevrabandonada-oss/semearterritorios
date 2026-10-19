# Relatórios mensais do profissional

## Arquitetura

Rotas: `/memoria/mensais`, `/memoria/mensais/novo` e `/memoria/mensais/[id]`. A API `POST /api/memoria/mensais/importar` recebe `report_id` e `file` (DOCX/PDF até 10 MB), ou `attachment_id` para reprocessamento. Retorna prévia `mapped`, qualidade, situação de extração, quantidade de seções e alertas de privacidade. Não altera o conteúdo do relatório automaticamente.

A API usa a sessão autenticada e RLS; não precisa de `SUPABASE_SERVICE_ROLE_KEY`. Arquivos são preservados no bucket privado `professional-monthly-documents`. Novos uploads têm caminhos únicos; não há políticas de substituição nem exclusão de versões.

As tabelas `professional_monthly_reports`, `professional_monthly_activity_links`, `professional_monthly_neighborhoods`, `professional_monthly_deliveries`, `professional_monthly_attachments` e `professional_monthly_history` são separadas dos relatórios semanais e institucionais. `project_memory_entries.source_monthly_report_id` mantém a origem mensal opcional. A criação inicial é interna, por coordenação/admin, a partir de relatório aprovado; publicação continua na curadoria existente.

O banco impõe exclusividade profissional/mês, fluxo de revisão, documento principal obrigatório, justificativas, integridade dos vínculos, bloqueio de conteúdo após envio e auditoria das transições. As alterações de filhos bloqueiam a linha do relatório para serializar edição e revisão. A função de auditoria é privada e somente acionável por trigger; clientes têm leitura do histórico.

## Migração e compatibilidade

A migração aditiva `20261014213804_professional_monthly_reports.sql` foi aplicada ao projeto vinculado `gtpitwhslqjgbuwlsaqg`, com registro no histórico de migrações. As seis tabelas foram verificadas com RLS habilitado e o bucket com acesso privado e limite de 10 MB. Nenhum relatório fictício foi criado no remoto.

As estruturas e os contadores dos relatórios semanais e institucionais não foram convertidos nem incrementados por este fluxo. O piloto operacional com um mês real depende do profissional e da coordenação; a suíte automatizada usa banco isolado.

## Verificação reproduzível

- `npm test`: inclui casos mensais de mapeamento e importação, além da regressão existente.
- `npm run lint`, `npx tsc --noEmit --incremental false` e `npm run build`.
- PostgreSQL isolado: instalar `@electric-sql/pglite@0.3.14` em diretório temporário e executar `node scripts/test-professional-monthly-db.mjs CAMINHO_ABSOLUTO_PGLITE/dist/index.js`. O teste verifica equipe proprietária, segunda equipe, coordenação, Storage e histórico sem acessar produção.
- Modelo: executar `scripts/build-monthly-report-template.py` com o Python do runtime de documentos. O modelo usa os títulos do formulário; o guia operacional está em `public/modelos/guia-relatorios-mensais.md`.

O renderizador padrão do DOCX não encontrou LibreOffice neste Windows. Foi usado Microsoft Word em instância oculta para exportação, seguido do Poppler do runtime para inspeção das três páginas. `scripts/render-monthly-template.ps1` reproduz a exportação em máquinas com Word instalado.

## Publicação em produção

Em 15/10/2026, foi publicada e promovida a versão `dpl_GnifBqX8zjstogTE4nTPJoCAqQTV`, com estado READY, no projeto Vercel `semearterritorios-pvsp`. O domínio `www.semearterritorios.online` foi confirmado como apontando para esse deployment. A publicação utilizou o estado de trabalho local testado sobre a base Git `716a1d4`, incluindo os arquivos mensais ainda não commitados.

As verificações remotas confirmaram `/login` com HTTP 200, `/memoria/mensais` e `/memoria/mensais/novo` redirecionando usuários sem sessão ao login, e a API de importação mensal respondendo HTTP 401 sem autenticação. A consulta dos logs da versão não encontrou registros nos níveis error/fatal no intervalo verificado. A consulta de Drains retornou 404 e não permite afirmar a configuração de monitoramento externo.

A `.vercelignore` preserva os componentes `components/reports` e exclui somente as pastas auxiliares na raiz, além de ambientes locais e anexos da conversa. O primeiro build remoto falhou porque o padrão sem âncora excluía esses componentes; o padrão foi corrigido antes da publicação.

O teste de interface anterior à publicação percorreu criação, ação vinculada, mapa social, importação real do DOCX, confirmação da prévia, envio, aprovação, criação de memória interna, reabertura e filtros móveis, em Edge com banco local isolado. O piloto com um mês real continua pendente da equipe responsável.

## Avisos existentes no projeto

O advisor remoto apontou funções antigas `SECURITY DEFINER` no schema público e proteção de senhas vazadas desativada; os avisos não se referem às novas tabelas ou funções mensais. Consulte as orientações de [funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Essas configurações existentes não foram alteradas por esta implementação.
