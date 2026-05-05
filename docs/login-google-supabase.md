# Login com Google via Supabase (Tijolo 038)

Este documento descreve a configuração externa do login com Google no SEMEAR Territórios, mantendo RLS e aprovação por perfil.

Regra central: o Google autentica a identidade, mas o acesso ao app depende de perfil autorizado na tabela profiles.

## Valores deste projeto

- Supabase Project URL: https://gtpitwhslqjgbuwlsaqg.supabase.co
- Supabase OAuth callback (usar no Google): https://gtpitwhslqjgbuwlsaqg.supabase.co/auth/v1/callback
- Callback da aplicacao (ja implementado): /auth/callback

Ambientes recomendados para configurar:
- Local: http://localhost:3000
- Producao: dominio da Vercel do SEMEAR Territorios

## 1) Google Cloud / Auth Platform

1. Criar (ou usar) um projeto no Google Cloud.
2. Abrir API e serviços > Credenciais.
3. Criar credencial do tipo OAuth Client ID com tipo Web application.
4. Configurar Authorized JavaScript origins com os domínios do app.
5. Configurar Authorized redirect URI com o callback do Supabase Auth.
6. Salvar o Client ID e o Client Secret no ambiente seguro da operação.

Sugestao pratica para este projeto:
- Authorized JavaScript origins:
   - http://localhost:3000
   - https://SEU_DOMINIO_DE_PRODUCAO
- Authorized redirect URI:
   - https://gtpitwhslqjgbuwlsaqg.supabase.co/auth/v1/callback

Observações:
- Não versionar Client Secret no repositório.
- Não expor Client Secret no frontend.

## 2) Supabase Dashboard

1. Abrir Authentication > Providers > Google.
2. Habilitar o provider Google.
3. Informar Client ID.
4. Informar Client Secret.
5. Configurar Site URL do ambiente (local, homologação e produção, quando aplicável).
6. Configurar Redirect URLs para os ambientes autorizados.

Sugestao pratica para este projeto:
- Site URL:
   - Em desenvolvimento local: http://localhost:3000
   - Em producao: https://SEU_DOMINIO_DE_PRODUCAO
- Redirect URLs:
   - http://localhost:3000/auth/callback
   - https://SEU_DOMINIO_DE_PRODUCAO/auth/callback

Observações:
- Os secrets do provider ficam no Supabase Dashboard.
- O frontend usa apenas NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.

## 3) Vercel

1. Confirmar variáveis públicas normais do Supabase:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
2. Não definir Client Secret do Google em variáveis NEXT_PUBLIC_.
3. Não colocar service_role no frontend.

## 4) Callback OAuth no app

Rota implementada: app/auth/callback/route.ts

Fluxo:
1. Supabase redireciona para /auth/callback com code.
2. O app troca code por sessão via exchangeCodeForSession.
3. O parâmetro next é aceito apenas se for caminho relativo seguro.
4. Em sucesso, redireciona para / ou next.
5. Em erro, redireciona para /login?error=oauth.

Observacao:
- O login no frontend inicia com redirectTo apontando para {origin}/auth/callback?next=/.
- Portanto, os domínios usados em origin precisam estar permitidos no Supabase (Site URL e Redirect URLs).

## 5) Perfil obrigatório para acesso

Comportamento implementado:
- Usuário autenticado com role autorizada (admin, coordenacao, equipe) acessa rotas internas.
- Usuário autenticado sem role autorizada é redirecionado para /aguardando-liberacao.
- Usuário anônimo continua bloqueado nas rotas internas.

Mensagem operacional para quem está sem perfil:
"Seu acesso foi autenticado, mas ainda precisa ser liberado pela coordenação."

## 6) Liberação manual em profiles

Não há atribuição automática de admin/coordenacao/equipe por domínio de e-mail.

A coordenação/admin deve liberar o acesso definindo role na tabela profiles.

Se necessário, executar ajuste manual no banco (exemplo):

```sql
update public.profiles
set role = 'equipe'
where id = '<user_uuid>';
```

## 7) Opcional futuro: restrição de domínio UFF

Este tijolo não bloqueia por domínio.

Evolução futura possível (novo tijolo, com decisão institucional):
- permitir somente e-mails @id.uff.br ou lista de domínios autorizados;
- definir regra de governança para exceções e contas institucionais.

## 8) Checklist rapido de validacao da configuracao

1. Google Provider habilitado no Supabase com Client ID e Client Secret preenchidos.
2. Redirect URI do Google aponta para https://gtpitwhslqjgbuwlsaqg.supabase.co/auth/v1/callback.
3. Site URL e Redirect URLs no Supabase incluem localhost e producao.
4. Em /login, botao Entrar com Google redireciona para Google.
5. Retorno cai em /auth/callback e cria sessao.
6. Usuario sem role autorizada vai para /aguardando-liberacao.
