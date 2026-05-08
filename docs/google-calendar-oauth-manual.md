# Google Calendar OAuth Manual

## Objetivo

Homologar o fluxo de conexão manual do Google Calendar por `admin` e `coordenacao`, mantendo o calendário institucional como destino e o SEMEAR como fonte principal.

## Checklist Google Cloud

1. Calendar API habilitada

- confirmar que a `Google Calendar API` está ativa no projeto.

2. OAuth Client ID

- tipo: `Aplicativo da Web`;
- nome operacional claro;
- client secret guardado apenas no ambiente seguro.

3. Authorized JavaScript origins

- incluir o domínio do app em produção;
- incluir `http://localhost:3000` se houver homologação local.

4. Authorized redirect URIs

- incluir o callback do Supabase Auth:
  - `https://SEU-PROJETO.supabase.co/auth/v1/callback`

5. Tela de consentimento OAuth

- branding configurado;
- escopos revisados;
- usuários de teste adicionados se o app estiver em modo teste.

6. Usuários de teste

- se o app estiver em `Testing`, adicionar os e-mails reais de coordenação/admin que vão conectar o Google Calendar.

## Checklist Supabase

1. Provider Google ativo

- `Authentication > Providers > Google` habilitado.

2. Client ID e Client Secret

- preenchidos no provider Google do Supabase;
- sem registrar os valores em repositório ou documentação.

3. Redirect URLs

- URLs do app e callback do auth conferidas no Supabase.

4. Escopos adicionais

- o fluxo de `Conectar Google Calendar` deve pedir:
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/calendar.events`

5. Offline consent

- quando necessário para refresh token:
  - `access_type=offline`
  - `prompt=consent`

## Checklist do ambiente

- `GOOGLE_CALENDAR_SYNC_ENABLED=true`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## Regras de segurança

- nunca registrar valores reais de client secret;
- nunca imprimir token OAuth em log;
- nunca salvar token OAuth em relatório;
- nunca enviar escutas, fala original, anexos ou dados sensíveis ao Google Calendar.

## Limites conhecidos

- sem webhook de retorno do Google;
- alterações feitas direto no Google não voltam automaticamente para o SEMEAR;
- se o refresh token não vier ou expirar, a coordenação precisa reconectar manualmente;
- revogação externa do app continua sendo feita na Conta Google da pessoa autorizadora.
