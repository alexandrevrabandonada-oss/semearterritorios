# Estado da Nação — SEMEAR Territórios 056

## Diagnóstico inicial

- `team_calendar_events` e `team_calendar_event_members` já existiam e estavam operacionais.
- `actions` já tinha `starts_at`, `ends_at` e `all_day` desde o Tijolo 055.
- O login Google existente no projeto é apenas o OAuth do Supabase para autenticação de acesso.
- O fluxo atual de `/login` não pede escopo de Google Calendar no frontend.
- Não havia tabela de auditoria para sincronização externa.
- Não havia rota server-side para sincronização manual com Google Calendar.
- O repositório local não tinha variáveis de ambiente de Calendar preenchidas.

## Abordagem escolhida

Abordagem adotada: **calendário institucional compartilhado com service account server-side**.

Justificativa:

- evita depender de calendário pessoal da equipe;
- mantém a operação coletiva centralizada;
- reduz leitura desnecessária de calendário pessoal;
- simplifica auditoria e revogação;
- separa autenticação do SEMEAR e integração operacional com Google Calendar.

Fallback documentado:

- OAuth por usuário coordenação/admin continua descrito em documentação como alternativa temporária, mas não foi o desenho implementado neste tijolo.

## Migrations criadas

- `supabase/migrations/20260508190000_add_google_calendar_sync_logs.sql`

Conteúdo principal:

- criação de `google_calendar_sync_logs`;
- índices por evento, data e usuário;
- default de `team_calendar_events.google_sync_status = not_synced`;
- constraint para status:
  - `not_synced`
  - `synced`
  - `sync_error`
  - `cancelled`
  - `unlinked`
- RLS:
  - leitura para equipe autenticada;
  - inserção apenas para `admin` e `coordenacao`;
  - `anon` sem acesso.

## Rotas e API criadas

- `POST /api/google-calendar/sync-event`

Fluxo:

- valida sessão;
- valida papel `admin` ou `coordenacao`;
- carrega evento interno e participantes;
- sanitiza payload;
- chama Google Calendar somente no servidor;
- atualiza status em `team_calendar_events`;
- registra log em `google_calendar_sync_logs`;
- retorna resposta segura, sem token.

## Sanitização implementada

Arquivo:

- `lib/google-calendar/sanitize-calendar-event.ts`

Regras aplicadas:

- título sai como `[SEMEAR] + título`;
- descrição contém apenas resumo operacional;
- inclui tipo, território agregado, status, equipe participante e link interno;
- não inclui fala original;
- não inclui dados de entrevistados;
- não inclui anexos;
- não inclui relatório semanal completo;
- não inclui telefone, CPF ou endereço pessoal.

## Cliente Google implementado

Arquivo:

- `lib/google-calendar/google-calendar-api.ts`

Capacidades:

- autenticação por service account;
- geração de JWT server-side;
- obtenção de access token via Google OAuth token endpoint;
- criação, atualização e cancelamento de evento com `sendUpdates=none`.

Variáveis esperadas:

- `GOOGLE_CALENDAR_SYNC_ENABLED`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Botões criados

Em `/agenda/[id]`:

- `Sincronizar com Google`
- `Atualizar evento Google`
- `Cancelar evento Google`
- `Desvincular do Google`

Também foi adicionado:

- status atual;
- último sync;
- id do calendário;
- id do evento Google;
- aviso sobre membros sem e-mail;
- histórico de sincronização.

Em `/acoes/[id]`:

- status de Google Calendar por evento vinculado;
- reforço para sincronizar pelo evento da agenda, evitando lógica duplicada.

## Logs criados

Tabela:

- `google_calendar_sync_logs`

Campos usados:

- evento;
- ação;
- status;
- ids do Google;
- mensagem;
- resumo do payload;
- quem sincronizou;
- quando sincronizou.

## Documentação criada/atualizada

Criados:

- `docs/google-calendar-integracao.md`
- `docs/homologacao-google-calendar.md`

Atualizados:

- `docs/agenda-coletiva-equipe.md`
- `docs/planejamento-google-calendar.md`
- `/ajuda`

## Google Calendar ficou funcional ou apenas preparado?

Resultado:

- a sincronização manual ficou **implementada de forma funcional no código**;
- a operação real depende de configurar as credenciais institucionais no ambiente;
- como o ambiente local atual não possui essas credenciais preenchidas, a homologação contra a API real do Google **não foi executada aqui**;
- se o ambiente não estiver configurado, a API responde erro controlado e registra `sync_error`.

## Testes feitos

Executados:

- `npm run lint`
- `npm run build`
- `npm run verify`

Resultado:

- todos passaram.

Limite da validação:

- não houve teste real de criação/atualização/cancelamento no Google porque as credenciais institucionais não estão presentes neste ambiente local.

## Confirmação de privacidade

- payload externo é sanitizado;
- não há token no frontend;
- logs não armazenam segredo;
- Google continua sendo espelho operacional;
- não há webhook;
- não há push;
- não há e-mail próprio;
- não há sincronização automática em massa;
- não há leitura de calendário pessoal da equipe.

## Riscos restantes

- sem credenciais institucionais configuradas, a sincronização real não pode ser homologada;
- nomes da equipe ainda podem exigir revisão humana antes de convite por e-mail em contextos sensíveis;
- alterações feitas diretamente no Google não retornam automaticamente ao SEMEAR nesta versão;
- ainda não existe fluxo de rotação assistida de credenciais dentro do produto.

## Próximo tijolo recomendado

Tijolo 057:

- homologação real com calendário institucional;
- refinamento de convites por e-mail para equipe;
- prevenção explícita de drift entre Google e SEMEAR;
- revisão final de UX para sincronização, erro e reprocessamento.
