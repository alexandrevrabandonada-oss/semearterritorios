# Teste de Refresh do Google Calendar

## Objetivo

Validar o comportamento de renovação da conexão OAuth manual sem expor tokens no frontend, em logs ou em relatórios.

## Pré-condições

- conexão Google ativa em `google_calendar_user_connections`;
- `refresh_token` presente;
- `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` configurados;
- evento interno disponível em `/agenda/[id]`;
- painel `/agenda/google/status` acessível para conferência operacional.

## Checklist manual

1. Conectar Google Calendar com `access_type=offline` e `prompt=consent`.
2. Confirmar no banco que existe `refresh_token` para o `profile_id` autorizado.
3. Executar uma sincronização manual e confirmar sucesso.
4. Forçar um cenário que exija renovação do access token.
5. Executar novo `create` ou `update`.
6. Confirmar que:
   - a renovação ocorreu server-side;
   - o sync foi concluído com sucesso;
   - o novo access token, se retornado, substituiu o token anterior;
   - o `refresh_token` foi preservado ou rotacionado conforme resposta do Google;
   - nenhum token apareceu em UI, log ou relatório.

## Sinais esperados

- `google_calendar_user_connections.updated_at` atualizado após refresh;
- `google_calendar_sync_logs` com `success` ou `error` apenas com mensagem segura;
- `/agenda/[id]` sem exibir token bruto.

## Se o refresh token estiver ausente

Tratar como pendência operacional:

- mostrar recomendação para `Reconectar Google Calendar`;
- registrar a situação no painel de saúde;
- repetir o consentimento com `offline`;
- não tentar contornar no frontend;
- não salvar segredo em relatório.
