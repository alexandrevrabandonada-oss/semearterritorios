# Estado da Nação SEMEAR Territórios 046

## Diagnóstico inicial

O Tijolo 045 já tinha editor revisável, checklist persistido, detector de risco, bloqueio por CPF/telefone/e-mail e regra de republicação para `reviewed`. Faltavam trilha estruturada de versões, comentários de revisão, bloqueio por pendências críticas e export seguro para homologação institucional.

## Migrations criadas

- `supabase/migrations/20260506210000_add_transparency_editorial_audit_trail.sql`

## Tabelas criadas

- `public_transparency_snapshot_versions`
- `public_transparency_snapshot_review_comments`

Também foi adicionado `current_risk_report` em `public_transparency_snapshots`.

## Biblioteca criada

Arquivo: `lib/transparency-audit.ts`

Funções implementadas:

- `createSnapshotVersion`
- `getSnapshotVersions`
- `addReviewComment`
- `resolveReviewComment`
- `buildSnapshotAuditExport`
- `getSnapshotAuditStatus`

## Telas alteradas

- `/transparencia/snapshots/[id]`: agora tem abas de conteúdo, checklist, auditoria e comentários.
- `/transparencia/preview`: agora mostra status editorial, comentários pendentes, última versão e aviso de auditoria.
- `/ajuda`: nova seção “Auditoria da Transparência Viva”.

## Regra de versionamento

Uma nova versão é criada quando o snapshot:

- entra em `reviewed`;
- entra em `approved`;
- entra em `published`;
- volta de `published` para `reviewed` após edição.

## Regra de comentários

Comentários são classificados por tipo:

- `privacidade`
- `texto`
- `metodologia`
- `dados`
- `aprovacao`
- `publicacao`
- `outro`

Equipe pode comentar. Coordenação/admin resolvem comentários.

## Regra de bloqueio

Comentários pendentes de `privacidade`, `dados` ou `metodologia` bloqueiam a publicação no banco e na interface.

Comentários de `texto` não bloqueiam sozinhos, mas continuam visíveis como aviso editorial.

## Export seguro

O editor agora copia um pacote de homologação com:

- metadados do snapshot;
- checklist;
- alertas de risco;
- histórico de versões;
- comentários e pendências;
- decisão editorial.

Esse export não inclui fala original, escutas brutas, entrevistador, e-mails, CPF, telefone, endereço, dado de saúde individual ou lugar sensível.

## Documentação criada e atualizada

- `docs/homologacao-editorial-transparencia-viva.md`
- `docs/transparencia-viva-publica.md`
- `docs/editor-snapshot-publico.md`
- `docs/homologacao-transparencia-viva.md`

## Riscos restantes

- o diff do texto continua simples e linear;
- ainda não há comparação estruturada por bloco JSON;
- o export é textual, não arquivo assinado ou PDF institucional;
- falta uma suíte automatizada de testes de RLS e fluxo editorial.

## Próximo tijolo recomendado

Tijolo 047: homologação institucional exportável, com artefato formal versionado, snapshot congelado para assinatura interna e checklist de aprovação multi-etapa.
