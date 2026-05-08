# Smoke de Papéis — Google Calendar

## Pré-condição OAuth manual

- confirmar `GOOGLE_CALENDAR_SYNC_ENABLED=true`;
- confirmar `GOOGLE_CALENDAR_ID`;
- confirmar `GOOGLE_OAUTH_CLIENT_ID`;
- confirmar `GOOGLE_OAUTH_CLIENT_SECRET`;
- abrir `/agenda/[id]`;
- se não houver service account ativa, usar `Conectar Google Calendar` antes dos testes de sync.

Usar este roteiro quando não for possível automatizar todos os testes de papel no ambiente de homologação.

## Admin

- abrir `/agenda/[id]`;
- confirmar presença dos botões:
  - `Sincronizar com Google`
  - `Atualizar evento Google`
  - `Cancelar evento Google`
  - `Desvincular do Google`
- executar sync manual;
- confirmar resposta bem-sucedida ou erro controlado.

## Coordenação

- repetir o mesmo fluxo do admin;
- confirmar que a coordenação também consegue acionar a sincronização manual.

## Equipe

- abrir o mesmo evento;
- confirmar que o status do Google aparece;
- confirmar que os botões de sincronização não aparecem;
- tentar chamar `POST /api/google-calendar/sync-event`;
- confirmar `403`.

## Anon

- tentar acessar a página sem sessão válida;
- confirmar bloqueio pelo fluxo normal do app;
- tentar chamar a API sem sessão;
- confirmar `401`.

## Critério de aprovação

- apenas `admin` e `coordenacao` sincronizam;
- `equipe` apenas visualiza;
- `anon` não acessa o fluxo protegido.
- se a conexão OAuth expirar, a tela oferece `Reconectar Google Calendar` sem expor token.
