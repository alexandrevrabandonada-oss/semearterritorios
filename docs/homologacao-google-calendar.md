# Homologação Google Calendar

## Objetivo

Validar a sincronização manual e auditável da agenda interna do SEMEAR com Google Calendar sem expor dados sensíveis.

## Pré-condições

1. Evento interno criado em `/agenda/[id]`.
2. Perfil com papel `admin` ou `coordenacao`.
3. `GOOGLE_CALENDAR_SYNC_ENABLED=true`.
4. `GOOGLE_CALENDAR_ID` preenchido.
5. `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` preenchidos.
6. Google Calendar API habilitada no projeto OAuth.
7. Calendário institucional compartilhado com a conta que fará a conexão, com permissão de edição.

## Fluxo de homologação

### 1. Conexão

1. Abrir `/agenda/[id]`.
2. Clicar em `Conectar Google Calendar`.
3. Concluir o consentimento Google.
4. Confirmar que a conexão foi salva sem exibir token no frontend.

### 2. Create

1. Usar `Sincronizar com Google`.
2. Confirmar criação do evento no calendário institucional.
3. Confirmar `google_calendar_event_id`, `google_calendar_id`, `google_sync_status = synced` e log `create success`.

### 3. Update

1. Alterar título, descrição operacional segura, data ou horário no SEMEAR.
2. Usar `Atualizar evento Google`.
3. Confirmar atualização no Google.
4. Confirmar log `update success`.

### 4. Cancel

1. Usar `Cancelar evento Google`.
2. Confirmar que o evento foi cancelado no Google.
3. Confirmar que o evento interno permanece no SEMEAR.
4. Confirmar log `cancel success`.

### 5. Unlink

1. Usar `Desvincular do Google`.
2. Confirmar limpeza do vínculo externo no SEMEAR.
3. Confirmar log `unlink success`.

## Teste de erro controlado

Provocar pelo menos um cenário seguro:

- conexão revogada;
- calendário sem permissão de edição;
- API desabilitada;
- sync desabilitado no ambiente.

Confirmar:

- `google_sync_status = sync_error`;
- mensagem segura na UI;
- recomendação de ação;
- nenhum token ou segredo em log.

## Teste de refresh

Seguir `docs/teste-refresh-google-calendar.md` e `docs/smoke-assistido-refresh-google-calendar.md` para validar:

- uso do token atual;
- renovação com refresh token quando necessário;
- preservação ou rotação segura do refresh token;
- ausência de segredo em log, relatório e frontend.

## Teste de papéis

Confirmar, por fluxo real ou smoke manual:

- `admin` sincroniza;
- `coordenacao` sincroniza;
- `admin` e `coordenacao` podem ativar ou desativar `google_send_invites` por evento;
- `equipe` não sincroniza;
- `anon` sem acesso;
- equipe pode visualizar status e histórico sem executar sync.

## Convites por evento

- `google_send_invites` inicia em `false`;
- apenas membros de `team_calendar_event_members` entram na elegibilidade;
- só entram em `attendees` participantes `active = true` com e-mail válido;
- entrevistados nunca entram em attendees;
- a política atual mantém `sendUpdates=none`, mesmo com a flag ativada.

## Teste de privacidade

Conferir `reports/google-calendar-payload-privacy-check.md`.

O payload e os logs não devem conter:

- fala original;
- escutas;
- dados de entrevistados;
- anexos;
- relatório semanal completo;
- CPF;
- telefone;
- endereço pessoal;
- dado de saúde individual;
- access token;
- refresh token;
- private key;
- client secret.

## Limites mantidos

- sem webhook de retorno;
- sem push notification;
- sem e-mail próprio;
- sem sincronização automática em massa;
- sem retorno automático de alterações feitas diretamente no Google.
