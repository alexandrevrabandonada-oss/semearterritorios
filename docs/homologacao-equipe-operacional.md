# Homologação da Equipe Operacional, Entrevistadores e Participantes da Ação

**Tijolo 043** — Ciclo de homologação funcional e de segurança do módulo Equipe (Tijolo 042).

---

## 1. Pré-condições

- [ ] Migration `20260506130000` aplicada remotamente (verificar via `supabase migration list`).
- [ ] Tabelas `team_members` e `action_team_members` existem no banco remoto.
- [ ] Coluna `listening_records.interviewer_team_member_id` existe.
- [ ] Nenhum registro de teste residual em `team_members` (limpar se houver).
- [ ] `npm run verify` passou (lint + build).

---

## 2. Cadastro manual assistido (TAREFA 4)

Não há seed automatizado. O cadastro é feito via interface (`/equipe`) por quem tem papel `admin` ou `coordenacao`.

**Passos:**
1. Acessar `/equipe` com usuário `admin`.
2. Clicar em "Novo membro".
3. Cadastrar os membros da lista inicial (ver `docs/cadastro-equipe-semear.md`).
4. Confirmar que cada membro aparece na lista com os flags corretos.
5. Confirmar que membros inativos não aparecem nos seletores de ação/escuta.

**Nenhum CPF, telefone ou endereço deve ser solicitado ou registrado.**

---

## 3. Validação por papel (TAREFA 3 — segurança de acesso)

### 3.1 Papel `admin`

| Ação | Resultado esperado |
|---|---|
| Acessar `/equipe` | Página carrega com lista e formulário |
| Criar membro | Salva e aparece na lista |
| Editar membro | Campos alterados são salvos |
| Inativar membro | Membro some dos seletores de ação e escuta |
| Ver `profiles.role` via `/equipe` | Não existe essa opção — confirmado |

### 3.2 Papel `coordenacao`

| Ação | Resultado esperado |
|---|---|
| Acessar `/equipe` | Página carrega (se RLS permitir) |
| Criar/editar membro | Salva corretamente |
| Tentar alterar `profiles.role` | Não é possível via interface nem via RLS |

### 3.3 Papel `equipe`

| Ação | Resultado esperado |
|---|---|
| Acessar `/equipe` | Página pode ser visível em modo leitura ou bloqueada conforme RLS |
| Criar/editar membro | Bloqueado (RLS nega INSERT/UPDATE para role `equipe`) |

### 3.4 Usuário anônimo (sem login)

| Ação | Resultado esperado |
|---|---|
| Acessar `/equipe` | Redirecionado para `/login` (middleware) |
| Qualquer operação em `team_members` via REST sem token | Bloqueado por RLS (`authenticated` policy) |

---

## 4. Validação de participantes em /acoes/nova (TAREFA 5)

- [ ] Apenas membros `active=true AND can_join_actions=true` aparecem no seletor.
- [ ] Selecionar um membro habilita campo de responsabilidade (opcional).
- [ ] Salvar a ação persiste os participantes em `action_team_members`.
- [ ] Editar a ação (`/acoes/[id]/editar`) recarrega os participantes selecionados.
- [ ] Detalhe da ação (`/acoes/[id]`) exibe lista de participantes com responsabilidade.
- [ ] Dossiê da ação exibe painel "Equipe e entrevistadores" com participantes.
- [ ] Campo legado `team` (texto) permanece visível como fallback.

---

## 5. Validação de entrevistador em /escutas/lote (TAREFA 6)

- [ ] Apenas membros `active=true AND can_interview=true` aparecem no seletor.
- [ ] Seletor fica travado no topo da sessão (não muda por registro).
- [ ] Ao selecionar entrevistador, `interviewer_team_member_id` é salvo.
- [ ] `interviewer_name` é preenchido automaticamente com `display_name`.
- [ ] Contador de escutas da sessão continua incrementando normalmente.
- [ ] Registros salvos aparecem com nome padronizado na lista de escutas.

---

## 6. Validação de escutas e filtros (TAREFA 7)

- [ ] Filtro de entrevistador (`/escutas`) lista apenas membros com `can_interview=true`.
- [ ] Card de escuta exibe `interviewer_team_member.display_name` se disponível.
- [ ] Fallback para `interviewer_name` (texto) para registros sem `interviewer_team_member_id`.
- [ ] Registros antigos (sem `interviewer_team_member_id`) ainda aparecem normalmente.

---

## 7. Validação de pós-banca e dossiê (TAREFA 8)

- [ ] Pós-banca (`/pos-banca/[id]`) exibe painel "Escutas por entrevistador (uso interno)".
- [ ] Painel mostra nome do entrevistador + contagem de escutas.
- [ ] Nenhum email é exibido nesse painel.
- [ ] Dossiê (`/acoes/[id]/dossie`) exibe participantes + entrevistadores.
- [ ] Aviso "uso interno" está visível no painel de entrevistadores.

---

## 8. Checklist de privacidade e governança (TAREFA 10)

- [ ] Nenhum `email` de `profiles` aparece em devolutivas, dossiês ou pos-banca visíveis ao público.
- [ ] `team_members` não tem campo de email, CPF, telefone ou endereço.
- [ ] Criar um `team_member` não altera `profiles.role` de nenhum usuário.
- [ ] Middleware bloqueia `/equipe` para usuários sem sessão.
- [ ] Campo `interviewer_name` legado permanece gravável (compatibilidade retroativa).

---

## 9. Checklist de microcopy (TAREFA 9)

- [ ] `/equipe` → Subtitle: "Cadastro operacional. Não concede acesso ao sistema."
- [ ] `/acoes/nova` → Fieldset legend: "Selecione quem participou da ação."
- [ ] `/escutas/lote` → Label: "Selecione o membro da equipe que conduziu a escuta."
- [ ] `/ajuda` → Painel reforça distinção `profiles` vs `team_members`.

---

## 10. Resultado esperado ao final

Todos os checklists acima marcados. `npm run verify` passando. Relatório `estado-da-nacao-semear-territorios-043.md` criado.
