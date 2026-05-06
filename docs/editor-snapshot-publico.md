# Editor de snapshot público

## Objetivo

O editor de snapshot público existe para transformar o rascunho determinístico da Transparência Viva em uma peça revisável, editável e segura antes da publicação.

## Onde editar

- Lista de snapshots: `/transparencia/snapshots`
- Editor por snapshot: `/transparencia/snapshots/[id]`
- Preview interno: `/transparencia/preview`

## Campos editáveis

- `title`
- `period_start`
- `period_end`
- `public_summary`
- `privacy_notes`
- `methodology_notes`
- `opening_text`
- `listening_text`
- `limits_text`
- `next_steps_text`

## Blocos automáticos

Os blocos abaixo continuam sendo gerados de forma determinística e podem ser regenerados:

- `totals`
- `territory_summary`
- `theme_summary`
- `word_summary`
- `action_timeline`
- `debrief_links`

## Diff básico

O editor mostra:

- texto gerado originalmente;
- texto editado atualmente;
- diff textual básico;
- última edição;
- última revisão.

## Publicação

O botão de publicar só deve ser usado quando:

- o checklist estiver completo;
- não houver CPF, telefone ou e-mail detectado;
- a revisão final tiver sido feita por coordenação ou admin.

## Republicação

Se o snapshot publicado for editado, o status volta para `reviewed`. Isso impede manter um snapshot público alterado sem nova revisão.
