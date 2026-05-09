# Integração com Google Calendar

## Princípio central

O SEMEAR é a fonte principal dos eventos internos.  
O Google Calendar funciona apenas como espelho operacional de lembrete.

## Modelo atual

- sincronização manual por evento;
- restrita a `admin` e `coordenacao`;
- conexão OAuth manual por usuário autorizado;
- persistência server-side da conexão;
- trilha de auditoria em `google_calendar_sync_logs`;
- payload sanitizado antes de qualquer envio externo.

## Por que a integração é separada do login do SEMEAR

O login Google do SEMEAR autentica a pessoa no sistema.  
A sincronização com Google Calendar exige escopo adicional de agenda e, por isso, é tratada como uma conexão operacional separada.

## O que vai para o Google

- título operacional com prefixo `[SEMEAR]`;
- tipo do evento;
- status operacional;
- território agregado, quando houver;
- participantes com e-mail válido, quando aplicável;
- data e horário;
- link interno para o evento no SEMEAR;
- aviso de que dados sensíveis continuam apenas no SEMEAR.

## O que não vai para o Google

- escutas;
- fala original;
- relatórios completos;
- anexos;
- dados de entrevistados;
- telefone;
- CPF;
- endereço pessoal;
- qualquer nota sensível.

## Estados operacionais do sync

- `Não sincronizado`
- `Sincronizado`
- `Erro de sincronização`
- `Cancelado no Google`
- `Desvinculado`

Quando houver alteração local depois de um sync bem-sucedido, a UI pode mostrar `Alterações locais pendentes de sincronização`.

## Erros operacionais mais comuns

- API Google Calendar desabilitada;
- calendário institucional não encontrado;
- conta conectada sem permissão de edição;
- conexão expirada ou revogada;
- refresh token ausente;
- limite temporário de uso do Google;
- evento externo já removido no Google.

Esses erros devem aparecer na UI apenas com mensagem segura e recomendação de ação, sem expor token, segredo ou resposta bruta do Google.

## Reconexão

Use `Reconectar Google Calendar` quando:

- a conta remover o consentimento;
- o refresh token for revogado;
- o access token não puder mais ser renovado;
- a UI indicar erro de autenticação ou refresh.

## Política de drift

- Alterações feitas diretamente no Google Calendar não retornam automaticamente ao SEMEAR.
- Nesta versão não existe webhook de retorno do Google.
- Se o evento precisar mudar, a alteração deve ser feita primeiro no SEMEAR e depois reenviada manualmente.

## Política de convites

- convites por e-mail continuam desativados por padrão;
- o campo `google_send_invites` existe apenas como preparação futura;
- a recomendação atual é manter o calendário institucional como destino único, evitando spam e duplicidade operacional.

## Limites mantidos

- sem push notification;
- sem envio de e-mail próprio;
- sem sincronização automática de todos os eventos;
- sem leitura ampla de calendários pessoais;
- sem uso de `service_role` no frontend;
- sem enfraquecimento de RLS.
