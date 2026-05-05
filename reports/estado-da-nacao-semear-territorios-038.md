# Estado da Nação - SEMEAR Territórios 038

Data: 2026-05-05
Tijolo: 038 - Login com Google via Supabase OAuth com perfil obrigatório

## 1. Diagnóstico inicial

Estado encontrado antes das mudanças:
- Login por e-mail/senha já existia em app/login/page.tsx e app/login/actions.ts.
- Middleware existia em middleware.ts e lib/supabase/middleware.ts, protegendo por sessão, sem bloquear usuário autenticado sem perfil autorizado.
- Supabase SSR já estava em uso via lib/supabase/client.ts, lib/supabase/server.ts e middleware.
- Tabela profiles e função public.get_user_role() já existiam.
- Policies de select em múltiplas tabelas aceitavam authenticated sem exigir role, o que permitia leitura a autenticado sem perfil efetivo.
- Não existia rota /auth/callback.
- Não existia rota dedicada de aguardando liberação.
- Não havia seção específica de Login com Google em /ajuda.
- Variáveis públicas existentes: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.

## 2. Arquivos alterados

Código:
- middleware.ts (validado por dependência, sem mudança funcional direta)
- lib/supabase/middleware.ts
- lib/database.types.ts
- app/login/page.tsx
- app/ajuda/page.tsx
- app/auth/callback/route.ts (novo)
- app/auth/logout/route.ts (novo)
- app/aguardando-liberacao/page.tsx (novo)

Banco:
- supabase/migrations/20260505110000_google_oauth_profile_gate.sql (novo)

Documentação:
- docs/login-google-supabase.md (novo)
- scripts/smoke-login-google.md (novo)

## 3. Botão Google criado

Implementado em app/login/page.tsx:
- botão Entrar com Google;
- chamada supabase.auth.signInWithOAuth com provider google;
- redirectTo para /auth/callback?next=/;
- login por e-mail/senha mantido no mesmo formulário.

## 4. Callback OAuth criado/validado

Implementado em app/auth/callback/route.ts:
- leitura de code;
- troca por sessão via exchangeCodeForSession;
- validação de next apenas como caminho relativo seguro;
- redirecionamento para / ou next;
- fallback de erro para /login?error=oauth.

## 5. Perfil obrigatório e aprovação por coordenação

Implementado em lib/supabase/middleware.ts:
- autenticação sem perfil autorizado não libera rotas internas;
- redirecionamento para /aguardando-liberacao;
- usuário com profile.role em admin, coordenacao, equipe acessa normalmente.

Tela de pendência criada em app/aguardando-liberacao/page.tsx:
- informa que autenticação ocorreu;
- acesso depende de liberação via profiles;
- sem solicitação de senha.

## 6. Não auto-criar papel privilegiado

Migration 20260505110000_google_oauth_profile_gate.sql:
- role em profiles deixou de ser not null e sem default automático;
- função handle_new_user atualizada para criar profile com role null;
- não há atribuição automática de admin/coordenacao/equipe;
- não há vínculo de papel com domínio de e-mail.

## 7. Configuração Google/Supabase

Documentada em docs/login-google-supabase.md:
- passos no Google Cloud;
- passos no Supabase Dashboard;
- cuidados na Vercel;
- sem inserir secrets;
- sem usar NEXT_PUBLIC_ para segredo.

## 8. Liberação de usuário em profiles

Fluxo operacional:
1. Usuário autentica com Google.
2. Se não tiver role autorizada, vai para /aguardando-liberacao.
3. Coordenação/admin ajusta role em public.profiles.
4. Usuário passa a acessar rotas internas conforme RLS.

## 9. Smoke test criado

Arquivo: scripts/smoke-login-google.md

Cobertura:
- anônimo bloqueado;
- início do OAuth;
- callback com sessão;
- sem profile autorizado vai para aguardando;
- equipe/coordenacao/admin acessam conforme regras;
- logout encerra sessão.

## 10. Riscos restantes

- Necessidade de aplicar migration nova no banco remoto para alinhar RLS e role null.
- Se houver automações externas que assumem role not null, precisam ser revisadas.
- Restrição por domínio institucional ainda não implementada (decisão futura).

## 11. Próximo tijolo recomendado

Tijolo 039 - Governança de acesso institucional:
- fluxo administrativo para aprovação/revogação de perfis;
- trilha de auditoria de concessão de role;
- decisão institucional para permitir apenas domínios autorizados (ex.: @id.uff.br), sem afetar exceções operacionais.
