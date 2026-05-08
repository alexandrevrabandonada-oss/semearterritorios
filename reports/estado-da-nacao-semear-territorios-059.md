# Estado da Nação — SEMEAR Territórios 059

## Diagnóstico inicial

- `GOOGLE_CALENDAR_SYNC_ENABLED`: ausente em `.env.local` deste workspace;
- `GOOGLE_CALENDAR_ID`: ausente em `.env.local` deste workspace;
- `GOOGLE_OAUTH_CLIENT_ID`: ausente em `.env.local` deste workspace;
- `GOOGLE_OAUTH_CLIENT_SECRET`: ausente em `.env.local` deste workspace;
- `.env.example` foi atualizado para incluir as variáveis OAuth;
- o código já possuía:
  - `google_calendar_user_connections`;
  - `/api/google-calendar/connection`;
  - `/api/google-calendar/sync-event`;
  - persistência via `/auth/callback`;
  - fallback client-side com `google-calendar-connection-observer`.

## Ajustes implementados no Tijolo 059

- escopo do fluxo `Conectar Google Calendar` reforçado para:
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/calendar.events`
- `access_type=offline` e `prompt=consent` mantidos no fluxo de conexão;
- `/api/google-calendar/connection` agora informa `requires_reconnect` quando a conexão OAuth não tem refresh token ou quando o ambiente não está pronto para refresh;
- `/agenda/[id]` passou a oferecer `Reconectar Google Calendar` em cenários de autorização expirada ou refresh ausente;
- documentação específica criada em `docs/google-calendar-oauth-manual.md`.

## Configuração Google/Supabase

- o client OAuth Web foi criado no Google Cloud;
- o redirect URI do Supabase foi informado na criação do client;
- a configuração do provider Google no Supabase ainda precisa ser confirmada no ambiente real;
- a presença da Calendar API habilitada no Google Cloud precisa ser confirmada no ambiente real.

## Teste de conexão

- automação de código pronta;
- homologação real pendente de ambiente com envs preenchidas e login de `admin/coordenacao`;
- sem esse acesso, não foi possível concluir o retorno real do OAuth e persistir uma conexão válida em `google_calendar_user_connections`.

## Teste de refresh

- lógica de refresh server-side implementada em `lib/google-calendar/google-calendar-api.ts`;
- rotação de token armazenado prevista no fluxo de sync;
- homologação real do refresh pendente de:
  - `GOOGLE_OAUTH_CLIENT_ID`;
  - `GOOGLE_OAUTH_CLIENT_SECRET`;
  - uma conexão OAuth real com `provider_refresh_token`.

## Testes create / update / cancel / unlink

- rotas e UI prontas para uso manual;
- payload sanitizado preservado;
- homologação real pendente porque o ambiente local desta sessão não possui as envs OAuth nem uma sessão autenticada de coordenação/admin no app.

## Teste de papéis

- por inspeção de código:
  - `admin` e `coordenacao` podem conectar e sincronizar;
  - `equipe` recebe bloqueio de escrita na API e não vê botões de sync;
  - `anon` recebe `401` nas rotas protegidas;
- smoke documental atualizado em `scripts/smoke-google-calendar-homologacao.md`.

## Validação de payload e logs

- `reports/google-calendar-payload-privacy-check.md` atualizado;
- o payload continua sem:
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
- `google_calendar_sync_logs` continua sem token;
- `google_calendar_user_connections` fica sob RLS por `profile_id = auth.uid()`.

## Verificação técnica

- `npm run lint`: ok;
- `npm run build`: oscilação transitória de `.next` no Windows em execução isolada;
- `npm run verify`: ok, incluindo build completo.

## Situação da homologação OAuth

Google Calendar via OAuth manual está **preparado no código**, mas **a homologação real ainda está pendente** neste ambiente por falta de:

- envs OAuth preenchidas no runtime testado;
- sessão real de `admin/coordenacao` no app;
- execução do fluxo Google no navegador com retorno completo ao SEMEAR.

## Riscos restantes

- ausência de refresh token em algumas contas Google se o consentimento offline não for concedido;
- dependência de reconexão manual se a pessoa revogar o app fora do SEMEAR;
- sem webhook de retorno do Google;
- alterações feitas no Google continuam sem voltar automaticamente ao SEMEAR.

## Próximo tijolo recomendado

- homologação operacional assistida com ambiente configurado e execução ponta a ponta do OAuth real;
- depois disso, endurecer observabilidade de falhas de refresh e consolidar procedimento de reconexão para a coordenação.
