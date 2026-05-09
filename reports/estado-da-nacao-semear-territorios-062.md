# Estado da Nação 062

## Escopo

Governança de convites por evento, operação assistida de reprocessamento e painel de saúde do Google Calendar.

## Diagnóstico inicial

O Tijolo 061 deixou a integração mais segura, com:

- mensagens de erro operacionais;
- reconexão assistida;
- política de drift explícita;
- `google_send_invites` criado e default `false`;
- histórico com `payload_summary` sanitizado;
- política de convites documentada;
- Google Calendar mantido como espelho operacional.

Riscos ainda abertos:

- convites sem governança operacional visível por evento;
- reprocessamento ainda muito dependente de tentativa manual;
- ausência de um painel consolidado de saúde;
- smoke assistido de refresh ainda disperso em documentação;
- drift sem webhook reverso continua sendo limitação estrutural.

## Governança de convites implementada

Em `/agenda/[id]` foi criada a seção `Convites por e-mail`, com:

- status atual por evento;
- microcopy de privacidade e governança;
- ativação/desativação apenas para `admin` e `coordenacao`;
- padrão mantido em `false`.

Mensagem central:

- convites são opcionais;
- só devem ser usados para membros da equipe com e-mail cadastrado;
- entrevistados nunca devem ser convidados;
- mesmo com convites ativados, o Google recebe apenas resumo operacional sanitizado.

## Regra de attendees

Somente entram em `attendees`:

- membros vinculados ao evento;
- `team_members.active = true`;
- `team_members.email` válido;
- sem uso de campo livre de e-mail.

Tratamento adicional:

- membros sem e-mail aparecem em aviso;
- membros inativos são explicitamente excluídos dos convites;
- a ausência de e-mail não bloqueia a sincronização.

## Política de sendUpdates

Decisão operacional do Tijolo 062:

- `google_send_invites = false`
  - sem attendees no payload;
  - `sendUpdates=none`.
- `google_send_invites = true`
  - attendees válidos entram no payload;
  - `sendUpdates=none` continua ativo nesta versão.

Resultado:

- a governança por evento já existe;
- o SEMEAR ainda não dispara e-mail automático;
- não há risco de spam acidental por ativação local.

## Preview do payload

`/agenda/[id]` agora mostra uma prévia segura do que será enviado ao Google:

- título;
- descrição sanitizada;
- data/hora;
- local coletivo ou território;
- convidados preparados, quando `google_send_invites = true`;
- membros sem e-mail;
- aviso de privacidade.

Não aparecem:

- token;
- resposta bruta;
- escutas;
- fala original;
- anexos;
- relatório interno.

## Reprocessamento assistido

Foi criado:

- `components/agenda/google-calendar-retry-panel.tsx`

Esse painel aparece em `sync_error` e oferece:

- tipo de erro seguro;
- recomendação operacional;
- `Tentar novamente`;
- `Reconectar Google Calendar`, quando necessário;
- `Desvincular do Google`, quando existir vínculo inconsistente;
- link para ajuda.

## Smoke de refresh

Foram consolidados:

- `docs/teste-refresh-google-calendar.md`
- `docs/smoke-assistido-refresh-google-calendar.md`

Esses materiais cobrem:

- conexão ativa;
- refresh token presente;
- evento de teste selecionado;
- update seguro;
- validação de ausência de token em log;
- confirmação de payload sanitizado.

## Painel de saúde

Foi criada a rota:

- `/agenda/google/status`

Dados operacionais exibidos:

- sync habilitado;
- conexão ativa do usuário atual;
- refresh token presente;
- último sync bem-sucedido;
- últimos erros;
- eventos com `sync_error`;
- eventos com alterações locais pendentes;
- eventos sincronizados;
- eventos cancelados;
- eventos desvinculados.

## Drift operacional

O estado `Alterações locais pendentes de sincronização` foi mantido e reforçado com:

- status operacional mais claro em `/agenda/[id]`;
- botão `Atualizar evento Google`;
- painel de saúde mostrando eventos com drift local pendente.

Limitação mantida:

- alterações feitas diretamente no Google não voltam automaticamente ao SEMEAR;
- nenhum webhook foi criado.

## Melhorias de logs

`payload_summary` agora passa a registrar também:

- `attendees_count`;
- `google_send_invites`;
- `inactive_members`;
- `members_without_email`;
- além de título, tipo e datas já sanitizados.

Sem incluir:

- tokens;
- secrets;
- descrição sensível bruta.

## Validação de privacidade

O relatório `reports/google-calendar-payload-privacy-check.md` foi atualizado e confirma:

- entrevistados nunca entram em `attendees`;
- e-mails vêm apenas de `team_members.email`;
- não existe e-mail livre;
- anexos não entram;
- relatórios semanais não entram;
- escutas não entram;
- fala original não entra;
- tokens não entram em logs.

## Teste de papéis

Confirmado por regra implementada:

- `admin` ativa/desativa convites;
- `coordenacao` ativa/desativa convites;
- `equipe` não ativa convites;
- `equipe` não sincroniza;
- `anon` sem acesso;
- equipe segue podendo ver status e histórico do evento, sem ação sensível.

## Documentação atualizada

- `docs/politica-convites-google-calendar.md`
- `docs/google-calendar-oauth-manual.md`
- `docs/homologacao-google-calendar.md`
- `docs/agenda-coletiva-equipe.md`
- `docs/teste-refresh-google-calendar.md`
- `docs/smoke-assistido-refresh-google-calendar.md`
- `app/ajuda/page.tsx`

## Confirmações de escopo

Continuam fora desta entrega:

- push notification;
- webhook de retorno do Google;
- envio de e-mail próprio;
- sincronização automática em massa;
- leitura ampla de calendário pessoal;
- sincronização de escutas, anexos ou dados sensíveis.

## Riscos restantes

1. A política de convites segue conservadora e ainda não envia updates reais, por decisão de segurança.
2. O caminho por service account continua pendente de política do Google Cloud.
3. A rotação real de refresh token ainda depende de smoke manual controlado.
4. O drift reverso continua sem retorno automático, já que não há webhook.

## Próximo tijolo recomendado

`Tijolo 063 — Observabilidade Operacional e Smoke Guiado de Refresh/Reconexão`

Foco sugerido:

- registrar métricas mais claras de erro recorrente;
- guiar refresh/reconexão com fluxo operacional mais assistido;
- decidir, com governança, se convites podem evoluir além de `sendUpdates=none`.
