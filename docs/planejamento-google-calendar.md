# Planejamento Google Calendar

## Objetivo

Preparar uma futura sincronização opcional da agenda interna do SEMEAR Territórios com Google Calendar sem ativar nada neste momento.

## O que poderá ser sincronizado

Somente resumo operacional:

- título do evento;
- data e horário;
- marcação de dia inteiro;
- status operacional compatível;
- território em nível agregado;
- equipe convidada apenas quando houver e-mail institucional ou operacional autorizado.

## O que nunca deve ser sincronizado

- fala original de entrevistados;
- CPF;
- telefone;
- endereço pessoal;
- e-mail de entrevistado;
- nome identificável de pessoa escutada;
- dado sensível;
- anexos internos de memória;
- observações que exponham situação pessoal de alguém.

## Campos necessários

Antes da sincronização, o evento precisa ter:

- `title`;
- `starts_at` e `ends_at`, ou `all_day = true`;
- `event_type`;
- `status`;
- `action_id` quando houver ação vinculada;
- `neighborhood_id` quando o território for relevante.

Quando houver convite externo para equipe:

- `team_members.email` precisa existir;
- a coordenação precisa revisar se o e-mail pode ser usado nessa integração.

## Riscos

- sincronizar evento com descrição detalhada demais;
- enviar dados operacionais que exponham pessoas ou contextos sensíveis;
- propagar horários errados por falta de `starts_at`/`ends_at`;
- tratar agenda externa como fonte principal antes de consolidar a agenda interna;
- permitir sincronização automática sem revisão humana.

## Como evitar dados pessoais

- manter descrições curtas e operacionais;
- usar território agregado, nunca endereço individual;
- não mencionar entrevistados;
- revisar manualmente antes de sincronizar;
- restringir a ação a coordenação/admin.

## Quem pode sincronizar

Quando o tijolo de sincronização existir, a recomendação é:

- somente `coordenacao` e `admin` podem sincronizar;
- a equipe pode visualizar o status, mas não acionar integração externa;
- toda sincronização precisa gerar rastro de auditoria.

## Estado atual

O Tijolo 056 adicionou a base manual e auditável para Google Calendar. Mesmo assim, continuam fora de escopo:

- sincronização automática em lote;
- webhook;
- push;
- e-mail próprio;
- leitura de calendário pessoal da equipe.

Os campos já preparados no schema são:

- `google_calendar_event_id`
- `google_calendar_id`
- `google_sync_status`
- `google_synced_at`

Também existe a tabela:

- `google_calendar_sync_logs`

## Abordagem escolhida

- usar calendário institucional compartilhado, quando possível;
- sincronização manual acionada por `admin` ou `coordenacao`;
- preferir service account apenas no servidor quando a política do Google Cloud permitir;
- manter OAuth manual de `admin/coordenacao` como contingência operacional segura;
- SEMEAR como fonte principal;
- Google Calendar como espelho operacional.

## O que será sincronizado nesta versão manual

- resumo operacional do evento;
- data e horário;
- dia inteiro, quando aplicável;
- território agregado;
- participantes da equipe com e-mail, quando existir;
- link interno para o evento do SEMEAR.

## O que nunca será sincronizado

- escutas;
- fala original;
- anexos;
- relatório semanal completo;
- qualquer dado de entrevistado;
- endereço pessoal;
- telefone;
- CPF.
