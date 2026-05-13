# Testes automatizados - Transparencia Viva (Tijolo 048)

## Objetivo

Garantir regressao de seguranca e governanca editorial/institucional na Transparencia Viva sem expor dados sensiveis ou quebrar o fluxo de homologacao.

## Cobertura automatizada

Suite Vitest em [tests/transparencia/privacy-detector.test.ts](tests/transparencia/privacy-detector.test.ts), [tests/transparencia/public-api-route.test.ts](tests/transparencia/public-api-route.test.ts) e [tests/transparencia/comments-and-signature-rules.test.ts](tests/transparencia/comments-and-signature-rules.test.ts).

Casos cobertos:

1. detector de privacidade:
- bloqueia CPF, telefone e e-mail;
- sinaliza CEP, URL externa e pista de endereco.

2. API publica `/api/public/transparencia-viva`:
- retorna `snapshot: null` quando nao ha publicacao;
- retorna 500 com mensagem segura em erro de consulta;
- remove campos internos de override territorial;
- sanitiza justificativa institucional antes da resposta publica.

3. comentarios, auditoria e assinatura:
- comentarios criticos pendentes bloqueiam;
- comentario de texto pendente vira aviso;
- assinatura falha sem pre-condicoes;
- assinatura passa quando snapshot/pacote estao prontos;
- frozen payload nao carrega campos brutos proibidos.

## Smoke remoto (banco)

Cobertura de transicoes reais de trigger e assinatura em [scripts/test_transparencia_remote_048.mjs](scripts/test_transparencia_remote_048.mjs).

Fluxo coberto no smoke remoto:

1. reviewed gera versao;
2. approved gera versao;
3. published com comentario critico pendente falha;
4. published com pendencias resolvidas passa e grava `published_at`;
5. edicao em published retorna para reviewed e limpa `published_at`;
6. pacote com checklist/risk/payload invalidos bloqueia assinatura;
7. pacote regularizado assina com `status = signed`.

## Comandos

```bash
npm run test:transparencia
npm run smoke:transparencia
```

`npm run verify` inclui `npm run test:transparencia`.

## Guardrails de seguranca

Payload de regressao sensivel monitorado pelos testes:

- CPF;
- telefone;
- e-mail;
- endereco/rua/numero;
- CEP;
- referencia a fala bruta;
- identificadores de entrevistador/equipe.

Nenhum desses itens deve aparecer em payload publico, export institucional publico ou saida de API publica.
