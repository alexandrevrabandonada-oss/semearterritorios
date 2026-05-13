# Estado da Nação — SEMEAR Territórios — Tijolo 067

**Data:** 2026-05-12  
**Versão:** 1.0  
**Tijolo:** 067 — Homologação de Leitura Coletiva para Transparência Viva  
**Status:** ✅ Concluído

## Resumo executivo

O Tijolo 067 implementou o fluxo seguro de transição entre Leituras Coletivas (`/leituras`) e Transparência Viva (`/transparencia/snapshots`), sem publicação automática e com revisão humana obrigatória.

Foi entregue:

- biblioteca determinística de transformação agregada com sanitização;
- API interna para prévia e criação de rascunho (`preview|create`);
- botão + modal em `/leituras` com confirmação explícita;
- rastreabilidade da origem (`source_type`, `source_filters`, `source_generated_at`);
- reforço de checklist de privacidade para origem coletiva;
- documentação operacional, homologação e smoke test.

## 1) Escopo realizado

### 1.1 Backend e dados

- Migration criada: `supabase/migrations/20260512090000_add_collective_reading_source_fields_to_snapshots.sql`
- Novos campos em `public_transparency_snapshots`:
  - `source_type`
  - `source_filters`
  - `source_generated_at`
- Tipagem atualizada em `lib/database.types.ts`.

### 1.2 Biblioteca de transformação

- Arquivo novo: `lib/collective-reading-to-snapshot.ts`
- Funções principais:
  - `sanitizeCollectiveReadingForPublicSnapshot`
  - `buildPublicReadingSummary`
  - `buildReadingMethodologyNote`
  - `buildReadingLimitationsNote`
  - `buildTransparencySnapshotFromCollectiveReading`
- Regras aplicadas:
  - agregação por território com mínimo público;
  - ocupações raras agrupadas;
  - lugares sensíveis excluídos por visibilidade;
  - palavras recorrentes sanitizadas;
  - notas explícitas de limite metodológico.

### 1.3 API de preparação por Leituras

- Arquivo novo: `app/api/transparencia/snapshots/from-leituras/route.ts`
- Modo `preview`:
  - retorna prévia segura para revisão no modal;
  - não cria registro.
- Modo `create`:
  - cria snapshot com `status = draft`;
  - preenche metadados de origem coletiva;
  - redireciona para editor com `?source=collective_reading`;
  - tenta notificar `coordenacao` e `admin`.

### 1.4 UX em Leituras

- Atualização em `components/leituras/leituras-header.tsx`:
  - botão `Preparar snapshot da Transparência Viva`;
  - modal responsivo com prévia segura;
  - blocos `Será incluído` e `Nunca será incluído`;
  - alertas metodológicos;
  - checkbox de confirmação obrigatória;
  - criação do draft e redirecionamento.

### 1.5 Editor com rastreabilidade

- Atualização em `components/transparency/transparency-snapshot-editor-page.tsx`:
  - aviso de origem coletiva quando aplicável;
  - exibição de `source_type` e `source_generated_at` no editor.

### 1.6 Checklist reforçado

- Atualização em `lib/transparency-privacy.ts`:
  - novos itens:
    - `data_from_aggregates`
    - `words_sanitized`
    - `no_census_claim`
  - checklist inclui os compromissos específicos de leitura coletiva.

## 2) Segurança e conformidade

Compromissos preservados no tijolo:

- sem publicação automática;
- sem nova rota pública lendo dados internos;
- sem uso de `service_role` no frontend;
- sem relaxamento de RLS;
- sem exposição de fala individual ou identificadores pessoais.

## 3) Documentação entregue

- Novo: `docs/homologacao-leitura-coletiva-transparencia.md`
- Atualizado: `docs/transparencia-viva-publica.md`
- Atualizado: `docs/editor-snapshot-publico.md`
- Atualizado: `docs/pacote-homologacao-transparencia-viva.md`
- Atualizado: `app/ajuda/page.tsx` (seção operacional de leituras/transparência)
- Novo smoke: `scripts/smoke-leituras-para-transparencia.md`

## 4) Validação técnica

Validação de arquivos alterados:

- `get_errors` sem erros nos artefatos centrais do tijolo:
  - transformação (`lib/collective-reading-to-snapshot.ts`)
  - API (`app/api/transparencia/snapshots/from-leituras/route.ts`)
  - UI de leituras (`components/leituras/leituras-header.tsx`)
  - editor (`components/transparency/transparency-snapshot-editor-page.tsx`)
  - checklist (`lib/transparency-privacy.ts`)

## 5) Riscos residuais

- Migration ainda precisa de aplicação no ambiente remoto para produção dos novos campos de origem.
- Recomenda-se rodada de smoke com usuário real de coordenação antes de uso operacional pleno.
- Checklist exige disciplina editorial contínua; a ferramenta ajuda, mas não substitui revisão humana.

## 6) Critérios de aceite do tijolo

Status por objetivo:

- diagnóstico técnico e integração com stack existente: ✅
- biblioteca de transformação segura: ✅
- botão/modal de prévia em `/leituras`: ✅
- regra de amostra mínima e sanitização: ✅
- ocupações raras agrupadas e lugares sensíveis excluídos: ✅
- integração com editor/checklist/avisos: ✅
- documentação e smoke: ✅
- estado da nação: ✅

## 7) Próximo tijolo sugerido

**Tijolo 068 — Operação assistida da publicação por leitura coletiva**

Objetivo recomendado:

1. aplicar migration no ambiente remoto;
2. executar smoke completo com perfis `equipe`, `coordenacao`, `admin`;
3. validar qualidade de texto final com casos reais de baixa amostra;
4. fechar pacote institucional com evidências do primeiro ciclo completo.
