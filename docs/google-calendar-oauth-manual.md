# Google Calendar OAuth Manual

## Objetivo

Operar a sincronização manual do Google Calendar com OAuth de `admin` e `coordenacao`, mantendo o SEMEAR como fonte principal e o Google como espelho operacional.

## Checklist do Google Cloud

1. Habilitar a `Google Calendar API` no projeto do OAuth.
2. Criar ou reutilizar um `OAuth Client ID` do tipo `Aplicativo da Web`.
3. Configurar `Authorized JavaScript origins` com os domínios do app.
4. Configurar `Authorized redirect URI` com o callback do Supabase Auth.
5. Configurar a tela de consentimento.
6. Se o app estiver em `Testing`, adicionar as contas reais de coordenação/admin como usuários de teste.

## Checklist do Supabase

1. Provedor Google ativo em `Authentication > Providers`.
2. `Client ID` e `Client Secret` do mesmo client OAuth configurados no provider.
3. Redirect URLs do projeto conferidas.
4. Callback `/auth/callback?google_calendar=connect` preservando o retorno para `/agenda/[id]`.

## Checklist do ambiente

- `GOOGLE_CALENDAR_SYNC_ENABLED=true`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Nunca registrar valores reais em documento, relatório, print ou commit.

## Escopos mínimos

O fluxo `Conectar Google Calendar` deve pedir apenas:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar.events`

Para permitir renovação server-side:

- `access_type=offline`
- `prompt=consent`
- `include_granted_scopes=true`

## Fluxo operacional

1. Abrir `/agenda/[id]`.
2. Conferir se o evento interno está correto no SEMEAR.
3. Definir se `google_send_invites` ficará ativado ou não para aquele evento.
4. Usar `Conectar Google Calendar` se não houver conexão ativa.
5. Concluir o consentimento Google.
6. Voltar para o SEMEAR com a conexão registrada server-side.
7. Usar `Sincronizar com Google`, `Atualizar evento Google`, `Cancelar evento Google` ou `Desvincular do Google`.

## Erros comuns e resposta segura

- `A sincronização com Google Calendar está desabilitada neste ambiente.`
  Conferir a flag `GOOGLE_CALENDAR_SYNC_ENABLED`.
- `A Google Calendar API não está habilitada para este projeto OAuth.`
  Habilitar a API no projeto Google Cloud do client OAuth.
- `A conta conectada não tem permissão para editar este calendário.`
  Compartilhar o calendário institucional com permissão de edição.
- `O calendário institucional informado não foi encontrado para a conta conectada.`
  Conferir `GOOGLE_CALENDAR_ID` e o compartilhamento do calendário.
- `A conexão Google expirou ou foi revogada pela conta conectada.`
  Usar `Reconectar Google Calendar`.
- `A conexão Google não possui refresh token para reprocessamento seguro.`
  Reconectar com consentimento offline.

## Reconexão

Use `Reconectar Google Calendar` quando:

- a conexão tiver expirado;
- o refresh token tiver sido revogado;
- a conta tiver removido o app na Conta Google;
- o SEMEAR indicar ausência de refresh token;
- a UI mostrar `sync_error` com recomendação de reconexão.

## Fonte principal e drift

- O SEMEAR continua como fonte principal.
- O Google Calendar recebe apenas resumo operacional.
- Alterações feitas diretamente no Google Calendar não retornam automaticamente ao SEMEAR nesta versão.
- Se houver mudança local após um sync bem-sucedido, o evento pode aparecer como `Alterações locais pendentes de sincronização`.

## Convites por e-mail

- Convites permanecem desativados por padrão.
- `google_send_invites` pode ser ativado ou desativado por evento.
- Apenas `admin` e `coordenacao` podem alterar essa flag.
- Mesmo com a flag ativada, a política atual mantém `sendUpdates=none`.
- Só podem entrar em `attendees` participantes `active = true` com `team_members.email` válido.
- Nunca convidar entrevistados.
- Nunca convidar e-mails digitados em campo livre.

## Reprocessamento assistido

- Em `sync_error`, usar o próprio painel do evento para:
  - `Tentar novamente`
  - `Reconectar Google Calendar`
  - `Desvincular do Google`
  - abrir a ajuda operacional

## Painel de saúde

Use `/agenda/google/status` para acompanhar:

- sync habilitado;
- conexão ativa do usuário atual;
- refresh token presente;
- último sync bem-sucedido;
- últimos erros;
- eventos com `sync_error`;
- eventos com drift local pendente.

## O que nunca sincronizar

- escutas;
- fala original;
- relatórios semanais completos;
- anexos;
- dados de entrevistados;
- CPF;
- telefone;
- endereço pessoal;
- dado de saúde individual.

## Limites desta versão

- sem webhook de retorno do Google;
- sem push notification;
- sem envio de e-mail próprio do SEMEAR;
- sem leitura de calendário pessoal além do mínimo necessário para a conexão manual;
- sem sincronização automática em massa.
