# Auditoria técnica — 10/09/2026

Escopo: revisão local da aplicação Next.js, autenticação, APIs de síntese e importação/processamento de relatórios, configuração de verificação e testes existentes. Não constitui validação integral de todos os fluxos ou do ambiente de produção.

## Problemas corrigidos

- **Alta — síntese sem autenticação:** `/api/gerar-sintese` podia consumir a API de IA sem validar usuário ou perfil. Agora exige identidade confirmada pelo Supabase e papel admin, coordenacao ou equipe. JSON inválido recebe 400; mensagens internas do provedor não são devolvidas ao cliente.
- **Alta — autorização de relatórios:** a importação com service role verificava a existência do perfil, mas não exigia papel autorizado. O processamento também permitia proprietário/upload anterior sem verificar se o papel continuava autorizado. Ambos agora exigem papel autorizado, mantendo as verificações de propriedade existentes.
- **Média — redirecionamento OAuth:** o parâmetro `next` aceitava barra invertida e caracteres de controle, que podem alterar a interpretação da URL. A validação rejeita esses caracteres e mantém caminhos internos.
- **Média — sessão em redirecionamentos:** o middleware descartava os cookies renovados ao criar respostas de redirecionamento. Agora copia os cookies para a resposta final.
- **Média — tamanho de anexo:** o processamento confiava apenas no tamanho registrado no banco. Agora também verifica o tamanho do arquivo baixado antes da extração.
- **Verificação incompleta:** `npm run verify` não executava `tests/report-extraction.test.ts`. Agora executa toda a suíte por meio de `npm test`.
- **Alta — função remota contornava RLS:** `create_public_transparency_snapshot_version(uuid, text)` estava como `SECURITY DEFINER` e podia ser executada por `anon`. Como os identificadores dos snapshots são públicos, uma chamada anônima poderia criar versões editoriais contornando a política de inserção. A migração preparada muda a função para `SECURITY INVOKER`, remove execução anônima dos helpers privilegiados, restringe funções de trigger e fixa o `search_path` de `get_user_role()`.

## Validação

- `npm run verify` aprovado: lint sem avisos, compilação de produção e checagem de tipos concluídas, todos os testes aprovados.
- `git diff --check` aprovado.
- Suíte ampliada de 22 para 54 testes, todos aprovados.
- Testes de regressão cobrem chamadas anônimas, perfis não liberados, autorização das rotas privilegiadas, destinos OAuth e preservação de cookies.
- Nenhum arquivo de credenciais está versionado entre os arquivos `.env*`; somente `.env.example`.
- O projeto Supabase foi reativado e auditado diretamente: 50 migrações registradas, 127 políticas, nenhuma tabela pública sem RLS e nove funções `SECURITY DEFINER` examinadas.
- A correção passou primeiro no SQL Editor dentro de uma transação revertida e, após aprovação, foi aplicada ao banco remoto com registro no histórico de migrações.

## Limitações e pendências

- A consulta inicial de dependências falhou por certificado. Na continuação, os certificados confiáveis do Windows foram fornecidos via `NODE_EXTRA_CA_CERTS`, sem desativar TLS; a consulta identificou 22 dependências afetadas. O novo lockfile e a auditoria após instalação retornaram zero vulnerabilidades. `npm ls next postcss --depth=1` confirmou Next.js 15.5.25 e PostCSS 8.5.28, sem dependências inválidas.
- Não foram executados login da aplicação, chamadas pagas à IA ou operações no Google Calendar.
- A migração de segurança foi aplicada ao banco remoto e registrada como `20260910214126_harden_security_definer_functions`.

Referência técnica consultada: [Supabase — clientes SSR e validação da identidade](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

## Continuação

- Next.js atualizado de 14.2.35 para 15.5.25, com `eslint-config-next` correspondente. Migração das páginas dinâmicas e do cliente Supabase servidor para `params`, `searchParams` e `cookies()` assíncronos.
- PostCSS interno do Next.js fixado em 8.5.28 por override para eliminar os alertas da versão 8.4.31. Demais dependências resolvidas dentro das faixas declaradas.
- Processamento de anexos agora respeita a regra de edição da equipe: somente relatórios `draft` ou `needs_changes`. Antes, o cliente privilegiado permitia sobrescrever relatórios fechados.
- Importação agora verifica falhas de persistência do vínculo do anexo, dos vínculos territoriais/de ações, da extração e do relatório final, retornando erro e identificador do rascunho em vez de sucesso falso.
- Listas de vínculos inválidas são rejeitadas antes de gravar; identificadores repetidos são deduplicados.
- O projeto Supabase estava pausado e foi restaurado pelo painel. Depois da restauração, o Advisor Center não apontou alertas de segurança, desempenho ou saúde; a inspeção manual encontrou a exposição da função privilegiada descrita acima.
- A consulta remota confirmou a tabela `public_transparency_snapshots`; ela contém zero registros publicados neste momento.
- A migração `20260910214126_harden_security_definer_functions.sql` foi validada entre `BEGIN` e `ROLLBACK` e depois aplicada em uma transação definitiva. A conferência posterior confirmou o registro da migração, `SECURITY INVOKER` na criação de versões, bloqueio de `anon`, acesso de `authenticated`, `search_path` fixo e bloqueio de execução direta das funções de trigger.
- A tela pública distinguia incorretamente falha de API de ausência de publicação. Agora apresenta mensagem de indisponibilidade e botão `Tentar novamente`.
- Adicionados ícone da aplicação e atributos de autocomplete do login.

### Verificação no navegador

Playwright CLI em Chromium, `http://localhost:3100`, com viewports 1440×900 e 390×844. O plugin Browser com sua skill não estava disponível; foi usado o Playwright conforme a skill de frontend.

- Acesso anônimo a `/acoes` redirecionou para `/login`; título e conteúdo corretos, sem sobreposição de erro do framework.
- Clique em `Entrar` com campos vazios ativou validação nativa e foco em e-mail.
- Login sem transbordamento horizontal em desktop e celular; screenshot conferido nos dois tamanhos.
- Ícone SVG servido com HTTP 200 após corrigir o 404 inicial; autocomplete configurado.
- API de síntese retornou 401 para chamada anônima.
- Transparência Viva apresentou erro de carregamento diante da falha real de DNS. Depois de simular HTTP 200 com `snapshot: null`, clicar em `Tentar novamente` removeu o erro e exibiu o estado vazio correto. A simulação foi removida após o teste.
- Console: erro 500 da API pública explicado pela falha de DNS; 401 esperado no teste negativo da síntese. Não foram observados erros de hidratação.
- Suíte automatizada ampliada para 54 testes, todos aprovados na execução após a instalação das dependências.
- Verificação final concluída: `npm run verify` passou com lint, checagem TypeScript, compilação de produção (54 páginas geradas) e 54 testes em 9 arquivos. Avisos de depreciação de `next lint` e futura configuração nativa do Vite são não bloqueantes.

Referências: [migração oficial para Next.js 15](https://nextjs.org/docs/app/guides/upgrading/version-15), [aviso de segurança do Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [aviso de segurança do PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849).
