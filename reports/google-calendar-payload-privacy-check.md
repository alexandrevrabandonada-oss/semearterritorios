# Google Calendar Payload Privacy Check

## Objetivo

Validar, por inspeção de código e fluxo implementado, que o payload enviado ao Google Calendar permanece operacional e não carrega conteúdo sensível do SEMEAR.

## Arquivos revisados

- `lib/google-calendar/sanitize-calendar-event.ts`
- `lib/google-calendar/google-calendar-api.ts`
- `app/api/google-calendar/sync-event/route.ts`

## Campos efetivamente enviados

- `summary`
- `description`
- `location`
- `start`
- `end`
- `attendees`
- `status`

## Conteúdo permitido no payload

- título do evento com prefixo `[SEMEAR]`;
- tipo do evento;
- território agregado;
- status operacional;
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
- private key.
- client secret.

## Observações sobre convites

- apenas participantes com e-mail preenchido e válido entram em `attendees`;
- e-mail vazio ou inválido não gera convite;
- membros sem e-mail ficam apenas no aviso interno do SEMEAR.

## Observações sobre logs

- `payload_summary` guarda apenas resumo sanitizado;
- nenhum token é salvo em `google_calendar_sync_logs`;
- nenhuma credencial do Google é persistida em tabela.

## Observações sobre conexões OAuth

- `google_calendar_user_connections` guarda credenciais apenas para o próprio `profile_id` autorizado;
- a tabela fica protegida por RLS e não deve aparecer para outro usuário autenticado;
- relatórios e telas operacionais não exibem `access_token`, `refresh_token`, `private_key` ou `client secret`.

## Resultado

O payload atual está alinhado com a regra de espelho operacional e preserva a privacidade prevista para a integração com Google Calendar.
