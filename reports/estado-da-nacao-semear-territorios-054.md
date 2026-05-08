# Estado da Nação SEMEAR Territórios 054

## Diagnóstico inicial

O sistema já possuía base suficiente para uma agenda interna sem depender de integração externa:

- `actions` e `action_team_members` já representavam operações de campo e equipe participante;
- `team_members` já separava participação operacional de autorização de acesso;
- `weekly_team_reports` já estruturava rotina semanal interna;
- `project_memory_entries` já consolidava memória institucional;
- `action_debriefs` e `action_closures` já indicavam devolutivas e dossiês pendentes;
- rotas operacionais existentes: `/acoes`, `/equipe`, `/memoria`, `/relatorios`, `/ajuda`;
- RLS existente já trabalhava com `get_user_role()` e distinção segura entre `equipe`, `coordenacao` e `admin`.

Eventos e sinais já existentes no sistema e aproveitáveis pela agenda:

- ações territoriais;
- bancas de escuta;
- reuniões institucionais cadastradas como ação;
- prazos de relatório semanal;
- devolutivas pendentes;
- dossiês pendentes;
- tarefas de memória e fechamento interno.

## Tabelas criadas

Migration criada:

- `supabase/migrations/20260508110000_create_team_calendar.sql`

Novas estruturas:

- `team_calendar_events`
- `team_calendar_event_members`

Campos adicionais preparados:

- `weekly_team_reports.team_calendar_event_id`
- `project_memory_entries.team_calendar_event_id`

Campos futuros para Google Calendar preparados em `team_calendar_events`:

- `google_calendar_event_id`
- `google_calendar_id`
- `google_sync_status`
- `google_synced_at`

## RLS e privacidade

Regras implementadas:

- `anon` não recebe acesso;
- autenticados internos (`equipe`, `coordenacao`, `admin`) podem ler agenda;
- apenas `coordenacao` e `admin` podem criar, editar ou remover eventos;
- presença própria pode ser atualizada com função segura `can_update_own_team_calendar_attendance(...)`;
- vínculo em evento não concede acesso ao sistema;
- nenhuma permissão depende de `service_role` no frontend.

Garantias de privacidade mantidas:

- agenda continua interna;
- microcopy explícita contra dados pessoais de entrevistados;
- sem página pública;
- sem push;
- sem e-mail automático;
- sem integração Google ativa neste tijolo.

## Rotas criadas

Rotas novas:

- `/agenda`
- `/agenda/novo`
- `/agenda/[id]`

Entregas da interface:

- visão mobile-first com próximos eventos primeiro;
- visões de próximos, semana, mês simples e lista;
- filtros por tipo, status, território, responsável e período;
- cards grandes para uso em celular;
- formulário de evento com equipe participante, responsabilidades e status de presença;
- lembretes visuais de hoje, amanhã, relatórios pendentes, devolutivas pendentes e dossiês pendentes.

## Integração com ações

Entregas:

- em `/acoes/nova`, coordenação/admin pode optar por criar evento da agenda junto com a ação;
- o evento reaproveita título, território, equipe participante e vínculo com `action_id`;
- nada é criado automaticamente sem confirmação;
- em `/acoes/[id]`, a página da ação agora mostra o bloco da agenda e atalho para criar/abrir evento vinculado.

## Integração com dashboard

O bloco “Próxima operação” foi atualizado para usar a agenda coletiva como fonte principal quando existir evento futuro:

- próximo evento;
- ação vinculada;
- equipe escalada;
- território;
- status;
- atalhos para agenda, ação e digitação de fichas.

Também foram adicionados alertas internos usando:

- eventos do dia;
- eventos de amanhã;
- relatórios semanais pendentes;
- devolutivas pendentes;
- dossiês pendentes.

## Integração com memória

Entregas:

- eventos concluídos podem abrir fluxo para relatório semanal vinculado;
- `weekly_team_reports` agora pode guardar `team_calendar_event_id`;
- `project_memory_entries` agora pode guardar `team_calendar_event_id`;
- `/memoria/novo` aceita contexto de `eventId` e `actionId` para vínculo manual;
- `/agenda/[id]` mostra relatórios e entradas de memória relacionados.

Nada é gerado automaticamente.

## Campos preparados para Google Calendar

Preparado apenas no schema:

- `google_calendar_event_id`
- `google_calendar_id`
- `google_sync_status`
- `google_synced_at`

Nenhuma sincronização, webhook, push ou envio externo foi implementado neste tijolo.

## Arquivos principais alterados

- `supabase/migrations/20260508110000_create_team_calendar.sql`
- `lib/database.types.ts`
- `lib/team-calendar.ts`
- `lib/semear-data.ts`
- `app/agenda/page.tsx`
- `app/agenda/novo/page.tsx`
- `app/agenda/[id]/page.tsx`
- `components/agenda/team-calendar-page.tsx`
- `components/agenda/team-calendar-event-form.tsx`
- `components/agenda/team-calendar-event-detail.tsx`
- `components/actions/action-form.tsx`
- `components/actions/action-detail.tsx`
- `components/dashboard.tsx`
- `components/memory/project-memory-report-workspace.tsx`
- `app/ajuda/page.tsx`
- `docs/agenda-coletiva-equipe.md`

## Verificação executada

Comandos rodados com sucesso:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Riscos restantes

- A agenda hoje depende de criação manual de eventos; ainda não há geração assistida para relatórios, devolutivas ou dossiês com data automática.
- O formulário de ação reaproveita data da ação, mas o módulo de ação ainda não possui horário próprio estruturado.
- A tela mensal é propositalmente simples; funciona bem no mobile, mas não é um calendário denso estilo grade.
- O vínculo de presença depende de `team_members.profile_id` corretamente preenchido.

## Próximo tijolo recomendado

Próximo tijolo sugerido:

- sincronização segura opcional com Google Calendar, usando os campos já preparados, fila de sincronização auditável e regras explícitas de quem pode publicar para fora do sistema.
