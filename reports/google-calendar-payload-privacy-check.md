# Google Calendar Payload Privacy Check

## Objetivo

Validar, por inspeção de código e pelo fluxo homologado, que payload e logs da integração com Google Calendar continuam operacionais e sem conteúdo sensível.

## Arquivos revisados

- `lib/google-calendar/sanitize-calendar-event.ts`
- `lib/google-calendar/google-calendar-api.ts`
- `lib/google-calendar/google-calendar-errors.ts`
- `app/api/google-calendar/sync-event/route.ts`
- `components/agenda/team-calendar-event-detail.tsx`

## Campos efetivamente enviados ao Google

- `summary`
- `description`
- `location`
- `start`
- `end`
- `attendees`
- `status`

## Conteúdo permitido

- título prefixado com `[SEMEAR]`;
- tipo do evento;
- status operacional;
- território agregado;
- nomes operacionais da equipe;
- link interno para o evento do SEMEAR;
- data e horário.

## Conteúdo que NÃO entra no payload

- fala original;
- escutas;
- dados de entrevistados;
- anexos;
- relatório semanal completo;
- CPF;
- telefone;
- endereço pessoal;
- dado de saúde individual;
- tokens;
- private key;
- client secret.

## Convites

- convites por e-mail seguem desativados por padrão;
- `google_send_invites` pode ser ativado por evento, mas segue `false` por padrão;
- apenas participantes vinculados ao evento, `active = true` e com `team_members.email` válido podem entrar em `attendees`;
- não existe campo livre de e-mail;
- entrevistados nunca entram como convidados.

## Logs

- `payload_summary` guarda apenas resumo sanitizado;
- o histórico em `/agenda/[id]` exibe apenas mensagem segura, data, usuário e resumo sanitizado;
- nenhum token é salvo em `google_calendar_sync_logs`;
- nenhuma credencial do Google aparece no histórico da UI.

## Conexões OAuth

- `google_calendar_user_connections` fica protegida por RLS;
- o token pertence apenas ao `profile_id` autorizado;
- outro usuário autenticado não deve ler a conexão;
- relatórios e telas operacionais não exibem `access_token`, `refresh_token`, `private_key` ou `client secret`.

## Resultado

O payload atual continua alinhado com a regra de espelho operacional.  
Privacidade preservada, sem regressão conhecida no Tijolo 061.
