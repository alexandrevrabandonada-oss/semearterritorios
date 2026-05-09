# Agenda Coletiva da Equipe SEMEAR

## Conceito

A Agenda da Equipe é a camada interna de organização operacional do SEMEAR Territórios.

Ela existe para reunir, em um único lugar:

- ações de campo;
- bancas de escuta;
- reuniões;
- prazos de relatório semanal;
- devolutivas;
- dossiês;
- tarefas de memória;
- atividades gerais da equipe.

Não é uma agenda pública e não substitui Google Agenda.

## Tipos de evento

Os tipos disponíveis hoje são:

- `acao_campo`
- `banca_escuta`
- `reuniao`
- `relatorio_semanal`
- `devolutiva`
- `dossie`
- `memoria`
- `prazo`
- `outro`

## Quem pode criar

- Toda a equipe autenticada pode ler a agenda.
- `coordenacao` e `admin` podem criar, editar, cancelar e gerenciar participantes.
- Membros da equipe podem atualizar a própria presença quando tiverem `profile_id` vinculado em `team_members`.

Estar vinculado a um evento não concede acesso ao sistema.

## Como vincular ação

Existem dois caminhos:

1. Em `/acoes/nova`, coordenação/admin pode marcar a opção para criar um evento da agenda junto com a ação.
2. Em `/acoes/[id]`, a equipe pode abrir o atalho de agenda para criar ou consultar o evento vinculado.

Ao criar o evento a partir da ação, o sistema reaproveita:

- título da ação;
- território;
- vínculo com `action_id`;
- `starts_at`, `ends_at` e `all_day` da ação quando existirem;
- equipe participante já selecionada.

Nada é criado automaticamente sem confirmação no salvamento.

## Horários estruturados

O módulo de ações agora pode guardar:

- `action_date` como data legada de referência;
- `starts_at` como início estruturado;
- `ends_at` como fim estruturado;
- `all_day` para atividades sem horário específico.

Regras práticas:

- ações antigas continuam válidas mesmo sem horário;
- se a equipe ainda não souber o período, pode deixar horário pendente;
- se a atividade ocupar o dia todo, marque `all_day`.

## Geração assistida

Além do evento principal da ação, a ação pode sugerir novos eventos para:

- devolutiva;
- fechamento do dossiê;
- revisão das escutas;
- prazo de relatório semanal.

Essas sugestões apenas preenchem o formulário.
Nada é criado automaticamente.

## Como marcar presença

Cada participante do evento pode receber um status:

- convidado;
- confirmou;
- não vai;
- participou;
- faltou;
- sem resposta.

Esse registro serve para memória e acompanhamento interno.
Não é folha de ponto.

## Como usar para memória

Quando um evento estiver concluído:

- ele pode ser vinculado a um relatório semanal em `/memoria/novo`;
- ele pode ser associado a entradas de memória do projeto;
- o vínculo é manual e sempre confirmado pela equipe.

Também é possível abrir um evento concluído e seguir para:

- relatório semanal relacionado;
- entrada de memória relacionada.

## Diferença entre agenda interna e Google Agenda

Agenda interna:

- fica dentro do SEMEAR Territórios;
- respeita `profiles`, `team_members` e RLS do projeto;
- guarda vínculos com ações, memória e presença;
- é a fonte principal dos dados operacionais.

Google Agenda:

- funciona como espelho operacional de lembrete;
- recebe apenas resumo sanitizado;
- não devolve alterações automaticamente para o SEMEAR nesta versão;
- exige sincronização manual e auditável.

## Integração futura

O schema já foi preparado com campos opcionais para sincronização futura:

- `google_calendar_event_id`
- `google_calendar_id`
- `google_sync_status`
- `google_synced_at`

Esses campos não disparam integração por si só.

## Pré-requisitos para sincronizar com Google Calendar

Antes de pensar em sincronização externa, a base interna precisa estar consistente:

- ações precisam ter `starts_at` e `ends_at` ou então `all_day`;
- o evento precisa ter título claro e operacional;
- membros convidados externamente precisam ter e-mail no cadastro da equipe;
- qualquer sincronização deve depender de ação manual explícita;
- nunca sincronizar dado sensível;
- o Google Calendar deve receber apenas resumo operacional, sem fala original nem dados de entrevistados.

## Sincronização manual com Google Calendar

- o SEMEAR continua como fonte principal;
- o Google Calendar funciona apenas como espelho operacional de lembrete;
- apenas `admin` e `coordenacao` podem sincronizar;
- quando a service account institucional não estiver disponível, o SEMEAR pode usar OAuth manual da coordenação/admin para escrever no calendário institucional compartilhado;
- a sincronização acontece manualmente em `/agenda/[id]`;
- o payload externo é sanitizado antes de sair do sistema;
- não há webhook, push ou e-mail próprio neste fluxo;
- cada operação gera rastro em `google_calendar_sync_logs`.

## Estados de sincronização

- `nao sincronizado`: evento ainda não foi enviado ao Google;
- `sincronizado`: espelho externo está alinhado com a versão atual do SEMEAR;
- `erro de sincronizacao`: a última tentativa falhou e exige revisão;
- `cancelado no Google`: o evento foi cancelado no Google, mas continua no SEMEAR;
- `desvinculado`: o vínculo externo foi removido e o evento segue apenas no SEMEAR.

Quando houver edição local depois do último sync bem-sucedido, a tela pode mostrar `Alterações locais pendentes de sincronização`.

## Reconectar Google Calendar

Use `Reconectar Google Calendar` quando:

- a conta remover o consentimento;
- o refresh token estiver ausente;
- a conexão expirar;
- a UI indicar erro de autenticação ou refresh.

## Permissões de escrita no calendário

Antes de sincronizar:

- a conta conectada precisa ter permissão de edição no calendário institucional;
- `GOOGLE_CALENDAR_ID` precisa apontar para a agenda correta;
- a API Google Calendar precisa estar habilitada no projeto OAuth.

Se a conta não tiver permissão de edição, a UI deve orientar:

- compartilhar o calendário institucional com a conta conectada;
- conferir a documentação operacional;
- tentar novamente apenas depois do ajuste.

## Política de drift

- alterações feitas diretamente no Google Calendar não retornam automaticamente ao SEMEAR;
- se o evento mudar no SEMEAR, a equipe deve usar `Atualizar evento Google`;
- nunca usar o Google como fonte primária de edição do evento.

## Política de convites

- convites por e-mail ficam desativados por padrão;
- `google_send_invites` agora pode ser ativado ou desativado por evento;
- apenas `admin` e `coordenacao` podem alterar essa decisão;
- a política atual mantém `sendUpdates=none`, mesmo quando a flag estiver ativa;
- só `team_members.email` válidos e `active = true` podem entrar em `attendees`;
- entrevistados nunca devem ser convidados.

## Reprocessamento assistido

Quando houver `sync_error`, o evento passa a oferecer:

- botão `Tentar novamente`;
- botão `Reconectar Google Calendar`, quando necessário;
- botão `Desvincular do Google`, se o vínculo externo estiver inconsistente;
- link para a ajuda operacional.

## Painel de saúde

Existe um painel operacional em `/agenda/google/status` para coordenação/admin acompanhar:

- conexão ativa;
- refresh token presente;
- últimos erros;
- eventos com `sync_error`;
- eventos com alterações locais pendentes de sincronização.

## O que vai para o Google

- título prefixado com `[SEMEAR]`;
- tipo do evento;
- território agregado, quando existir;
- status operacional;
- horário ou dia inteiro;
- equipe participante apenas como nomes operacionais;
- link interno para o evento do SEMEAR.

## O que não vai para o Google

- escutas;
- fala original;
- dados de entrevistados;
- anexos;
- relatório semanal completo;
- notas internas sensíveis;
- telefone;
- CPF;
- endereço pessoal.

## Privacidade

Esta agenda é interna da equipe SEMEAR.

Nunca incluir:

- CPF;
- telefone;
- endereço pessoal;
- e-mail de entrevistado;
- nome identificável de pessoa escutada;
- qualquer dado sensível desnecessário.
