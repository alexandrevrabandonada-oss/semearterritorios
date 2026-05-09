# Central de Avisos Internos

## Conceito

A Central de Avisos do SEMEAR Territórios organiza pendências operacionais dentro do próprio app.

Escopo deste tijolo:

- avisos internos somente;
- sem push notification;
- sem envio de e-mail;
- sem webhook externo;
- sem publicação pública automática.

Confira também: [Orquestração de Avisos (Tijolo 064)](/docs/orquestracao-avisos-internos.md) - Camada de inteligência e resumo diário.

## Tipos de aviso

A central cobre, de forma determinística:

- agenda: evento hoje, amanhã e atrasado;
- Google Calendar: sync_error e drift local pendente;
- relatórios semanais: pendente de envio e needs_changes;
- memória: relatório enviado aguardando revisão;
- ações: devolutiva pendente e dossiê pendente;
- escutas: draft, revisão territorial pendente e possível dado sensível;
- transparência: snapshot pendente, pacote aguardando assinatura e comentário crítico pendente.

## Diferença entre aviso interno, Google Calendar e push

- Aviso interno: registro em in_app_notifications exibido no SEMEAR.
- Google Calendar: espelho operacional de agenda; não é motor de notificação do app.
- Push/e-mail: não implementados neste tijolo.

## Preferências de avisos

Cada perfil possui uma configuração em notification_preferences:

- agenda;
- Google Calendar;
- relatórios semanais;
- devolutivas e dossiês;
- revisão de escutas;
- transparência;
- memória;
- modo silencioso.

Modo silencioso:

- badges globais ocultam avisos não urgentes;
- avisos continuam acessíveis na Central de Avisos.

## Recalcular avisos

A atualização é manual e sob demanda.

Fluxo:

1. abrir /avisos;
2. clicar em Atualizar avisos (ou Atualizar avisos do papel para coordenação/admin);
3. API interna chama recalculador server-side;
4. avisos ativos são atualizados sem duplicidade em massa.

Regras de deduplicação:

- profile_id;
- team_member_id;
- audience_role;
- notification_type;
- source_type;
- source_id;
- status ativo (unread/read).

## O que nunca aparece em aviso

Para preservar privacidade e segurança:

- fala original;
- dados de entrevistado;
- CPF, telefone e endereço;
- anexos;
- tokens;
- conteúdo sensível de relatório;
- escutas brutas.

As action_url apontam apenas para rotas internas protegidas por autenticação e RLS.

## Futuro

Evoluções possíveis para próximos tijolos:

- notificações por e-mail com opt-in explícito e governança;
- push com consentimento e trilha de auditoria;
- cron interno para pré-cálculo periódico;
- automações externas somente após decisão formal de segurança e privacidade.
