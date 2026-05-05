# Liberação manual de usuários Google

**Versão:** Tijolo 038 + 040  
**Ambiente:** Produção — `gtpitwhslqjgbuwlsaqg.supabase.co`

---

## Visão geral

O login com Google autentica o usuário (confirma identidade), mas **não libera acesso automaticamente**.

Todo novo usuário que faz login com Google recebe um perfil com `role = null`. Sem role definida, o sistema exibe a tela de aguardando liberação.

Um **admin** ou **coordenacao** precisa definir o papel manualmente na tabela `profiles`.

---

## Como localizar um usuário aguardando liberação

### Opção 1 — Painel do Supabase (Table Editor)

1. Acesse [https://supabase.com/dashboard/project/gtpitwhslqjgbuwlsaqg/editor](https://supabase.com/dashboard/project/gtpitwhslqjgbuwlsaqg/editor)
2. Selecione a tabela `profiles`
3. Filtre por `role = null` ou procure pelo nome/e-mail

### Opção 2 — Authentication > Users

1. Acesse Authentication → Users
2. Localize o usuário pelo e-mail (coluna Email)
3. Copie o UID
4. Volte ao Table Editor → `profiles` e localize pelo UID

---

## Como conferir o e-mail do usuário

A tabela `profiles` contém `full_name`, mas não armazena e-mail (privacidade).  
O e-mail fica em `auth.users` — visível apenas no painel Authentication → Users.

Para cruzar: o `id` em `profiles` é o mesmo `UID` em Authentication → Users.

---

## Como definir o papel (role)

### Via Table Editor

1. Abra a tabela `profiles`
2. Localize a linha do usuário
3. Clique no campo `role`
4. Digite o papel desejado e salve

### Via REST API (service role — apenas para admins técnicos)

```bash
curl -X PATCH "https://gtpitwhslqjgbuwlsaqg.supabase.co/rest/v1/profiles?id=eq.<UUID>" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"role":"equipe"}'
```

> **Atenção:** nunca usar service_role no frontend da aplicação. Apenas em scripts administrativos controlados.

---

## Papéis disponíveis

| Role | Pode fazer |
|------|-----------|
| `admin` | Tudo: ler, criar, editar qualquer registro; atualizar perfis; aprovar devolutivas; fechar/reabrir dossiês |
| `coordenacao` | Ler tudo; criar ações e escutas; revisar e aprovar devolutivas; marcar suficiência; atualizar perfis |
| `equipe` | Ler tudo; criar ações e escutas próprias; editar apenas o que criou |
| `null` (sem role) | Apenas ver a própria linha em `profiles` e a tela `/aguardando-liberacao` |

---

## Quando conceder cada papel

| Situação | Role recomendada |
|----------|-----------------|
| Membro da equipe de campo que digita fichas | `equipe` |
| Coordenador que revisa devolutivas e toma decisões | `coordenacao` |
| Responsável técnico/administrador do sistema | `admin` |
| Pessoa aguardando triagem | manter `null` |
| Acesso negado temporariamente | revogar para `null` |

---

## Como revogar acesso

Para suspender o acesso de um usuário sem excluir o perfil:

1. No Table Editor, localize a linha em `profiles`
2. Altere `role` para `null` (apague o valor)
3. O usuário será redirecionado para `/aguardando-liberacao` na próxima requisição

O usuário continua autenticado no Google, mas perde acesso ao sistema interno imediatamente.

Para bloquear também o login Google, é necessário desabilitar o usuário no painel Authentication → Users → desabilitar conta.

---

## Casos de uso reais (2026-05-05)

| Usuário | Ação | Role definida |
|---------|------|---------------|
| Paulo Victor Braga | Login com Google + role atribuída manualmente | `admin` |
| Diogo Peixoto | Login com Google + role atribuída manualmente | `admin` |
| Alexandre Campos | Conta original | `admin` |

---

## Próximo passo recomendado

Quando a equipe crescer, considerar criar uma tela administrativa simples em `/admin/usuarios` para listar perfis sem role e permitir atribuição com um clique — sem expor service_role no frontend, usando policies RLS de admin. Esse é o **Tijolo 041 sugerido**.
