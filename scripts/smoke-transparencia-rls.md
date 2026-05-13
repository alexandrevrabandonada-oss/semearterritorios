# Smoke de RLS e papeis - Transparencia Viva (Tijolo 048)

## Objetivo

Validar rapidamente que o fluxo editorial e institucional da Transparencia Viva continua protegido por RLS, bloqueios de trigger e regras de assinatura.

## Escopo

- snapshots publicos apenas em status published na API publica;
- bloqueio de publicacao com comentario critico pendente;
- bloqueio de assinatura com checklist incompleto, risco bloqueante ou frozen payload vazio;
- assinatura liberada com pacote regularizado;
- transicao de published para reviewed ao editar conteudo.

## Script automatizado

Rodar com credenciais remotas:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run smoke:transparencia
```

O script [scripts/test_transparencia_remote_048.mjs](scripts/test_transparencia_remote_048.mjs) cobre:

1. cria snapshot de teste;
2. valida versionamento em reviewed/approved/published;
3. valida bloqueio de publicacao com comentario critico;
4. valida retorno automatico para reviewed apos edicao de published;
5. cria pacote e valida bloqueio de assinatura em estado invalido;
6. regulariza pacote e valida assinatura com status final signed;
7. remove artefatos de teste ao final.

## Check de RLS por papeis (manual assistido)

1. anon:
- API publica: pode ler apenas o ultimo snapshot published;
- tabelas internas: sem leitura de snapshots em draft/reviewed/approved e sem acesso a comentarios/homologacao.

2. equipe:
- pode criar/editar draft de snapshot;
- nao pode publicar snapshot;
- pode criar pacote draft proprio;
- nao pode assinar/rejeitar/arquivar pacote.

3. coordenacao/admin:
- podem revisar, aprovar e publicar snapshot;
- podem assinar/rejeitar/arquivar pacote.

## Resultado esperado

- nenhum dado bruto/sensivel aparece na rota publica;
- publicacao e assinatura respeitam bloqueios institucionais;
- status e trilha de auditoria permanecem coerentes apos transicoes criticas.
