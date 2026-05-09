# Estado da Nação 061

## Escopo

Endurecimento operacional pós-homologação do Google Calendar na Agenda da Equipe.

## Diagnóstico inicial

Antes deste tijolo, o SEMEAR já tinha:

- `/agenda`, `/agenda/novo` e `/agenda/[id]` publicados;
- sincronização manual homologada com Google Calendar via OAuth de `admin` e `coordenacao`;
- `create`, `update`, `cancel` e `unlink` reais aprovados;
- `google_calendar_sync_logs` funcionando;
- payload sanitizado e sem dado sensível;
- conexão OAuth persistida server-side.

Riscos abertos:

- evento de homologação de teste com título sujo;
- mensagens de erro ainda genéricas em parte do fluxo;
- necessidade de checagem explícita de pré-condições e permissão de escrita;
- política de convites ainda indefinida;
- histórico de sync ainda sem exibir resumo sanitizado do payload;
- necessidade de documentação dedicada para refresh token e drift.

## Correção do evento de homologação

Evento de teste localizado:

- `037297bc-638c-4720-acff-eb12578c75fc`

Correção aplicada diretamente no banco remoto:

- título anterior: `Homologação OAuth Google Calendar — SEMEAHomologacao OAuth Google Calendar - SEMEAR atualizado`
- título atual: `Homologação Google Calendar — SEMEAR`

Observação:

- a correção afetou apenas o evento de teste de homologação;
- nenhum evento operacional real foi alterado.

## Melhorias de erro

Foi criada a camada:

- `lib/google-calendar/google-calendar-errors.ts`

Ela transforma erro técnico em:

- código interno;
- mensagem segura para UI;
- recomendação de ação;
- sinalização para reconexão, permissão ou revisão de setup.

Casos tratados:

- sync desabilitado;
- calendário institucional ausente;
- Google Calendar API desabilitada;
- calendário não encontrado;
- conta sem permissão de edição;
- conexão OAuth ausente;
- refresh token ausente;
- refresh token revogado;
- token expirado;
- quota/rate limit;
- evento externo não encontrado;
- falha de rede.

## Melhorias de permissão

Antes de `create`, `update` e `cancel`, a rota agora valida:

- sync habilitado;
- `GOOGLE_CALENDAR_ID` configurado;
- conexão Google ativa quando não houver service account;
- token de acesso disponível para a conta autorizada.

Quando o Google responder falta de escrita, a UI passa a orientar:

- compartilhar o calendário institucional com permissão de edição;
- revisar a documentação operacional;
- reconectar quando o problema for de autorização expirada.

## UX de reconexão

Melhorias aplicadas em `/agenda/[id]`:

- botão explícito `Reconectar Google Calendar`;
- mensagens seguras para refresh expirado, revogação ou ausência de refresh token;
- atalho para ajuda/configuração;
- bloco de `sync_error` com recomendação de ação em linguagem operacional.

## Política de drift

Permanece explícito na UI e na documentação:

- o SEMEAR é a fonte principal;
- o Google é espelho operacional;
- alterações feitas diretamente no Google não retornam automaticamente ao SEMEAR nesta versão.

Além disso, a tela reforça:

- `Sincronizado`
- `Alterações locais pendentes de sincronização`
- `Erro de sincronização`
- `Desvinculado`
- `Cancelado no Google`

## Teste de refresh

Foi criado:

- `docs/teste-refresh-google-calendar.md`

Conteúdo:

- checklist manual para testar renovação do access token;
- confirmação de preservação ou rotação segura do refresh token;
- exigência de não expor token em log, frontend ou relatório.

## Política de convites

Foi criado:

- `docs/politica-convites-google-calendar.md`

Decisão recomendada:

- convites por e-mail desativados por padrão;
- calendário institucional como destino único neste estágio;
- eventual ativação futura apenas por evento, sem campo livre de e-mail e sem convidar entrevistados.

## Flag para convites

Migration criada:

- `supabase/migrations/20260508234500_add_google_send_invites_to_team_calendar_events.sql`

Campo adicionado:

- `team_calendar_events.google_send_invites boolean default false`

Situação:

- apenas preparação de schema;
- não ativa envio automático;
- não altera a política atual de `sendUpdates=none`.

## Melhorias no histórico de sync

`/agenda/[id]` agora mostra no histórico:

- ação;
- status;
- data;
- usuário;
- mensagem segura;
- resumo sanitizado do payload.

Sem exibir:

- token;
- segredo;
- resposta bruta do Google;
- dado sensível.

## Validação de privacidade

Relatório atualizado:

- `reports/google-calendar-payload-privacy-check.md`

Confirmação mantida:

- sem fala original;
- sem escutas;
- sem dados de entrevistados;
- sem anexos;
- sem relatório semanal completo;
- sem CPF;
- sem telefone;
- sem endereço pessoal;
- sem dado de saúde individual;
- sem access token;
- sem refresh token;
- sem private key;
- sem client secret.

## Teste de papéis

Confirmações mantidas por regra implementada e fluxo homologado:

- `admin` sincroniza;
- `coordenacao` sincroniza;
- `equipe` não sincroniza;
- `anon` sem acesso;
- equipe pode ver status e histórico sem executar sync.

Observação:

- neste tijolo não foi reexecutado smoke manual completo para `anon` e `equipe`;
- o bloqueio permanece sustentado por checagem de papel na API e pela UI sem botões operacionais para perfis não autorizados.

## Documentação atualizada

- `docs/google-calendar-oauth-manual.md`
- `docs/google-calendar-integracao.md`
- `docs/homologacao-google-calendar.md`
- `docs/agenda-coletiva-equipe.md`
- `docs/teste-refresh-google-calendar.md`
- `docs/politica-convites-google-calendar.md`

Também foi atualizada a ajuda interna em:

- `app/ajuda/page.tsx`

## Confirmações de escopo

Continuam fora desta entrega:

- push notification;
- webhook de retorno do Google;
- envio de e-mail próprio;
- sincronização automática em massa;
- leitura ampla de calendário pessoal;
- sincronização de dado sensível.

## Riscos restantes

1. O caminho por service account continua pendente de política do Google Cloud para geração de chave.
2. Alterações feitas diretamente no Google continuam sem retorno automático ao SEMEAR.
3. Convites por e-mail seguem apenas preparados, não operacionalizados.
4. Teste de rotação real do refresh token ainda depende de novo ciclo manual controlado.

## Próximo tijolo recomendado

`Tijolo 062 — Governança de Convites e Operação Assistida de Reprocessamento`

Foco sugerido:

- decisão final sobre convites por evento;
- ativação opcional e segura de `google_send_invites`;
- smoke assistido de refresh/rotação;
- painel mais claro para erros recorrentes e reconexão da coordenação.
