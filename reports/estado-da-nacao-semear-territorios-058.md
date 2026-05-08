# Estado da Nação — SEMEAR Territórios 058

## Diagnóstico

- o fluxo por service account ficou bloqueado por política do Google Cloud que impede gerar chave JSON;
- o calendário institucional já existe e o `GOOGLE_CALENDAR_ID` foi definido;
- a UI e a API de sync manual já existiam desde o Tijolo 056/057;
- faltava um caminho operacional para autenticar no Google Calendar sem depender da chave privada da service account.

## Adaptação implementada

- nova tabela `google_calendar_user_connections` com RLS por `profile_id = auth.uid()` e acesso só para `admin/coordenacao`;
- novo bloco server-side em `/api/google-calendar/connection` para registrar, consultar e remover a conexão OAuth sem expor token no frontend;
- `app/auth/callback/route.ts` agora também persiste `provider_token` e `provider_refresh_token` quando a conexão Google é iniciada pelo fluxo da agenda;
- `components/auth/google-calendar-connection-observer.tsx` atua como redundância no cliente para capturar os tokens retornados pelo Supabase OAuth;
- `lib/google-calendar/google-calendar-api.ts` passou a escolher entre:
  - service account institucional;
  - OAuth manual da coordenação/admin com refresh token, quando disponível.

## Interface

- `/agenda/[id]` agora mostra:
  - estado da autenticação ativa;
  - botão `Conectar Google Calendar` quando não houver service account disponível;
  - botão para remover a conexão OAuth salva no SEMEAR;
  - mensagens de erro e reprocessamento mais alinhadas a OAuth manual.

## Privacidade

- o payload sanitizado para o Google foi preservado;
- tokens continuam fora do frontend persistente e fora dos logs de sync;
- a tabela nova fica protegida por RLS individual e não concede acesso extra a eventos;
- o SEMEAR segue como fonte principal e o Google como espelho operacional.

## Validação

- `npm run lint`: ok;
- `npm run verify`: ok;
- `npm run build`: houve uma falha transitória de `ENOENT` em `.next` na primeira rodada, mas a execução dentro de `npm run verify` concluiu com sucesso.

## Pendências

- ainda faltam `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` no ambiente para refresh completo da conexão OAuth;
- quando esses envs estiverem preenchidos, a reconexão manual ficará mais estável entre sessões;
- a revogação do app Google na conta autorizadora continua sendo operação externa ao SEMEAR.
