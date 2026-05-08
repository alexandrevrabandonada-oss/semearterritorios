# Homologação Google Calendar

## Objetivo

Validar a sincronização manual e auditável da agenda interna do SEMEAR com Google Calendar sem expor dados sensíveis.

## Pré-requisitos

- migration do Tijolo 056 aplicada;
- calendário institucional compartilhado criado;
- autenticação disponível por um destes caminhos:
  - service account com permissão de edição nesse calendário;
  - ou conexão OAuth de `admin/coordenacao` com acesso ao mesmo calendário;
- variáveis de ambiente preenchidas;
- ao menos um usuário com papel `admin` ou `coordenacao`;
- ao menos um evento interno criado em `/agenda`.

## Checklist de configuração real

1. Criar calendário institucional

- nome sugerido: `Agenda SEMEAR — Equipe`.

2. Compartilhar o calendário com o autenticador

- usar o e-mail configurado em `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`, se houver service account;
- ou garantir que a conta Google da coordenação/admin tenha permissão de editar esse calendário compartilhado.

3. Permissão mínima

- `fazer alterações em eventos`.

4. Configurar envs no ambiente

- `GOOGLE_CALENDAR_SYNC_ENABLED=true`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Se o modo service account estiver ativo:

- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

5. Redeploy

- após salvar envs, fazer novo deploy ou reiniciar o ambiente.

6. Regra de segurança

- nunca salvar private key em relatório, print, chat, issue ou commit.

## Roteiro de testes

1. Conectar calendário

- preencher `GOOGLE_CALENDAR_SYNC_ENABLED=true`;
- preencher `GOOGLE_CALENDAR_ID`;
- preencher `GOOGLE_OAUTH_CLIENT_ID`;
- preencher `GOOGLE_OAUTH_CLIENT_SECRET`;
- se houver service account, preencher `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`;
- fazer redeploy ou reiniciar a aplicação;
- abrir um evento em `/agenda/[id]`;
- se a service account nao estiver ativa, usar `Conectar Google Calendar` no bloco do evento.

2. Sincronizar evento simples

- clicar em `Sincronizar com Google`;
- confirmar status `Sincronizado`;
- confirmar preenchimento de `google_calendar_id`, `google_calendar_event_id` e `google_synced_at`;
- confirmar criação de log com ação `create`.

3. Atualizar data/hora

- editar o evento interno;
- clicar em `Atualizar evento Google`;
- confirmar ajuste no calendário externo;
- confirmar novo log com ação `update`.

4. Cancelar evento

- clicar em `Cancelar evento Google`;
- confirmar status `cancelled` no SEMEAR;
- confirmar que o evento aparece cancelado no Google;
- confirmar log com ação `cancel`.

5. Desvincular

- clicar em `Desvincular do Google`;
- confirmar que os campos `google_calendar_id` e `google_calendar_event_id` foram limpos;
- confirmar status `unlinked`;
- confirmar log com ação `unlink`.

6. Confirmar descrição segura

- abrir o evento no Google Calendar;
- validar que a descrição tem apenas resumo operacional;
- confirmar ausência de fala original, CPF, telefone, endereço pessoal, anexo e relatório semanal completo.

7. Confirmar logs

- abrir o histórico em `/agenda/[id]`;
- validar data, ação, status, mensagem e quem sincronizou;
- confirmar ausência de token e ausência de payload sensível completo.

8. Confirmar bloqueio de permissão

- acessar o mesmo evento com perfil `equipe`;
- validar que os botões de sincronização não aparecem;
- tentar chamar a API sem papel autorizado;
- confirmar resposta `403`.

9. Confirmar UX de reprocessamento

- provocar `sync_error` com ambiente inválido ou sync desabilitado;
- validar mensagem segura;
- validar botão `Tentar novamente`;
- validar orientação para conferir calendário institucional, conexão Google, envs e permissões.

## Resultado esperado

- sincronização manual funcional quando o ambiente estiver configurado;
- nenhuma sincronização automática;
- nenhum push;
- nenhum e-mail próprio;
- nenhum webhook;
- logs auditáveis preservados;
- SEMEAR continua como fonte principal.
