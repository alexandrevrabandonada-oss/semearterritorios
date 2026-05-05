# Homologação do Login com Google

**Versão:** Tijolo 038 + 040  
**Ambiente:** Produção — `gtpitwhslqjgbuwlsaqg.supabase.co`  
**Data de referência:** 2026-05-05

---

## Visão geral do fluxo

```
Usuário → /login → Entrar com Google → Google OAuth → /auth/callback → middleware → / (ou /aguardando-liberacao)
```

A autenticação (quem é você) é feita pelo Google.  
A autorização (o que você pode fazer) é feita pelo campo `profiles.role` no banco.

Essas duas etapas são independentes: autenticar com Google não garante acesso ao sistema.

---

## Pré-requisitos técnicos

- Google OAuth configurado no painel do Supabase: Authentication → Sign In / Providers → Google
- URL de retorno autorizada no Google Cloud Console: `https://gtpitwhslqjgbuwlsaqg.supabase.co/auth/v1/callback`
- Variáveis de ambiente no projeto Next.js:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Client Secret do Google **nunca** aparece no frontend, apenas no painel do Supabase

---

## Cenários de teste

### Cenário 1 — Usuário anônimo tenta acessar rota interna

**Ação:** Abrir `https://semear-territorios.vercel.app/acoes` (ou qualquer rota interna) sem estar autenticado.

**Resultado esperado:** Redirecionamento para `/login`.

**Por que funciona:** O middleware verifica `supabase.auth.getUser()` e, sem sessão ativa, redireciona para `/login`.

**Status:** ✅ Confirmado pelo código em `lib/supabase/middleware.ts` linhas 43-47.

---

### Cenário 2 — Usuário clica "Entrar com Google"

**Ação:** Na tela `/login`, clicar em "Entrar com Google".

**Resultado esperado:**
1. Redireciona para o fluxo OAuth do Google.
2. Após autorização do usuário, retorna para `/auth/callback?next=/`.
3. Callback troca o code por sessão Supabase.
4. Middleware verifica o perfil e redireciona conforme `profiles.role`.

**Implementação relevante:**
- `app/login/page.tsx` → `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "${origin}/auth/callback?next=/" } })`
- `app/auth/callback/route.ts` → troca code por sessão, redireciona para `next`

**Nota de segurança:** O `redirectTo` aponta para rota pública `/auth/callback`. O Client Secret do Google nunca sai do painel do Supabase.

**Status:** ✅ Confirmado pelo código. Testado com contas Google reais dos membros da equipe.

---

### Cenário 3 — Usuário autenticado sem `profiles.role` autorizado

**Ação:** Usuário faz login com conta Google pela primeira vez (sem role atribuída).

**Resultado esperado:**
1. Trigger `on_auth_user_created` insere perfil com `role = null`.
2. Middleware detecta `profile.role` nulo.
3. Usuário é redirecionado para `/aguardando-liberacao`.
4. Tentativa de acessar `/acoes`, `/escutas`, `/relatorios` resulta em redirecionamento para `/aguardando-liberacao`.

**Status:** ✅ Confirmado. A migration `20260505110000` remove o default de `role` e garante inserção com `null`.

---

### Cenário 4 — Admin atribui `role` em profiles

**Ação:** Admin acessa o Supabase Table Editor ou usa a API com service role e atualiza `profiles.role` para `admin`, `coordenacao` ou `equipe`.

**Resultado esperado:**
- Na próxima requisição do usuário, o middleware lê o novo role.
- Usuário passa a acessar as rotas conforme o papel atribuído.
- Se estava em `/aguardando-liberacao`, é redirecionado para `/`.

**Status:** ✅ Confirmado. Paulo Victor Braga e Diogo Peixoto foram promovidos a `admin` em 2026-05-05.

---

### Cenário 5 — Logout

**Ação:** Usuário clica "Sair" (qualquer rota que leve para `/auth/logout`).

**Resultado esperado:**
- Sessão encerrada via `supabase.auth.signOut()`.
- Redirecionamento para `/login`.

**Status:** ✅ Confirmado pelo código em `app/auth/logout/route.ts`.

---

## O que NÃO acontece (garantias)

| Garantia | Status |
|----------|--------|
| Role não é atribuída automaticamente por domínio de e-mail | ✅ |
| Role não é atribuída automaticamente no signup | ✅ (trigger insere null) |
| service_role não é usado no frontend | ✅ |
| Client Secret do Google não aparece em logs ou código | ✅ |
| Usuário sem role não acessa nenhuma rota interna | ✅ |

---

## Tela /aguardando-liberacao

Exibida quando: usuário autenticado + `profiles.role` nulo ou ausente.

Conteúdo da tela:
- Mensagem explicando que o acesso precisa ser liberado pela coordenação.
- Orientação: a coordenação define o papel em `profiles`.
- Botão "Sair" (leva para `/auth/logout`).

Arquivo: `app/aguardando-liberacao/page.tsx`
