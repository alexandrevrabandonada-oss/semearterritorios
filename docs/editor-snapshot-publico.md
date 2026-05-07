# Editor de snapshot público

## Objetivo

O editor de snapshot público transforma o rascunho determinístico da Transparência Viva em uma peça revisável, auditável e pronta para homologação institucional antes da publicação.

## Onde operar

- lista de snapshots: `/transparencia/snapshots`
- editor por snapshot: `/transparencia/snapshots/[id]`
- preview interno: `/transparencia/preview`
- homologação institucional: `/transparencia/homologacao`

## Abas do editor

1. `Conteúdo`
2. `Checklist`
3. `Auditoria`
4. `Comentários`

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

## Trilha de auditoria

O editor registra:

- texto gerado originalmente;
- texto editado atualmente;
- diff textual básico;
- versões editoriais;
- comentários de revisão;
- última edição;
- última revisão;
- pacote institucional vinculado, quando existir.

## Regra de comentários

Comentários de `privacidade`, `dados` e `metodologia` bloqueiam a publicação enquanto estiverem pendentes.

Comentários de `texto` não bloqueiam sozinhos, mas exigem validação final de coordenação ou admin.

## Republicação

Se o snapshot publicado for editado, o status volta para `reviewed`. Isso impede manter um snapshot público alterado sem nova revisão.

## Homologação institucional

O card `Homologação institucional` no editor permite:

- ver se já existe pacote vinculado;
- gerar pacote institucional a partir do snapshot;
- abrir o pacote para assinatura, rejeição ou arquivamento.

Pacote institucional congela:

- snapshot aprovado;
- versão editorial de referência;
- checklist multi-etapa;
- relatório de risco;
- payload congelado sanitizado;
- decisão institucional.

## Export seguro

No editor do snapshot existem dois artefatos distintos:

- `Copiar resumo da auditoria`: resumo editorial interno do snapshot;
- `Gerar pacote de homologação`: cria o artefato institucional versionado.

O export nunca inclui fala original, escutas brutas, entrevistador, e-mail, CPF, telefone, endereço, dado de saúde individual ou lugar sensível.
