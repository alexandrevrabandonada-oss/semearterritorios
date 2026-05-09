# Estado da Nação 063

## Diagnóstico inicial

Antes da implementação, o repositório já tinha lembretes visuais distribuídos:

- dashboard com InternalRemindersPanel;
- agenda com lembretes de hoje/amanhã/atrasos;
- painel de saúde do Google Calendar em /agenda/google/status;
- memória e relatórios com indicadores de pendência;
- transparência com status de snapshots e homologação.

Pendências já calculadas (pré-063):

- eventos atrasados;
- relatórios semanais pendentes;
- devolutivas e dossiês sem fechamento;
- drift local do Google e sync_error.

Lacuna principal:

- faltava centralização em uma única Central de Avisos com preferência por usuário, deduplicação e fluxo explícito de leitura/dispensa/arquivamento.

## Migrations criadas

- supabase/migrations/20260509010000_add_in_app_notifications.sql

## Tabelas criadas

- in_app_notifications
- notification_preferences

Campos e regras principais implementados:

- tipagem de aviso por notification_type;
- prioridade por priority;
- ciclo de status (unread, read, archived, dismissed);
- action_url interna protegida;
- deduplicação ativa por chave composta;
- preferência única por profile_id.

## Rota /avisos

Implementado:

- /avisos como Central de Avisos;
- filtros por categoria e leitura;
- seções de não lidos, urgentes, hoje, por categoria e arquivados/dispensados;
- ações: marcar como lido, dispensar, arquivar e abrir origem;
- botão Atualizar avisos;
- botão Atualizar avisos do papel para coordenação/admin.

## Preferências criadas

Implementado:

- /avisos/preferencias;
- toggles para agenda, Google Calendar, relatórios semanais, devolutiva/dossiê, escutas, transparência e memória;
- modo silencioso;
- persistência em notification_preferences.

## Gerador de avisos

Implementado:

- lib/notifications/build-internal-notifications.ts

Geração determinística, sem IA, usando:

- agenda;
- weekly_team_reports;
- actions + action_debriefs + action_closures;
- listening_records;
- public_transparency_snapshots;
- public_transparency_homologation_packages;
- public_transparency_snapshot_review_comments.

## Integrações

### Dashboard

- bloco Pendências e avisos com 3 itens prioritários;
- botão natural para abrir /avisos.

### Agenda

- painel de avisos da agenda (agenda + Google);
- /agenda/google/status com link para /avisos?categoria=google.

### Memória e Relatórios

- /memoria com painel de avisos de memória e relatórios;
- /relatorios com painel de avisos de relatórios semanais.

### Transparência

- /transparencia/snapshots com painel de avisos de transparência;
- /transparencia/homologacao com painel de avisos de homologação.

### App Shell global

- sino de avisos com badge de não lidos;
- dropdown com 5 avisos recentes;
- link para /avisos;
- modo silencioso refletido no badge (somente urgentes).

## Garantias de privacidade

Mantido no tijolo 063:

- sem fala original em aviso;
- sem dado de entrevistado;
- sem CPF, telefone, endereço;
- sem anexo;
- sem token;
- sem conteúdo sensível completo de relatório;
- action_url somente interna.

## Confirmação de escopo

Confirmado:

- não há push notification;
- não há e-mail automático;
- não há webhook externo;
- não há service_role no frontend;
- RLS mantido e reforçado para avisos/preferências.

## Riscos restantes

1. O recalculo atual é sob demanda e pode depender da disciplina operacional para manter o painel sempre atualizado.
2. A deduplicação ativa privilegia estado atual e não mantém histórico extenso de versões do mesmo aviso.
3. Alguns avisos de revisão podem crescer em volume em ambientes com alto fluxo de escutas sem revisão.

## Próximo tijolo recomendado

Tijolo 064 - Orquestração de Avisos Internos por Rotina Segura

Foco sugerido:

- rotina interna opcional (sem automação externa) para recalcular avisos em horários de operação;
- sumarização operacional por papel no início do dia;
- telemetria interna de tempo de resolução de avisos (SLA interno).
