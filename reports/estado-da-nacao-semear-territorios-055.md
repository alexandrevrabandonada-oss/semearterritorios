# Estado da Nação SEMEAR Territórios 055

## Diagnóstico inicial

O Tijolo 054 já havia criado a agenda interna, mas ainda havia cinco fragilidades centrais:

- `actions` continuava dependendo principalmente de `action_date`, sem período estruturado;
- a criação de evento a partir da ação ainda caía em sugestão manual simplificada;
- devolutiva, fechamento de dossiê e revisão das escutas ainda dependiam muito de criação manual;
- os lembretes internos existiam, mas sem painel reutilizável e sem foco claro em atrasos e lacunas de agenda;
- a presença dependia de `team_members.profile_id`, mas isso ainda não estava suficientemente visível na UI.

Confirmações do diagnóstico:

- `team_calendar_events` e `team_calendar_event_members` já estavam ativos e internos;
- `actions` não tinha ainda `starts_at`, `ends_at` e `all_day`;
- o evento herdado da ação usava data da ação e caía em horário sugerido;
- `starts_at` e `ends_at` da agenda já eram preenchidos diretamente no evento, mas sem origem estruturada em `actions`;
- dashboard e agenda já liam eventos, mas ainda não distinguiam claramente atrasados, sem agenda e lacunas operacionais.

## Campos adicionados em actions

Migration criada:

- `supabase/migrations/20260508153000_add_structured_schedule_to_actions.sql`

Campos adicionados:

- `starts_at timestamptz null`
- `ends_at timestamptz null`
- `all_day boolean not null default false`

Garantias:

- `action_date` foi mantido para compatibilidade com ações antigas;
- ações antigas continuam válidas mesmo sem horário estruturado;
- há `check` garantindo que `ends_at` não seja anterior a `starts_at`;
- índices novos foram adicionados para `starts_at` e `ends_at`.

## Mudanças em /acoes

Principais mudanças:

- formulário de ação agora aceita horário estruturado;
- microcopy orienta quando usar horário, dia inteiro ou horário pendente;
- criação assistida de evento na agenda agora herda:
  - título;
  - tipo;
  - território;
  - equipe;
  - `starts_at`;
  - `ends_at`;
  - `all_day`;
  - `action_id`;
- se a ação não tiver horário, o sistema sugere um padrão editável, sem criar nada silenciosamente;
- detalhe da ação agora mostra horário estruturado e novos atalhos operacionais.

Novos atalhos em `/acoes/[id]`:

- `Agendar devolutiva`
- `Agendar fechamento do dossiê`
- `Agendar revisão das escutas`

Esses botões abrem `/agenda/novo` já preenchido com contexto, mas nunca criam evento automaticamente.

## Mudanças em /agenda

Principais melhorias:

- formulário de evento passou a aceitar parâmetros de contexto mais ricos;
- evento vindo de ação agora reutiliza horário estruturado quando existir;
- visão semanal foi reforçada com blocos operacionais:
  - hoje;
  - amanhã;
  - próximos 7 dias;
  - atrasados;
  - concluídos recentes;
- a visão mensal continua simples, como previsto;
- o mobile continua priorizando próximos eventos e cards grandes.

Também foi criado:

- `components/agenda/internal-reminders-panel.tsx`

Esse componente passou a ser a base dos lembretes internos visuais.

## Eventos sugeridos criados

Fluxos assistidos adicionados:

- evento principal da ação;
- devolutiva;
- fechamento do dossiê;
- revisão das escutas;
- prazo de relatório semanal em `/memoria` e `/relatorios`.

Todos esses fluxos são assistidos, não automáticos.

## Lembretes internos visuais

Lembretes adicionados em `/agenda` e `dashboard`:

- eventos de hoje;
- eventos amanhã;
- eventos atrasados;
- relatórios semanais pendentes;
- devolutivas sem agenda;
- dossiês sem agenda;
- ações realizadas sem fechamento.

Não foi implementado:

- push notification;
- e-mail automático;
- webhook externo.

## Melhorias de presença e vínculo com profile

Entregas:

- `/equipe` agora mostra badges:
  - `com login vinculado`
  - `sem login vinculado`
- `/agenda/[id]` agora avisa quando um participante não tem `profile_id` vinculado;
- a UI deixa explícito que esse membro não pode atualizar presença sozinho;
- nenhuma permissão nova foi concedida por causa disso.

## Documentação Google preparada

Documentos atualizados/criados:

- `docs/agenda-coletiva-equipe.md`
- `docs/planejamento-google-calendar.md`

Foi adicionada a seção de pré-requisitos para futura sincronização com Google Calendar, incluindo:

- ações com `starts_at`/`ends_at` ou `all_day`;
- título claro;
- e-mail da equipe quando aplicável;
- revisão manual;
- proibição de sincronizar dado sensível.

## Confirmação de escopo

Continua **não ativado**:

- Google Calendar;
- push notification;
- e-mail automático;
- webhook externo;
- página pública da agenda.

Agenda continua:

- interna;
- autenticada;
- protegida por RLS;
- sem `service_role` no frontend.

## Verificação executada

Comandos rodados com sucesso:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Riscos restantes

- muitos módulos ainda exibem `action_date` como referência textual principal e podem ser refinados depois para usar horário estruturado onde fizer sentido;
- a sincronização entre ação e evento continua assistida, mas não há atualização bidirecional automática;
- convites externos continuam dependentes de qualidade do campo `email` em `team_members`;
- a agenda ainda não possui uma grade mensal avançada, por decisão de priorizar usabilidade operacional e mobile.

## Próximo tijolo recomendado

Próximo tijolo sugerido:

- integração manual e auditável com Google Calendar, usando apenas resumo operacional, com sincronização acionada por `coordenacao`/`admin` e trilha clara de auditoria.
