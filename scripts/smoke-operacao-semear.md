# Smoke Test Operacional — SEMEAR Territórios

Use este roteiro em homologação depois de aplicar migrations e, opcionalmente, executar `scripts/seed-homologacao-banca.sql`.

## Acesso e autenticação

- Abrir `/` sem login.
- Abrir `/acoes` sem login.
- Abrir `/escutas/lote` sem login.
- Resultado esperado: acesso sem sessão não deve permitir leitura/escrita de dados protegidos.

## Rotas principais

- Login como equipe.
- Abrir `/acoes`.
- Abrir `/escutas/lote`.
- Abrir `/acoes/[id]/piloto`.
- Abrir `/acoes/[id]/devolutiva`.
- Abrir `/acoes/[id]/dossie`.
- Abrir `/relatorios/[mes]`.
- Abrir `/ajuda`.

## Fluxo de equipe

- Digitar escutas em lote.
- Confirmar que entram como rascunho.
- Revisar uma escuta.
- Tentar aprovar devolutiva.
- Resultado esperado: equipe não deve aprovar.

## Fluxo de coordenação/admin

- Login como coordenação ou admin.
- Aprovar devolutiva sem alerta sensível.
- Tentar aprovar devolutiva com alerta sensível.
- Resultado esperado: deve bloquear.
- Tentar fechar dossiê com escutas em rascunho.
- Resultado esperado: deve bloquear sem suficiência justificada.
- Marcar suficiência com justificativa.
- Fechar dossiê.
- Reabrir dossiê com justificativa em notas internas.

## Impressão

- Imprimir devolutiva.
- Imprimir dossiê.
- Conferir que a impressão não mostra:
  - fala original completa;
  - entrevistador;
  - CPF;
  - telefone;
  - e-mail;
  - endereço pessoal;
  - botões e controles de operação.

## Relatório mensal

- Abrir o mês da ação homologada.
- Conferir alerta de ações sem dossiê fechado quando existir.
- Conferir status de dossiê, devolutiva, revisadas e pendências por ação.

## Homologação GO/NO-GO

- Login como equipe.
- Cadastrar uma ação de teste.
- Digitar 3 escutas em `/escutas/lote`.
- Revisar 2 escutas.
- Deixar 1 escuta em rascunho.
- Gerar devolutiva determinística.
- Tentar aprovar devolutiva com usuário equipe.
- Resultado esperado: deve falhar.
- Login como coordenação ou admin.
- Aprovar devolutiva, se não houver alerta sensível.
- Abrir dossiê.
- Tentar fechar com 1 rascunho.
- Resultado esperado: deve bloquear sem suficiência justificada.
- Marcar suficiência com justificativa, se for decisão da coordenação.
- Fechar dossiê.
- Conferir relatório mensal.
- Imprimir devolutiva.
- Imprimir dossiê.
- Preencher `docs/go-no-go-primeira-banca.md`.
- Registrar resultado em `docs/registro-homologacao-primeira-banca.md`.
