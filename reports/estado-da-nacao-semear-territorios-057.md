# Estado da Nação — SEMEAR Territórios 057

## Diagnóstico inicial

- a API `POST /api/google-calendar/sync-event` já existia;
- `google_calendar_sync_logs` já existia e estava ligada ao fluxo de sync manual;
- a sanitização do payload já existia;
- a UI de `/agenda/[id]` já mostrava status e botões de sync;
- a UI de `/acoes/[id]` já mostrava o status do Google Calendar do evento vinculado.

## Envs presentes ou ausentes

Verificação feita neste ambiente local, sem imprimir valores:

- `GOOGLE_CALENDAR_SYNC_ENABLED`: ausente
- `GOOGLE_CALENDAR_ID`: ausente
- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`: ausente
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: ausente

Conclusão:

- a homologação real contra Google Calendar institucional não pôde ser executada neste ambiente porque as credenciais não estão configuradas aqui.

## Calendário compartilhado ou não

Não foi possível confirmar compartilhamento real do calendário institucional a partir deste ambiente, porque:

- não há `GOOGLE_CALENDAR_ID` configurado;
- não há `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` configurado;
- portanto não há como validar chamada real ao Google nem permissão da service account.

## Melhorias implementadas no Tijolo 057

- mensagens de erro do Google foram sanitizadas para não expor resposta bruta nem segredo;
- o backend agora retorna `reprocess_hint` seguro em erros de configuração/permissão;
- o payload passou a convidar apenas e-mails válidos;
- `/agenda/[id]` ganhou UX de reprocessamento para `sync_error`;
- `/agenda/[id]` ganhou aviso explícito de fonte principal e de drift;
- `/agenda/[id]` passou a marcar `Alterações locais ainda não sincronizadas` quando o evento interno muda após o último sync;
- documentação de configuração real foi ampliada;
- foi criado smoke documental de papéis;
- foi criado relatório específico de privacidade do payload.

## Teste create

Resultado neste ambiente:

- não executado contra Google real.

Motivo:

- envs institucionais ausentes.

Estado do fluxo:

- o código está pronto para criar evento quando as envs existirem;
- se o ambiente continuar sem configuração, o sistema responde erro controlado e registra `sync_error`.

## Teste update

Resultado neste ambiente:

- não executado contra Google real.

Motivo:

- envs institucionais ausentes.

Estado do fluxo:

- a rota continua preparada para atualizar evento já vinculado;
- a UI mostra reprocessamento e alerta de drift.

## Teste cancel

Resultado neste ambiente:

- não executado contra Google real.

Motivo:

- envs institucionais ausentes.

Estado do fluxo:

- o código mantém cancelamento manual via API Google;
- o evento interno do SEMEAR permanece preservado por desenho.

## Teste unlink

Resultado neste ambiente:

- não executado com evento Google real.

Observação:

- a lógica de desvinculação no SEMEAR permanece funcional em código e limpa os campos externos do evento interno.

## Teste de erro controlado

Resultado:

- validado por diagnóstico local de envs ausentes e pelo código da rota.

Comportamento esperado agora:

- resposta segura;
- `google_sync_status = sync_error`;
- log `error` criado;
- mensagem sem token;
- mensagem sem private key;
- orientação de reprocessamento exibida na interface.

## Teste de reprocessamento

Resultado:

- implementado em `/agenda/[id]`.

Comportamento:

- quando `google_sync_status = sync_error`, a tela mostra:
  - motivo seguro;
  - orientação para conferir calendário institucional, envs e compartilhamento;
  - botão `Tentar novamente`;
  - botão `Desvincular` quando houver id externo.

## Teste de papéis

Resultado neste ambiente:

- validado parcialmente por inspeção do código e pela UI;
- smoke documental criado em `scripts/smoke-google-calendar-homologacao.md`.

Estado esperado:

- `admin` sincroniza;
- `coordenacao` sincroniza;
- `equipe` não sincroniza;
- `anon` sem acesso.

## Validação do payload

Relatório criado:

- `reports/google-calendar-payload-privacy-check.md`

Confirmações:

- não envia fala original;
- não envia escutas;
- não envia dados de entrevistados;
- não envia anexos;
- não envia relatório semanal completo;
- não envia CPF, telefone ou endereço pessoal;
- não envia token;
- não envia private key.

## Validação dos logs

Por inspeção do schema e do fluxo:

- logs registram `create`, `update`, `cancel`, `unlink` e `error`;
- logs registram `synced_by` e `synced_at`;
- `payload_summary` é sanitizado;
- nenhum segredo é persistido por desenho do código atual.

## Confirmação de privacidade

- SEMEAR continua fonte principal;
- Google continua espelho operacional;
- sem push;
- sem webhook;
- sem e-mail próprio;
- sem leitura de calendário pessoal;
- sem service account no frontend;
- sem segredo em documentação criada neste tijolo.

## Google Calendar está homologado ou pendente?

Status atual:

- **pendente de homologação real neste ambiente**.

Motivo:

- envs institucionais ausentes impedem o teste real de create, update, cancel e validação externa do calendário compartilhado.

Ao mesmo tempo:

- a base técnica, a UX de reprocessamento, a proteção de privacidade e a documentação operacional ficaram prontas para a homologação assim que o ambiente receber as credenciais corretas.

## Riscos restantes

- ainda falta executar o ciclo real contra o calendário institucional;
- o badge de drift é uma heurística simples baseada em `updated_at` versus `google_synced_at`;
- convites dependem da qualidade de `team_members.email`;
- ainda não existe retorno automático do Google para o SEMEAR, por decisão explícita deste estágio.

## Próximo tijolo recomendado

Tijolo 058:

- executar homologação real em ambiente com envs configuradas;
- registrar evidência segura de create/update/cancel/unlink;
- revisar convites por e-mail com base em operação real;
- ajustar qualquer detalhe fino de drift e reprocessamento após o primeiro uso institucional.
