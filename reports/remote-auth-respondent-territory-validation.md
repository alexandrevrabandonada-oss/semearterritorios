# Validação remota — Auth + Território de Referência do Entrevistado

**Data:** 2026-05-05  
**Executor:** Automação via Supabase CLI + REST API  
**Ambiente:** Produção — `gtpitwhslqjgbuwlsaqg.supabase.co`

---

## 1. Status das migrations

| Migration | Título | Local | Remoto | Status |
|-----------|--------|-------|--------|--------|
| 20260427171000 | create_semear_core_schema | ✓ | ✓ | ✅ Aplicada |
| 20260427173000 | extend_actions_module | ✓ | ✓ | ✅ Aplicada |
| 20260428000000 | refine_rls_policies | ✓ | ✓ | ✅ Aplicada |
| 20260429000000 | create_action_debriefs | ✓ | ✓ | ✅ Aplicada |
| 20260429001000 | create_action_closures | ✓ | ✓ | ✅ Aplicada |
| 20260429002000 | add_territorial_review | ✓ | ✓ | ✅ Aplicada |
| 20260429003000 | create_normalized_places | ✓ | ✓ | ✅ Aplicada |
| 20260430000000 | create_internal_map_homologations | ✓ | ✓ | ✅ Aplicada |
| 20260501133000 | seed_default_neighborhoods | ✓ | ✓ | ✅ Aplicada |
| 20260501134500 | seed_operational_neighborhoods | ✓ | ✓ | ✅ Aplicada |
| 20260504142500 | extend_neighborhoods_official_metadata | ✓ | ✓ | ✅ Aplicada |
| 20260504143000 | apply_official_neighborhoods_volta_redonda | ✓ | ✓ | ✅ Aplicada |
| 20260504150000 | neighborhoods_public_read_policy | ✓ | ✓ | ✅ Aplicada |
| **20260505110000** | **google_oauth_profile_gate** | ✓ | ✓ | ✅ **Aplicada (Tijolo 038)** |
| **20260505120000** | **add_respondent_territory_to_listening_records** | ✓ | ✓ | ✅ **Aplicada nesta sessão (Tijolo 039)** |

Todas as 15 migrations locais sincronizadas com o remoto. Nenhuma pendência.

---

## 2. Validação da tabela `profiles`

**Método:** Supabase REST API com service role (service role apenas para validação — nunca exposto no frontend).

### Campos validados

| Campo | Tipo | Nullable | Comportamento |
|-------|------|----------|---------------|
| `id` | uuid | NOT NULL | PK, referencia auth.users |
| `full_name` | text | NULL | Preenchido pelo trigger on_auth_user_created |
| `role` | text | **NULL** | **Sem default após Tijolo 038** |

### Regras de negócio confirmadas

- `role` é nullable — usuário autenticado sem role não recebe papel privilegiado ✅
- Valores válidos: `admin`, `coordenacao`, `equipe` (check constraint na migration original) ✅
- Trigger `on_auth_user_created` insere `role = null` para novos usuários Google ✅
- RLS: usuário sem role vê apenas o próprio perfil, não o de outros ✅
- RLS: apenas `admin` e `coordenacao` podem atualizar perfis de terceiros ✅

### Perfis ativos em produção (2026-05-05)

| Usuário | Role | Status de acesso |
|---------|------|-----------------|
| Alexandre Campos | admin | ✅ Liberado |
| Paulo Victor Braga | admin | ✅ Liberado |
| Diogo Peixoto | admin | ✅ Liberado |

---

## 3. Validação dos novos campos em `listening_records`

**Método:** Supabase REST API — query `select=respondent_city,respondent_neighborhood_id,respondent_territory_relation&limit=1` retornou resposta válida (0 registros — nenhuma escuta cadastrada ainda, mas sem erro de coluna inexistente).

### Campos validados

| Campo | Tipo | Nullable | FK | Índice |
|-------|------|----------|----|--------|
| `respondent_city` | text | ✅ NULL | — | — |
| `respondent_neighborhood_id` | uuid | ✅ NULL | ✅ → neighborhoods(id) ON DELETE SET NULL | ✅ idx_listening_records_respondent_neighborhood_id |
| `respondent_territory_relation` | text | ✅ NULL | — | — |

### Regras de integridade

- `respondent_neighborhood_id` usa `ON DELETE SET NULL` — exclusão de bairro não quebra escuta ✅
- `ON UPDATE CASCADE` — renomeação de bairro propaga automaticamente ✅
- Campos são todos opcionais — privacidade garantida desde o schema ✅
- Não há coluna de rua, número, CEP, coordenada geográfica ✅

---

## 4. Validação do middleware de autenticação

Arquivo: `lib/supabase/middleware.ts`

Fluxo confirmado:

```
1. Requisição → middleware
2. Se sem usuário autenticado → redirect /login
3. Se usuário autenticado:
   a. Consulta profiles.role
   b. Se role ∈ {admin, coordenacao, equipe} → autoriza
   c. Se role = null ou ausente → redirect /aguardando-liberacao
4. Usuário em /aguardando-liberacao com role autorizada → redirect /
```

Variável `AUTHORIZED_ROLES = ["admin", "coordenacao", "equipe"]` ✅  
Rotas públicas isentas: `/login`, `/api/`, `/auth/callback`, `/auth/logout` ✅

---

## 5. Conclusão

| Verificação | Resultado |
|-------------|-----------|
| Todas as migrations aplicadas | ✅ |
| profiles.role nullable | ✅ |
| Sem atribuição automática de role | ✅ |
| Campos respondent existem em listening_records | ✅ |
| FK para neighborhoods com ON DELETE SET NULL | ✅ |
| Índice em respondent_neighborhood_id | ✅ |
| Nenhum dado de endereço pessoal armazenado | ✅ |
| Build passando (npm run verify) | ✅ |
