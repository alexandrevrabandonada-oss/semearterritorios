# Estado da Nacao - SEMEAR Territorios - Tijolo 048

## Objetivo do tijolo

Implementar testes automatizados do fluxo editorial e institucional da Transparencia Viva, cobrindo API publica, privacidade, comentarios/versionamento, homologacao e assinatura.

## Entregas realizadas

1. Infra de testes com Vitest:
- `vitest.config.ts` criado com suporte a alias do projeto.

2. Testes automatizados criados:
- `tests/transparencia/privacy-detector.test.ts`
- `tests/transparencia/public-api-route.test.ts`
- `tests/transparencia/comments-and-signature-rules.test.ts`

3. Comandos de execucao:
- `npm run test:transparencia`
- `npm run smoke:transparencia`
- `npm run verify` atualizado para incluir `npm run test:transparencia`.

4. Smoke remoto de banco para fluxo real:
- `scripts/test_transparencia_remote_048.mjs`.

5. Documentacao:
- `docs/testes-transparencia-viva.md`
- `scripts/smoke-transparencia-rls.md`
- atualizacao em:
  - `docs/transparencia-viva-publica.md`
  - `docs/pacote-homologacao-transparencia-viva.md`
  - `docs/homologacao-pacote-transparencia-viva.md`

## Cobertura funcional consolidada

- API publica sem publicacao retorna `snapshot: null`.
- API publica retorna erro seguro em falha de banco.
- API publica remove campos internos de override territorial.
- Justificativa institucional territorial e sanitizada antes de exposicao.
- Detector de privacidade bloqueia CPF/telefone/e-mail e avisa CEP/endereco/URL externa.
- Comentarios criticos pendentes bloqueiam homologacao/publicacao.
- Comentarios de texto pendentes geram aviso nao-bloqueante.
- Readiness de assinatura valida status do snapshot, checklist, risco e frozen payload.
- Frozen payload nao carrega campos brutos proibidos.
- Smoke remoto valida transicoes reviewed/approved/published e fallback de published para reviewed apos edicao.
- Smoke remoto valida bloqueio e liberacao de assinatura de pacote.

## Riscos e pendencias

- Smoke remoto depende de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente.
- Validacao fina por papel autenticado (anon/equipe/coordenacao/admin) permanece como passo operacional assistido no checklist de smoke.

## Criterio de aceite do tijolo

Aceite tecnico considerado atendido com:

1. suite local verde em `npm run test:transparencia`;
2. pipeline tecnico verde em `npm run verify`;
3. smoke remoto executavel e documentado para validacao de trigger/RLS/assinatura.
