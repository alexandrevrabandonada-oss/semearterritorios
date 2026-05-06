# Estado da Nacao - Tijolo 042

## Objetivo
Implementar perfis operacionais da equipe, entrevistadores padronizados e participantes de acao, sem misturar com permissao de acesso do sistema.

## Entregas realizadas

- Migracao SQL criada em `supabase/migrations/20260506130000_create_team_members_and_action_participants.sql` com:
  - tabela `team_members`
  - tabela `action_team_members`
  - coluna `listening_records.interviewer_team_member_id`
  - indices, triggers `updated_at`, constraints e RLS
- Tipos atualizados em `lib/database.types.ts`:
  - `TeamMember`
  - `ActionTeamMember`
  - `ListeningRecord.interviewer_team_member_id`
  - entradas e relacionamentos em `Database.public.Tables`
- Novo modulo de equipe:
  - rota `app/equipe/page.tsx`
  - tela `components/team/team-members-page.tsx`
  - filtros ativos/inativos/todos
  - cadastro/edicao com flags `can_interview` e `can_join_actions`
  - vinculacao opcional com `profiles`
  - bloqueio de escrita no UI para perfis sem role `admin/coordenacao`
- Integracao em acoes:
  - `components/actions/action-form.tsx` permite selecionar participantes da acao e responsabilidade por pessoa
  - persistencia em `action_team_members` durante create/edit
  - `components/actions/action-detail.tsx` exibe participantes e fallback de equipe legado
  - `components/actions/action-dossier-page.tsx` inclui participantes e escutas por entrevistador
- Integracao em escutas:
  - `components/listening-records/listening-record-form.tsx` inclui entrevistador de `team_members` (padronizado) com fallback para campo legado
  - `components/listening-records/listening-record-batch-form.tsx` inclui trava de entrevistador no topo da sessao e persiste `interviewer_team_member_id`
  - `components/listening-records/listening-records-list.tsx` mostra nome padronizado, adiciona filtro por entrevistador
  - `components/listening-records/listening-record-detail.tsx` mostra entrevistador padronizado com fallback
- Pos-banca:
  - `components/post-action/post-action-consolidation-page.tsx` inclui painel interno de escutas por entrevistador
- Navegacao e ajuda:
  - item `Equipe` adicionado em `lib/semear-data.ts`
  - secao de orientacao adicionada em `app/ajuda/page.tsx`

## Privacidade e governanca

- Cadastro operacional separado de acesso: `team_members` nao concede login/permissao.
- Devolutiva publica deve permanecer agregada (sem nomes/e-mails da equipe).
- Painel por entrevistador marcado como uso interno no pos-banca.

## Validacao remota concluida

- Migracao `20260506130000_create_team_members_and_action_participants.sql` aplicada no projeto remoto (`gtpitwhslqjgbuwlsaqg`) via `supabase db push`.
- Sincronismo confirmado em `supabase migration list`: local e remote com `20260506130000`.
- Validacao funcional via REST com `service_role`:
  - insert/read/delete em `team_members` (OK)
  - insert/delete em `action_team_members` (OK)
  - leitura de `listening_records.interviewer_team_member_id` (OK)
- Limpeza executada: registros de teste removidos ao final da validacao.

## Riscos e pontos de atencao

- Dados legados de `interviewer_name` coexistem com padronizacao; limpeza historica pode ser desejavel em ciclo futuro.
- Edicao de participantes depende de politicas RLS com ownership da acao para role `equipe`.

## Proximos passos sugeridos

1. Validar fluxo operacional fim a fim no app:
   - cadastro em `/equipe`
   - vinculo de participantes em `/acoes/nova`
   - digitacao em `/escutas/lote` com entrevistador travado
   - leitura no `/pos-banca` e no dossie.
2. Quando aprovado, commitar e fazer push das alteracoes do Tijolo 042.
