# Estado da Nação SEMEAR Territórios 060

Data: 8 de maio de 2026
Escopo: consolidação da Agenda da Equipe, integração manual com Google Calendar e estado operacional atual do projeto

## Resumo executivo

O SEMEAR Territórios está com a Agenda da Equipe publicada em produção, migrations aplicadas no banco remoto e integração manual com Google Calendar homologada ponta a ponta via OAuth de coordenação/admin.

O fluxo validado em produção foi:

1. conexão manual com Google
2. persistência server-side da conexão
3. criação real de evento no Google Calendar
4. atualização real de evento no Google Calendar
5. cancelamento real no Google Calendar
6. desvinculação do vínculo no SEMEAR
7. registro auditável no histórico interno

O SEMEAR segue como fonte principal. O Google Calendar funciona como espelho operacional.

## O que foi feito nesta rodada

### 1. Publicação e versionamento

- commit realizado em `main`
- push realizado para `origin/main`
- deploy de produção concluído na Vercel
- URL produtiva validada:
  - `https://semearterritorios-pvsp.vercel.app`

### 2. Banco remoto

Foram aplicadas e/ou regularizadas no projeto Supabase remoto as migrations pendentes a partir de:

- `20260507120000_create_project_memory_weekly_reports.sql`
- `20260508090000_expand_project_memory_entries.sql`
- `20260508110000_create_team_calendar.sql`
- `20260508153000_add_structured_schedule_to_actions.sql`
- `20260508190000_add_google_calendar_sync_logs.sql`
- `20260508223000_add_google_calendar_user_connections.sql`

Também foi feito `migration repair` para ajustar o histórico remoto de uma migration que já estava parcialmente refletida no schema, mas não registrada na tabela de histórico.

Estado final das migrations:

- local e remoto alinhados até `20260508223000`

### 3. Agenda da Equipe em produção

A rota `/agenda` foi publicada e validada em produção.

Rotas publicadas e acessíveis:

- `/agenda`
- `/agenda/novo`
- `/agenda/[id]`

O evento de homologação criado para os testes foi:

- `037297bc-638c-4720-acff-eb12578c75fc`

URL:

- `https://semearterritorios-pvsp.vercel.app/agenda/037297bc-638c-4720-acff-eb12578c75fc`

### 4. OAuth manual do Google Calendar

Foi concluído o fluxo real de conexão manual com a conta:

- `alexandrecampos@id.uff.br`

Resultado validado:

- login Google concluído
- consentimento concluído
- conexão salva em `google_calendar_user_connections`
- `refresh_token` presente
- conexão ativa exibida na interface

### 5. Homologação do sync real com Google Calendar

O fluxo real foi homologado após resolver os bloqueios externos do Google Cloud e do compartilhamento do calendário institucional.

Testes aprovados:

- `create`
- `update`
- `cancel`
- `unlink`

#### Create

O SEMEAR criou um evento real no Google Calendar institucional.

Resultado observado:

- `google_calendar_event_id` preenchido
- `google_calendar_id` preenchido
- `google_sync_status = synced`
- log `create success` registrado

#### Update

O evento foi alterado localmente no SEMEAR e sincronizado com sucesso para o Google Calendar.

Resultado observado:

- atualização real no Google
- log `update success`

#### Cancel

O evento externo foi cancelado no Google sem apagar o evento interno do SEMEAR.

Resultado observado:

- `google_sync_status = cancelled`
- log `cancel success`

#### Unlink

O vínculo externo foi removido do SEMEAR, preservando o evento interno.

Resultado observado:

- `google_calendar_event_id` limpo
- `google_calendar_id` limpo
- `google_sync_status = unlinked`
- log `unlink success`

## Bloqueios encontrados e como foram resolvidos

### 1. Produção sem `/agenda`

Problema:

- a URL produtiva ainda servia uma versão anterior e `/agenda` retornava `404`

Ação:

- push do código atualizado
- deploy pela Vercel CLI

### 2. Banco remoto sem tabelas da agenda

Problema:

- produção retornava erro de schema cache para `public.team_calendar_events`

Ação:

- aplicação das migrations no Supabase remoto

### 3. Service account bloqueada

Problema:

- o caminho institucional por service account ficou travado por política do Google Cloud que impedia gerar chave JSON

Ação:

- o projeto já havia sido adaptado para OAuth manual por coordenação/admin
- a homologação seguiu por esse caminho

### 4. Google Calendar API desabilitada

Problema:

- o primeiro `sync_error` real ocorreu porque a Google Calendar API estava desabilitada no projeto do OAuth client

Ação:

- API habilitada no Google Cloud

### 5. Calendário institucional inacessível

Problema:

- a conta conectada não possuía acesso ao calendário institucional

Ação:

- compartilhamento do calendário com a conta autorizadora

### 6. Permissão insuficiente no calendário

Problema:

- a conta conectada tinha leitura, mas não escrita

Ação:

- permissão elevada para edição no calendário institucional

## Estado atual do projeto

### Módulos já operacionais

- ações
- escutas
- equipe
- territórios
- mapa
- relatórios
- memória do projeto
- agenda da equipe
- integração manual com Google Calendar
- pós-banca
- transparência e homologação editorial existentes no repositório

### Agenda da Equipe

Estado atual:

- publicada
- schema remoto aplicado
- CRUD funcional
- integração com ações ativa
- lembretes internos visuais ativos
- presença por participante ativa
- vínculo com memória e relatórios preparado

### Google Calendar

Estado atual:

- conexão manual OAuth homologada
- gravação server-side de tokens homologada
- refresh token presente e disponível
- sincronização manual homologada
- logs auditáveis homologados
- integração funcional em produção

### Segurança e privacidade

Confirmado:

- sem token no frontend
- sem `service_role` no frontend
- payload sanitizado
- sem fala original
- sem dados de entrevistados
- sem anexos
- sem relatório semanal completo no Google
- Google recebe apenas resumo operacional

## Artefatos e evidências relevantes

### Banco e schema

- `supabase/migrations/20260508110000_create_team_calendar.sql`
- `supabase/migrations/20260508153000_add_structured_schedule_to_actions.sql`
- `supabase/migrations/20260508190000_add_google_calendar_sync_logs.sql`
- `supabase/migrations/20260508223000_add_google_calendar_user_connections.sql`

### Código principal

- `app/api/google-calendar/connection/route.ts`
- `app/api/google-calendar/sync-event/route.ts`
- `app/auth/callback/route.ts`
- `components/agenda/team-calendar-event-detail.tsx`
- `components/auth/google-calendar-connection-observer.tsx`
- `lib/google-calendar/google-calendar-api.ts`
- `lib/google-calendar/sanitize-calendar-event.ts`

### Documentação já criada

- `docs/agenda-coletiva-equipe.md`
- `docs/google-calendar-integracao.md`
- `docs/google-calendar-oauth-manual.md`
- `docs/homologacao-google-calendar.md`
- `docs/planejamento-google-calendar.md`
- `reports/google-calendar-payload-privacy-check.md`
- `scripts/smoke-google-calendar-homologacao.md`

## Pendências e riscos restantes

### 1. Título do evento de homologação ficou sujo

Durante a automação do teste de edição, o campo de título do evento de homologação ficou com duplicação parcial de texto.

Impacto:

- apenas no evento de teste
- não afeta a homologação do Google Calendar

Recomendação:

- corrigir manualmente o título desse evento de homologação

### 2. Sem webhook de retorno do Google

Estado:

- alterações feitas diretamente no Google não retornam automaticamente ao SEMEAR

Impacto:

- risco de drift operacional se a equipe editar eventos no Google em vez do SEMEAR

### 3. Integração institucional por service account continua pendente

Estado:

- o caminho atual homologado é OAuth manual
- a alternativa por service account continua dependente de política do Google Cloud

Impacto:

- a sincronização depende da conexão ativa de coordenação/admin

### 4. Convites para equipe ainda não foram aprofundados

Estado:

- o sistema contabiliza participantes com e-mail
- a homologação principal foi feita sem depender de envio operacional de convites

Impacto:

- ainda cabe refinamento específico de convites e comportamento de attendees

## Próximo tijolo recomendado

Recomendação: Tijolo 061

Tema sugerido:

- endurecimento operacional pós-homologação do Google Calendar

Escopo sugerido:

1. corrigir UX de edição do evento de homologação e pequenos ajustes de interface
2. adicionar verificação explícita de permissão de escrita no calendário antes do `create`
3. melhorar mensagens de erro específicas por cenário Google
4. validar rotação e reuso de refresh token com teste dedicado
5. opcionalmente preparar modo institucional por service account se a política do Google Cloud permitir
6. decidir política de convites de participantes por e-mail

## Conclusão

O SEMEAR Territórios encerra esta etapa com a Agenda da Equipe funcional em produção e a sincronização manual com Google Calendar efetivamente homologada.

O sistema já consegue:

- conectar uma conta coordenação/admin
- criar evento no calendário institucional
- atualizar evento no calendário institucional
- cancelar evento no calendário institucional
- desvincular o evento no SEMEAR
- manter trilha auditável de sincronização

O estado atual é operacional para uso interno, com as principais restrições já conhecidas e documentadas.
