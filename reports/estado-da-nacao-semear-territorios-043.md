# Estado da Nação — Semear Territórios 043

**Tijolo 043**: Homologação da Equipe Operacional, Entrevistadores e Participantes da Ação

**Data**: 2026-05-07

---

## Resumo executivo

Tijolo 043 concluído. Ciclo de homologação documental, revisão de microcopy e governança de privacidade para o módulo Equipe (introduzido no Tijolo 042). Build e lint passando limpo. Dados de teste removidos do banco remoto.

---

## Tarefas executadas

### TAREFA 1 — Diagnóstico remoto

- Schema remoto verificado: `team_members`, `action_team_members`, `listening_records.interviewer_team_member_id` presentes.
- `action_team_members`: 0 registros (correto — nenhum dado real de participantes ainda).
- `listening_records` com `interviewer_team_member_id`: 0 registros (correto — nenhuma escuta padronizada ainda).
- **Dado residual encontrado e removido**: `team_members` continha registro de teste "Teste Migracao 042". Deletado via REST.

### TAREFA 2 — `docs/cadastro-equipe-semear.md` ✅

Documento criado em `docs/cadastro-equipe-semear.md`. Cobre:
- Distinção entre `profiles` (acesso) e `team_members` (cadastro operacional).
- Descrição de todos os campos.
- Lista inicial sugerida: Paulo Victor, Penha, Júlia, Amanda, Giliane, Paula, Ana Paula.
- Fluxo de uso em ações e escutas.
- Regras de privacidade: sem CPF, telefone, endereço.

### TAREFA 3 — `docs/homologacao-equipe-operacional.md` ✅

Documento criado em `docs/homologacao-equipe-operacional.md`. Cobre:
- Checklists por papel (admin, coordenação, equipe, anônimo).
- Validação de participantes em `/acoes/nova`.
- Validação de entrevistador em `/escutas/lote`.
- Validação de filtros em `/escutas`.
- Validação de pós-banca e dossiê.
- Checklist de privacidade e governança.
- Checklist de microcopy.

### TAREFA 4 — Cadastro manual assistido

Documentado em `docs/cadastro-equipe-semear.md`. Não há seed automatizado. Cadastro feito via `/equipe` por admin/coordenação. Nenhum CPF/telefone/endereço é coletado.

### TAREFA 5 — Validação participantes em /acoes (código revisado)

- Formulário filtra `active=true AND can_join_actions=true` ✅
- Fieldset legend atualizado para "Selecione quem participou da ação" ✅
- Detalhe e dossiê da ação carregam e exibem `action_team_members` ✅

### TAREFA 6 — Validação entrevistador em /escutas/lote (código revisado)

- Seletor filtra `active=true AND can_interview=true` ✅
- Label atualizada para "Selecione o membro da equipe que conduziu a escuta (fixo na sessão)" ✅
- `interviewer_team_member_id` salvo; `interviewer_name` preenchido via `display_name` ✅

### TAREFA 7 — Validação escutas e filtros (código revisado)

- Filtro de entrevistador lista apenas membros com `can_interview=true` ✅
- Fallback para `interviewer_name` legado preservado ✅

### TAREFA 8 — Validação pós-banca e dossiê (código revisado)

- Pós-banca exibe "Escutas por entrevistador (uso interno)" com aviso interno ✅
- Nenhum email exposto nos painéis de pós-banca ou dossiê ✅
- Dossiê exibe participantes da ação ✅

### TAREFA 9 — Microcopy ajustado ✅

| Local | Antes | Depois |
|---|---|---|
| `/equipe` subtitle | "Este cadastro organiza a equipe operacional..." | "Cadastro operacional. Não concede acesso ao sistema..." |
| `/acoes/nova` fieldset | "Participantes da ação" | "Selecione quem participou da ação" |
| `/escutas/lote` label | "Entrevistador (fixo na sessão)" | "Selecione o membro da equipe que conduziu a escuta (fixo na sessão)" |
| `/ajuda` painel | 4 parágrafos genéricos | 5 parágrafos reforçando profiles ≠ team_members + fallback legado |

### TAREFA 10 — Privacidade e governança ✅

- Nenhum `email` de `profiles` exposto em componentes de devolutiva ou pós-banca.
- `team_members.email` (campo opcional) exibido apenas em `/equipe` (acesso restrito a admin/coordenação).
- Criar `team_member` não altera `profiles.role` de nenhum usuário.
- Campo `interviewer_name` legado preservado como fallback.
- Middleware bloqueia `/equipe` para sessões inválidas.

### TAREFA 11 — npm run verify ✅

```
✔ No ESLint warnings or errors
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (29/29)
33 rotas no total incluindo /equipe
```

### TAREFA 12 — Este relatório ✅

---

## Arquivos modificados neste tijolo

| Arquivo | Tipo | Mudança |
|---|---|---|
| `docs/cadastro-equipe-semear.md` | NOVO | Documentação do módulo Equipe |
| `docs/homologacao-equipe-operacional.md` | NOVO | Roteiro de homologação completo |
| `components/team/team-members-page.tsx` | EDITADO | Microcopy: subtitle reescrito |
| `components/actions/action-form.tsx` | EDITADO | Microcopy: fieldset legend atualizado |
| `components/listening-records/listening-record-batch-form.tsx` | EDITADO | Microcopy: label do entrevistador atualizado |
| `app/ajuda/page.tsx` | EDITADO | Painel Equipe expandido (profiles ≠ team_members) |
| `reports/estado-da-nacao-semear-territorios-043.md` | NOVO | Este relatório |

---

## Pendências para próximas operações

| Item | Prioridade | Observação |
|---|---|---|
| Cadastrar membros reais via `/equipe` | Alta | Lista sugerida em `docs/cadastro-equipe-semear.md` |
| Primeira ação real com equipe padronizada | Alta | Participantes via `action_team_members` |
| Primeiras escutas com entrevistador padronizado | Alta | `interviewer_team_member_id` no lote |
| Commit e push do conjunto Tijolo 042 + 043 | Alta | 11 arquivos modificados + 4 novos + docs |
| Validação presencial das telas (homologação real) | Média | Seguir `docs/homologacao-equipe-operacional.md` |

---

## Estado de riscos

| Risco | Status |
|---|---|
| Dado de teste residual em `team_members` | ✅ Removido |
| Email de `profiles` exposto em devolutiva | ✅ Confirmado ausente |
| `team_members` concedendo acesso indevido | ✅ Confirmado: sem efeito sobre `profiles.role` |
| Build quebrando após microcopy | ✅ Build limpo |
| Campo `interviewer_name` legado perdido | ✅ Preservado como fallback em todos os componentes |
