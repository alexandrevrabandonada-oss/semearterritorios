# Homologação Operacional — Primeira Banca de Escuta

Este checklist orienta o teste completo do SEMEAR Territórios antes do uso real. Use ambiente de desenvolvimento ou homologação. Não use dados reais de participantes neste teste.

## Preparação

- Aplicar todas as migrations.
- Confirmar que `public.get_user_role()` existe antes das migrations de `action_debriefs` e `action_closures`.
- Confirmar que `lib/database.types.ts` contém `action_debriefs` e `action_closures`.
- Criar usuários de teste:
  - admin;
  - coordenação;
  - equipe;
- Decisão técnica: o papel `leitor` não existe no schema atual e não será testado nesta homologação.
- Opcional: executar `scripts/seed-homologacao-banca.sql` em DEV/DEMO.

## Rotas a verificar

- `/acoes`
- `/acoes/[id]`
- `/acoes/[id]/piloto`
- `/acoes/[id]/devolutiva`
- `/acoes/[id]/dossie`
- `/escutas/lote`
- `/relatorios/[mes]`
- `/ajuda`

## Checklist por papel

### Usuário anônimo

- Abrir `/acoes`.
- Abrir `/escutas/lote`.
- Abrir `/acoes/[id]/devolutiva`.
- Resultado esperado: acesso bloqueado pelo fluxo de autenticação/RLS.

### Usuário admin

- Fazer login.
- Criar uma ação “Homologação — Banca de Escuta Feira Livre”.
- Acessar `/escutas/lote`.
- Digitar escutas em lote como rascunho.
- Revisar escutas.
- Conferir alerta de possível dado sensível.
- Abrir `/acoes/[id]/piloto`.
- Conferir totais, rascunhos, revisadas e pendências.
- Abrir `/acoes/[id]/devolutiva`.
- Gerar rascunho determinístico.
- Revisar texto público.
- Aprovar devolutiva.
- Imprimir devolutiva e conferir que não há fala original completa, entrevistador, CPF, telefone, e-mail ou endereço pessoal.
- Abrir `/acoes/[id]/dossie`.
- Fechar dossiê.
- Reabrir dossiê com justificativa em notas internas.

### Usuário coordenação

- Fazer login.
- Aprovar devolutiva.
- Tentar fechar dossiê com escutas em rascunho.
- Resultado esperado: bloqueio sem suficiência justificada.
- Marcar “Coordenação considera a revisão suficiente para fechamento”.
- Preencher justificativa.
- Fechar dossiê, desde que não haja possível dado sensível pendente.
- Reabrir dossiê com justificativa.

### Usuário equipe

- Fazer login.
- Criar ação, se permitido no ambiente.
- Digitar escutas em lote.
- Revisar escutas próprias.
- Gerar rascunho de devolutiva.
- Tentar aprovar devolutiva.
- Resultado esperado: aprovação deve falhar.
- Criar ou editar dossiê enquanto não estiver fechado.
- Tentar fechar dossiê.
- Resultado esperado: fechamento deve falhar se a política exigir coordenação/admin.

## Relatório mensal

- Abrir `/relatorios/[mes]`.
- Conferir cada ação do mês:
  - status do dossiê;
  - devolutiva aprovada ou não;
  - escutas revisadas;
  - pendências críticas.
- Se houver ação sem dossiê fechado, conferir alerta: “Há ações do mês sem dossiê fechado.”

## Seed DEV/DEMO

Arquivo: `scripts/seed-homologacao-banca.sql`

Uso sugerido em ambiente local:

```bash
psql "$DATABASE_URL" -f scripts/seed-homologacao-banca.sql
```

Não executar em produção. O seed cria dados fictícios para testar rascunhos, revisadas, temas e alerta de possível dado sensível.
