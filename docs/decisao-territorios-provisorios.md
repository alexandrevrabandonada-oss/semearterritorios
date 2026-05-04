# Decisão: Territórios Provisórios — Ocultação dos Selects Operacionais

**Data:** 2026-05-04
**Tijolo:** 034
**Status:** Decisão registrada e aplicada

---

## Por que existem 21 territórios provisórios?

Antes da aplicação da lista oficial de bairros de Volta Redonda (Tijolo 033), o sistema
continha 73 registros na tabela `neighborhoods`. Após a migration que aplicou os 52 bairros
oficiais com `status = 'oficial'`, restaram 21 registros com status diferente de `oficial`
(provisórios, a revisar ou sem uso).

Esses 21 registros foram criados nas fases iniciais de prototipagem e teste do sistema,
antes da lista oficial ser extraída, conferida e aplicada. Eles servem como referência
histórica e não correspondem a bairros reconhecidos pelos documentos oficiais do município
de Volta Redonda.

---

## Por que não serão apagados automaticamente?

1. **Risco de integridade referencial.** Mesmo com `actions_total = 0` e
   `listening_records_total = 0` no momento desta decisão, uma deleção automática sem
   migration própria pode causar problemas futuros se qualquer vínculo for criado antes da
   limpeza.

2. **Princípio de reversibilidade.** O sistema adota a regra: nenhum dado é apagado por
   lógica de aplicação sem decisão explícita, migration documentada e validação humana.

3. **Auditoria.** A presença dos registros provisórios no banco permite rastrear o histórico
   de como os territórios evoluíram ao longo do desenvolvimento.

4. **Checagem segura prévia obrigatória.** O script `scripts/check-safe-cleanup.sql` deve
   ser executado e o relatório revisado antes de qualquer limpeza. No Tijolo 034, o
   resultado foi: `SAFE_TO_REMOVE: 73, BLOCKED: 0` — confirmando que nenhum provisório tem
   vínculo operacional. Ainda assim, a deleção foi adiada para migration própria.

---

## Por que serão ocultos dos selects operacionais?

Exibir territórios provisórios nos formulários de cadastro de ações e escutas cria risco
operacional: a equipe pode selecionar um território que não é reconhecido oficialmente,
gerando relatórios com bairros incorretos e dificultando a leitura territorial.

A solução adotada no Tijolo 034 é:

- **Formulários operacionais** (nova ação, edição de ação, nova escuta, edição de escuta,
  filtros de /acoes e /escutas, revisão territorial) exibem **apenas** registros com
  `status = 'oficial'`.
- **Área administrativa** (`/territorios`) exibe **todos** os territórios, com painel de
  separação entre oficiais e provisórios.

Isso é implementado via filtro `status = 'oficial'` na query ao banco, garantido pelas
funções `getOfficialNeighborhoodsForSelect()` e `getAllNeighborhoodsForAdmin()` em
`lib/neighborhoods.ts`.

---

## Como revisar os territórios provisórios futuramente?

1. Acessar `/territorios` — o painel administrativo exibe a separação entre oficiais e
   provisórios, com contagem de vínculos.
2. Conferir se algum provisório ganhou vínculo (ação ou escuta) antes de qualquer limpeza.
3. Rodar o script `scripts/check-safe-cleanup.sql` ou equivalente para gerar relatório
   atualizado de `SAFE_TO_REMOVE` e `BLOCKED`.
4. Redigir decisão de limpeza com: listagem de IDs a remover, justificativa, responsável e
   data.
5. Criar migration dedicada (ex.: `supabase/migrations/YYYYMMDDHHMMSS_cleanup_provisional_neighborhoods.sql`)
   com `DELETE FROM neighborhoods WHERE id IN (...)` e comentário referenciando esta decisão.
6. Aplicar migration em ambiente de homologação, verificar, depois aplicar em produção.
7. Registrar resultado no Estado da Nação correspondente.

---

## Regra permanente

> **Delete somente por migration própria, após relatório de limpeza segura e validação humana.**

Nenhum código de aplicação deve executar `DELETE` em `neighborhoods` automaticamente.
Qualquer script de limpeza deve ser revisado, aprovado e aplicado manualmente pela
coordenação ou admin antes de ser executado no banco remoto.

---

## Arquivos relacionados

- `lib/neighborhoods.ts` — funções `getOfficialNeighborhoodsForSelect` e `getAllNeighborhoodsForAdmin`
- `components/territories/territories-admin-overview.tsx` — painel administrativo com split
- `docs/validacao-lista-oficial-territorios.md` — validação da lista oficial
- `scripts/check-safe-cleanup.sql` — script de checagem segura
- `reports/estado-da-nacao-semear-territorios-034.md` — relatório de aplicação desta decisão
