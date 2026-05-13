# Deploy da Auditoria das Falas em Produção

## Objetivo

Aplicar migrations da auditoria de falas no banco remoto de forma versionada, validar schema e executar smoke test seguro.

## Migrations envolvidas

Base:

- `20260511150000_create_listening_record_public_quotes.sql`
- `20260511170000_public_quote_audits_and_required_reasons.sql`

Correções de produção (Tijolo 068):

- `20260511200000_fix_public_quote_risk_regex.sql`
- `20260511203000_make_quote_audit_fk_deferrable.sql`

## Como aplicar

1. Listar status:

   `npx supabase migration list --db-url "postgresql://postgres:<PASSWORD_ENCODED>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"`

2. Aplicar pendências:

   `npx supabase db push --db-url "postgresql://postgres:<PASSWORD_ENCODED>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require" --include-all --yes`

3. Confirmar sincronização local/remota:

   `npx supabase migration list --db-url "postgresql://postgres:<PASSWORD_ENCODED>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"`

## Como validar rápido

Executar script:

`node scripts/validate_public_quotes_audit_remote.mjs`

Variáveis necessárias:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Validações cobertas pelo script:

- colunas novas em `listening_record_public_quotes`
- tabela `listening_record_public_quote_audits`
- trigger por efeito (evento `sent_to_review`)
- aceitação dos 11 `event_type`
- bloqueio de `event_type` inválido
- invisibilidade de auditoria para `anon` (registro conhecido)

## Fluxo de teste operacional (manual)

Com usuário `coordenacao` ou `admin`:

1. abrir uma escuta revisada
2. criar fala candidata
3. enviar para revisão
4. aprovar internamente
5. aprovar publicamente com justificativa
6. abrir `/escutas/falas/[id]`
7. conferir evento `approved_public` com justificativa

## Papéis testados

Testados automaticamente nesta sessão:

- `service_role` (apenas script técnico, nunca frontend)
- `anon` (bloqueio de leitura de auditoria por registro conhecido)

Pendente operacional com login real:

- `equipe`
- `coordenacao`
- `admin`

## Bloqueios testados

Testado automaticamente:

- `event_type` inválido bloqueado por constraint.

Bloqueios que exigem sessão real autenticada de app:

- `approved_public` sem `public_approval_reason`
- `approved_public` com risco crítico
- `approved_public` por usuário `equipe`

## Erros comuns e correção

1. Erro `invalid regular expression: quantifier operand invalid`

- Causa: regex incompatível com PostgreSQL na função `public_quote_has_critical_risk`.
- Correção: aplicar `20260511200000_fix_public_quote_risk_regex.sql`.

2. Erro de FK em auditoria no insert da fala

- Causa: trigger `BEFORE INSERT` gravando auditoria com FK imediata.
- Correção: aplicar `20260511203000_make_quote_audit_fk_deferrable.sql`.

## Como não publicar fala bruta

- Nunca usar `quote_text` na devolutiva pública.
- Exibir apenas `sanitized_text` de falas em status `approved_public`.
- Manter histórico editorial apenas em rotas internas (`/escutas/falas` e `/escutas/falas/[id]`).
- Manter RLS ativa sem flexibilizar políticas.
