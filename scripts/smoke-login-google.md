# Smoke Test - Login Google (Tijolo 038)

## Objetivo
Validar autenticação Google via Supabase OAuth com acesso condicionado a profiles.role e RLS preservado.

## Pré-condições
- Provider Google habilitado no Supabase.
- Callback OAuth configurado.
- Variáveis públicas do Supabase configuradas no app.
- Pelo menos um usuário sem role e usuários com role equipe/coordenacao/admin.

## Casos de teste

1. Usuário anônimo acessa rota interna
- Passos: abrir /, /acoes ou /escutas sem sessão.
- Esperado: redirecionamento para /login.

2. Clique em Entrar com Google
- Passos: em /login, clicar no botão Entrar com Google.
- Esperado: redirecionamento para fluxo Google/Supabase.

3. Callback retorna sessão
- Passos: concluir autenticação no provedor.
- Esperado: /auth/callback troca code por sessão e redireciona para / (ou next).

4. Usuário sem profile autorizado
- Passos: autenticar conta sem role autorizada.
- Esperado: redirecionamento para /aguardando-liberacao.
- Esperado: mensagem de que precisa de liberação da coordenação.

5. Usuário com profile equipe
- Passos: autenticar usuário role equipe.
- Esperado: acesso às áreas permitidas pelas policies (criação/edição conforme regra).

6. Usuário com profile coordenacao/admin
- Passos: autenticar usuário role coordenacao/admin.
- Esperado: acesso aos fluxos de ações, devolutivas e dossiês conforme regras RLS.

7. Logout encerra sessão
- Passos: acessar /auth/logout.
- Esperado: sessão encerrada e retorno para /login.

## Checklist de resultado
- [ ] Fluxo OAuth inicia corretamente.
- [ ] Callback fecha sessão sem erro oauth.
- [ ] Usuário sem perfil autorizado não acessa dashboard.
- [ ] Usuário com perfil autorizado acessa áreas internas.
- [ ] Usuário anônimo permanece bloqueado.
- [ ] Logout funciona.
