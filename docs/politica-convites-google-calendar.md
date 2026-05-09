# Política de Convites do Google Calendar

## Objetivo

Definir a postura operacional do SEMEAR para convites por e-mail em eventos sincronizados com Google Calendar.

## Opção A — Sem convites por enquanto

- o evento vai apenas para o calendário institucional;
- a equipe acompanha presença e detalhes pelo SEMEAR;
- reduz risco de spam, ruído e duplicidade de comunicação;
- evita exposição indevida de e-mails externos.

## Opção B — Convidar participantes com e-mail

- usar apenas `team_members.email`;
- aplicar apenas a eventos específicos;
- manter `sendUpdates=none` quando a política pedir evitar notificações automáticas;
- nunca incluir dados sensíveis no convite;
- revisar com cuidado e-mails externos antes de qualquer envio.

## Recomendação inicial

Manter convites desativados por padrão.

Motivos:

- o calendário institucional já cumpre o papel de espelho operacional;
- a agenda interna do SEMEAR continua sendo o local principal para presença e contexto;
- a política de convites ainda precisa de decisão clara sobre notificações e governança.

## Regras mínimas para uma futura ativação

- `google_send_invites = true` apenas por evento;
- nenhum campo livre de e-mail;
- apenas participantes cadastrados em `team_members`;
- apenas participantes `active = true`;
- apenas e-mails válidos vindos de `team_members.email`;
- nunca convidar entrevistados;
- nunca enviar escutas, falas originais ou dados sensíveis;
- coordenação/admin revisa o evento antes da sincronização.

## Decisão operacional do Tijolo 062

- `google_send_invites` pode ser ativado ou desativado por evento;
- apenas `admin` e `coordenacao` podem alterar essa flag;
- o padrão continua `false`;
- nesta versão, mesmo com a flag ativada, o SEMEAR mantém `sendUpdates=none`;
- isso permite governança por evento sem disparar e-mail automático.
