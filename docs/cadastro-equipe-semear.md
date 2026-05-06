# Cadastro da Equipe Semear

## Propósito

O módulo **Equipe** (`/equipe`) mantém o cadastro operacional das pessoas que participam das ações do Semear Territórios.

Esse cadastro **não concede acesso ao sistema**. Acesso é controlado por `profiles` e RLS do Supabase.

---

## Duas entidades separadas

| Entidade | Onde vive | Quem pode ter | Propósito |
|---|---|---|---|
| `profiles` | Supabase Auth + tabela `profiles` | Quem faz login | Controle de acesso (admin, coordenacao, equipe) |
| `team_members` | Tabela `team_members` | Qualquer membro operacional | Registro de quem participou de ações e escutas |

Uma pessoa pode existir nos dois lugares (ex.: coordenadora que também entra no sistema). Mas pode ter `team_member` sem nunca fazer login — e vice-versa.

---

## Campos do cadastro

| Campo | Descrição |
|---|---|
| `display_name` | Nome de exibição (obrigatório). Exemplo: "Penha", "Paulo Victor" |
| `role_label` | Função na equipe. Exemplo: "Entrevistadora", "Coordenação", "Apoio logístico" |
| `active` | Se a pessoa está ativa. Inativos não aparecem nos seletores. |
| `can_interview` | Se pode conduzir escutas. Aparece no seletor de entrevistadores. |
| `can_join_actions` | Se pode participar de ações. Aparece no formulário de cadastro de ação. |
| `profile_id` | Vínculo opcional com `profiles` (se a pessoa também tem acesso ao sistema). |
| `notes` | Observações internas (não exibidas ao respondente). |

---

## Lista inicial sugerida

Membros a cadastrar na primeira operação real:

| Nome | role_label | can_interview | can_join_actions |
|---|---|---|---|
| Paulo Victor | Coordenação | Não | Sim |
| Penha | Entrevistadora | Sim | Sim |
| Júlia | Entrevistadora | Sim | Sim |
| Amanda | Entrevistadora | Sim | Sim |
| Giliane | Apoio | Não | Sim |
| Paula | Apoio | Não | Sim |
| Ana Paula | Apoio | Não | Sim |

Ajuste conforme a realidade da equipe. Nenhum campo de CPF, telefone ou endereço é coletado.

---

## Como usar o módulo /equipe

1. Acesse `/equipe` (requer papel `admin` ou `coordenacao`).
2. Clique em **Novo membro** para abrir o formulário.
3. Informe nome, função e marque os flags `can_interview` e `can_join_actions` conforme o papel da pessoa.
4. Se a pessoa também tem login no sistema, vincule o `profile_id` (opcional).
5. Para inativar um membro, edite e desmarque **Ativo**.

Membros inativos não aparecem nos seletores de ação nem de escutas.

---

## Fluxo de uso nas ações

- **Formulário de ação** (`/acoes/nova`, `/acoes/[id]/editar`): seleciona participantes com `active=true AND can_join_actions=true`. Cada participante pode ter uma responsabilidade registrada.
- **Formulário de escuta em lote** (`/escutas/lote`): seleciona o entrevistador fixo da sessão (`active=true AND can_interview=true`). O nome é preenchido automaticamente em `interviewer_name`.
- **Formulário de escuta individual**: mesmo seletor de entrevistador, com fallback para texto livre.

---

## Privacidade e governança

- Nenhum dado de identificação pessoal (CPF, telefone, endereço) é armazenado.
- O campo `interviewer_name` (legado) é preservado para registros anteriores à padronização.
- O `email` de `profiles` nunca aparece em devolutivas públicas.
- `team_members` não altera `profiles.role`. Acesso continua sendo concedido manualmente via liberação de usuário Google (ver `docs/liberacao-usuarios-google.md`).
