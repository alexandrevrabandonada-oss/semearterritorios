# Smoke Assistido de Refresh do Google Calendar

## Objetivo

Executar um roteiro operacional curto para verificar reconexão, presença de refresh token e reprocessamento seguro sem expor segredo.

## Quem executa

- `admin`
- `coordenacao`

## Checklist

1. Confirmar que a conexão Google ativa aparece em `/agenda/google/status`.
2. Confirmar que há `refresh token presente`.
3. Escolher um evento interno de teste em `/agenda/[id]`.
4. Verificar a prévia do payload sanitizado.
5. Executar `Atualizar evento Google` ou `Sincronizar com Google`.
6. Confirmar `sync success`.
7. Confirmar no histórico que não apareceu token.
8. Confirmar no relatório de privacidade que o payload segue sem dado sensível.

## Se aparecer erro

- `refresh token ausente`
  Reconectar Google Calendar com consentimento offline.
- `refresh revogado`
  Reconectar a conta Google.
- `permissão insuficiente`
  Conferir compartilhamento do calendário institucional.
- `calendar not found`
  Conferir `GOOGLE_CALENDAR_ID` e acesso da conta.
- `rate limit`
  Aguardar e repetir manualmente.

## O que nunca fazer

- nunca copiar token para chat, log ou relatório;
- nunca testar com dado sensível no evento;
- nunca usar e-mail livre como convidado;
- nunca convidar entrevistados.
