# Integração com Google Calendar

## Diagnóstico do estado atual

- O login Google já existe no SEMEAR via Supabase OAuth.
- Esse login atual autentica a pessoa no sistema, mas não pede escopo de Google Calendar.
- O fluxo atual de `/login` usa apenas `provider: "google"` no Supabase, sem escopos extras no frontend.
- Os segredos do login Google ficam no painel do Supabase, não no repositório.
- O repositório não contém variáveis locais de Calendar já preenchidas.

Conclusão: a autenticação de acesso ao SEMEAR e a sincronização com Google Calendar são integrações separadas.

## Opção A — OAuth por usuário coordenação/admin

Como funciona:

- cada coordenação/admin autoriza a própria conta Google;
- os eventos são criados no calendário da pessoa ou em um calendário ao qual ela tenha acesso;
- exige escopo `https://www.googleapis.com/auth/calendar.events`;
- precisa guardar e renovar refresh token com cuidado.

Vantagens:

- rápida para piloto individual;
- dispensa conta institucional no início;
- útil quando ainda não existe calendário oficial do projeto.

Riscos:

- mistura operação institucional com calendário pessoal;
- aumenta a necessidade de revogar tokens individuais;
- dificulta continuidade quando a pessoa sai da operação;
- tende a espalhar eventos por calendários diferentes.

## Opção B — Calendário institucional compartilhado

Como funciona:

- o SEMEAR escreve em um calendário institucional compartilhado;
- a autenticação pode acontecer por service account server-side ou por OAuth manual da coordenação/admin;
- coordenação/admin acionam a sincronização manual dentro do SEMEAR;
- o sistema escreve apenas no calendário definido em `GOOGLE_CALENDAR_ID`.

Vantagens:

- mantém a operação centralizada;
- não depende de calendário pessoal da equipe;
- reduz leitura desnecessária de dados pessoais;
- simplifica auditoria e continuidade institucional.

Riscos:

- exige criar ou preparar um calendário institucional do SEMEAR;
- a credencial server-side ou o refresh token da coordenação precisam ser bem guardados no ambiente servidor;
- se o calendário for compartilhado de forma ampla demais, o risco operacional aumenta.

## Recomendação inicial

Usar **Opção B — calendário institucional compartilhado** sempre que possível.

Se ainda não houver calendário institucional disponível, a Opção A pode servir como contingência temporária. Mesmo assim, ela deve ser tratada como exceção operacional, não como desenho final.

## Abordagem adotada a partir do Tijolo 058

A integração agora mantém o **calendário institucional compartilhado** como destino, com duas formas seguras de autenticação:

- preferencial: service account server-side, quando a política do Google Cloud permitir a chave privada;
- contingência operacional: OAuth manual de `admin` ou `coordenacao`, com tokens salvos server-side em `google_calendar_user_connections`.

O fluxo segue com:

- sincronização manual;
- somente `admin` e `coordenacao`;
- chamada server-side;
- sem token persistido no frontend;
- sem webhook;
- sem leitura de calendário pessoal da equipe;
- sem service role no frontend;
- SEMEAR continua como fonte principal.

## Escopos mínimos

- `https://www.googleapis.com/auth/calendar.events`

Este escopo é suficiente para criar, atualizar e cancelar eventos no calendário operacional configurado.

## O que nunca sincronizar

- escutas;
- fala original;
- nome de entrevistado;
- CPF;
- telefone;
- endereço pessoal;
- anexos;
- relatório semanal completo;
- notas internas sensíveis;
- qualquer conteúdo que transforme o Google em cópia do banco interno.

## Revogação de acesso

No desenho institucional adotado:

- remover a permissão da service account no calendário compartilhado, se essa for a autenticação ativa;
- ou apagar a conexão OAuth salva em `google_calendar_user_connections` e revogar o app Google da pessoa autorizadora;
- girar a chave privada da service account no provedor, quando existir;
- apagar as variáveis do ambiente do app;
- manter os logs internos do SEMEAR para rastreabilidade.

## Variáveis esperadas

- `GOOGLE_CALENDAR_SYNC_ENABLED`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Variáveis opcionais para o modo institucional por service account:

- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Checklist operacional de configuração real

1. Criar um calendário institucional dedicado

- sugestão de nome: `Agenda SEMEAR — Equipe`.

2. Compartilhar esse calendário com quem vai autenticar

- service account institucional, se esse modo estiver disponível;
- ou a conta Google da coordenação/admin usada para conectar o calendário no SEMEAR.

3. Conceder a permissão mínima necessária

- `fazer alterações em eventos`.

4. Configurar as envs no ambiente hospedado

- `GOOGLE_CALENDAR_SYNC_ENABLED=true`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Se houver service account liberada pelo Google Cloud:

- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

5. Fazer redeploy

- sem redeploy, o runtime pode seguir sem enxergar a configuração nova.

6. Nunca registrar segredo fora do ambiente

- não colocar private key em commit;
- não colocar private key em screenshot;
- não colocar private key em relatório;
- não colocar private key em chat operacional.
- não colocar client secret OAuth em issue ou documentação pública.

## Drift e reprocessamento

- alterações feitas diretamente no Google não retornam automaticamente ao SEMEAR nesta versão;
- se o evento interno mudar depois do último sync, o SEMEAR deve ser tratado como origem e a sincronização manual deve ser refeita;
- em `sync_error`, a coordenação deve revisar envs, calendário institucional, conexão Google ativa e permissões de compartilhamento antes de tentar novamente.

## Regra permanente

O SEMEAR é a fonte principal.  
Google Calendar é apenas espelho operacional de lembrete.
