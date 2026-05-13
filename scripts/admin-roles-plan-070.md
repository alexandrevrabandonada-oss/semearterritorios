# Plano Controlado de Regularização de Papéis — Tijolo 070

## Premissas

- Não executar alteração massiva sem decisão explícita da coordenação responsável.
- Aplicar princípio de menor privilégio.
- Preservar rastreabilidade da decisão de cada alteração.

## Estado observado no diagnóstico

- `admin`: 6
- `coordenacao`: 0
- `equipe`: 0
- `role = null`: 1

## Meta mínima recomendada

- `admin`: 2
- `coordenacao`: 2
- `equipe`: 3
- `role = null`: 0

## Etapa 1 — Definir pessoas por papel

1. Selecionar explicitamente quem permanece `admin` (somente gestão técnica/institucional).
2. Selecionar ao menos 1 pessoa para `coordenacao` (ideal 2).
3. Selecionar ao menos 1 pessoa para `equipe` (ideal 3).
4. Definir destino do perfil com `role = null`.

## Etapa 2 — Registrar decisão antes da execução

Criar registro interno contendo:

- data e hora;
- responsável pela decisão;
- justificativa por usuário;
- papel atual -> papel novo;
- confirmação de menor privilégio.

## Etapa 3 — Executar ajuste de role (controlado)

Opção A: UI administrativa interna (se disponível)

1. Abrir painel de gestão de usuários.
2. Atualizar um usuário por vez.
3. Validar imediatamente o resultado com novo login.

Opção B: SQL controlado no Supabase SQL Editor (somente por responsável autorizado)

```sql
-- Exemplo seguro: ajustar um usuário por vez
update public.profiles
set role = 'coordenacao'
where id = '<PROFILE_ID_ALVO>'
  and role is distinct from 'coordenacao';
```

```sql
update public.profiles
set role = 'equipe'
where id = '<PROFILE_ID_ALVO>'
  and role is distinct from 'equipe';
```

```sql
update public.profiles
set role = 'admin'
where id = '<PROFILE_ID_ALVO>'
  and role is distinct from 'admin';
```

## Etapa 4 — Pós-ajuste obrigatório

1. Recontar distribuição de papéis.
2. Confirmar ausência de `role = null` não justificado.
3. Executar checklist presencial por papel (`docs/aceite-presencial-papeis-070.md`).
4. Anexar evidências no relatório final do tijolo.

## Guardrails

- Não promover em lote sem validação individual.
- Não remover todos os admins de uma vez.
- Não manter pessoa de campo com privilégio de admin sem necessidade.
- Não liberar usuário sem role para operação sem decisão formal.
