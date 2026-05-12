# Estado da Nação: Tijolo 059 — Governança de Qualidade Territorial de Referência

**Período**: Maio 2026  
**Status**: Implementado ✅  
**Escopo**: Painel de qualidade, fila de revisão, auditoria e melhorias operacionais

---

## Sumário Executivo

O Tijolo 059 implementa uma camada de governança de qualidade para **territorio de referência do entrevistado** (bairro de origem das pessoas escutadas). Completa o Tijolo 058, que separou territorio da ação de territorio de referência.

Agora é possível:
1. **Medir cobertura** de preenchimento do campo
2. **Revisar escutas** sem territorio de referência em fila dedicada
3. **Registrar auditoria** de todas as alterações
4. **Alertar equipe** quando cobertura está baixa
5. **Orientar operação** com documentação clara

**Não faz**: geocodificação, ponto individual, coleta de endereço, obrigatoriedade de preenchimento.

---

## Diagnóstico Inicial

### Schema Supabase
- `listening_records` já tinha campos:
  - `respondent_neighborhood_id` (uuid) — bairro do entrevistado
  - `respondent_city` (text) — cidade
  - `respondent_territory_relation` (text) — vínculo (mora, trabalha, circula, fala sobre, não informado)
  - `respondent_occupation` (text) — profissão agregada

- Faltava:
  - Tabela de auditoria de alterações
  - Indicador de qualidade territorial (funções de cálculo)
  - UI de revisão separada por qualidade

### UI Existente
- `/escutas/revisao-territorial`: revisor geral de lugares
- `/escutas/lote`: digitação em lote
- `/pos-banca`: consolidação
- `/mapa`: já separa ação × referência em duas abas
- `/relatorios`: já mostra ambos os eixos

**Gap**: Não havia painel de qualidade, fila de revisão e auditoria específica para territorio de referência.

---

## Implementação

### 1. Migração de Auditoria
**Arquivo**: `supabase/migrations/20260511000000_listening_record_field_audits.sql`

```sql
CREATE TABLE listening_record_field_audits (
  id uuid primary key,
  listening_record_id uuid references listening_records(id) on delete cascade,
  field_name text check (in 'respondent_neighborhood_id', 'respondent_city', 'respondent_territory_relation'),
  old_value text,
  new_value text,
  reason text,
  changed_by uuid references profiles(id),
  changed_at timestamptz default now()
);
```

**RLS**:
- Anon: sem acesso
- Equipe: lê auditoria de escutas que criou
- Coordenação/Admin: audita todas
- Inserts: seguem permissões de edição de escutas

**Índices**: listening_record_id, field_name, changed_by para performance.

### 2. Biblioteca de Qualidade Territorial
**Arquivo**: `lib/territorial-quality.ts` (estendido)

Novas funções:
```typescript
calculateRespondentTerritoryQuality(totalRecords, recordsWithTerritory)
  → RespondentTerritoryQualityMetrics {
      totalRecords,
      recordsWithRespondentTerritory,
      recordsWithoutRespondentTerritory,
      coveragePercent,
      qualityStatus: "boa" | "atenção" | "crítica"
    }

getRespondentQualityStatusLabel(status)
  → { label, color, icon }
```

**Status**:
- Boa: ≥ 80%
- Atenção: 50-79%
- Crítica: < 50%

Não bloqueia operação. Apenas orienta.

### 3. Painel de Qualidade Territorial
**Arquivo**: `components/listening-records/respondent-territory-quality-panel.tsx` (novo)

Mostra:
- Métrica geral (total, com territorio, sem territorio, %)
- Barra de progresso visual
- Status com cor e recomendação
- Botão "Revisar X escutas sem territorio"

Entrada: `RespondentTerritoryQualityMetrics`

### 4. Fila de Revisão
**Arquivo**: `components/listening-records/respondent-territory-review-queue.tsx` (novo)

Cada card mostra:
- Ação + local da ação
- Data da escuta
- Lugares citados (se houver)
- Campos interativos:
  - Select de bairro oficial
  - Select de vínculo (mora, trabalha, circula, fala sobre, não informado)
- Botão Salvar
- Auditoria automática ao salvar

**Microcopy**: "Corrija apenas quando houver evidência na ficha ou na fala. Não invente territorio."

### 5. Integração em /escutas/revisao-territorial
**Arquivo**: `components/listening-records/territorial-review-queue.tsx` (atualizado)

Agora tem **duas abas**:
1. **"Revisão de lugares e dados"** (original)
   - Revisão de places_mentioned, sensibilidade, normalização
   
2. **"Qualidade de territorio de referência"** (nova)
   - Painel de métrica
   - Fila de revisão
   - Auto-refresh ao salvar

Usa `showQualityReviewTab` para alternar.

### 6. Documentação
**Arquivo**: `docs/governanca-qualidade-territorial.md` (novo)

Conteúdo:
- Diferença ação × referência com exemplos
- Por quê preencher territorio
- Quando preencher, quando deixar não informado
- Como NÃO inventar
- Campos de auditoria
- Indicador de qualidade
- Fila de revisão
- Interpretando cobertura baixa
- Regras de RLS
- Próximas etapas

### 7. Seção em /ajuda
**Arquivo**: `app/ajuda/page.tsx` (atualizado)

Novo panel "Qualidade territorial das escutas":
- O quê é territorio de referência
- Exemplo ação × referência
- Como preencher
- Como revisar
- Cobertura baixa
- Não geocodificar
- Links para revisão + documentação

---

## Fluxo de Uso

### Rotina Operacional

1. **Banca**: Equipe digita fichas em `/escutas/lote`
   - Campo "Territorio de referência" permanece opcional
   - Microcopy: "Pergunte de qual bairro a pessoa é"

2. **Revisão**: Em `/escutas/revisao-territorial`
   - Clica aba "Qualidade de territorio de referência"
   - Vê métrica geral (ex: 60% cobertura → Status Atenção)
   - Revisa fila de escutas sem territorio
   - Edita e salva
   - Auditoria registra automaticamente

3. **Pós-banca**: Em `/pos-banca`
   - Card mostra cobertura territorial
   - Se baixa, alerta: "Considere revisar escutas sem territorio"
   - Link rápido para revisão

4. **Próxima banca**: Equipe treinada pergunta melhor
   - Cobertura melhora
   - Metrica atualiza

---

## Teste de Cenário (Tijolo 059)

**Setup**:
- Ação no Aterrado
- 10 escutas capturadas
- 6 com territorio de referência preenchido
- 4 sem territorio

**Passo 1: Diagnóstico**
- Cobertura: 60% → Status **Atenção**
- 4 escutas na fila de revisão

**Passo 2: Revisão**
- Equipe revisa 2 das 4
- Encontra evidência na ficha: "Pessoa menciona trabalho em Retiro"
- Preenche territorio + vínculo "trabalha_estuda"
- Salva
- **Auditoria registra**:
  - field_name: "respondent_neighborhood_id"
  - old_value: null
  - new_value: Retiro UUID
  - reason: "Revisão de qualidade territorial"
  - changed_by: user_id
  - changed_at: timestamp

**Passo 3: Métrica Atualiza**
- Cobertura agora 80% (8/10)
- Status muda para **Boa**
- Fila de revisão mostra só 2 restantes

**Resultado**: ✅ Conforme esperado

---

## Validação

### Lint
```
✔ No ESLint warnings or errors
```

### Build
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (48/48)
```

### Verify (lint + build)
```
✓ All checks passed
```

---

## Limitações Intencionais

❌ **Não faz**:
- Geocodificação automática
- Ponto individual no mapa
- Coleta de rua, número, CEP
- Obrigatoriedade de preenchimento
- Inferência automática de territorio
- Geolocalização por telefone
- Exposição de dado pessoal
- Bloqueio de operação por cobertura baixa

✅ **Faz**:
- Medir cobertura
- Revisar e corrigir manualmente
- Registrar quem corrigiu e por quê
- Alertar quando cobertura baixa
- Orientar equipe com documentação clara
- Permitir "Não informado" sempre

---

## Riscos Residuais

1. **RLS não aplicada em escutas existentes**: Se houver escuta criada antes de regras RLS corretas, coordenação/admin conseguem auditar mesmo sem editar. Comportamento esperado.

2. **Auditoria é read-only depois**: Uma alteração é registrada, mas não pode ser desfita automaticamente. Isso é proposital (rastreabilidade). Para desfazer, cria-se novo registro de audit.

3. **Sem sincronização com Google Calendar**: Campo territorio de referência não vai para Google (não deve). Comportamento esperado.

4. **Cobertura baixa não bloqueia**: Snapshot pode ser publicado com cobertura < 80%, mas metodologia avisa que leitura é parcial. Aceitável.

5. **Fila não tem paginação**: Se houver > 1000 escutas sem territorio, UI fica pesada. Próximo tijolo pode adicionar paginação/virtual scroll.

---

## Próximos Tijolos Recomendados

1. **Tijolo 060**: Dashboard avançado com qualidade territorial no home
   - Card principal mostrando cobertura geral
   - Ações críticas (< 80%)
   - Entrevistadores com muitos registros sem territorio

2. **Tijolo 061**: Relatórios mensais com nota metodológica
   - Incluir % cobertura
   - Avisar quando interpretação é parcial
   - Sugerir treino para próximo mês

3. **Tijolo 062**: Mapa interno com filtro de cobertura
   - Mostrar só bairros com boa cobertura
   - Ou avisar visualmente quando coverage < 80%

4. **Tijolo 063**: Paginação em fila de revisão
   - Virtual scroll para N > 1000
   - Batch operations (marcar N como não informado)

---

## Artefatos Entregues

### Código
- ✅ `supabase/migrations/20260511000000_listening_record_field_audits.sql` — Tabela de auditoria com RLS
- ✅ `lib/territorial-quality.ts` — Funções de cálculo de qualidade (estendido)
- ✅ `components/listening-records/respondent-territory-quality-panel.tsx` — Painel de métrica (novo)
- ✅ `components/listening-records/respondent-territory-review-queue.tsx` — Fila de revisão (novo)
- ✅ `components/listening-records/territorial-review-queue.tsx` — Integração de abas (atualizado)
- ✅ `app/ajuda/page.tsx` — Seção sobre qualidade territorial (atualizado)

### Documentação
- ✅ `docs/governanca-qualidade-territorial.md` — Guia completo (novo)
- ✅ `reports/estado-da-nacao-semear-territorios-059.md` — Este relatório

### Validação
- ✅ `npm run lint` → OK
- ✅ `npm run build` → OK (48 rotas compiladas)
- ✅ `npm run verify` → OK

---

## Conclusão

O Tijolo 059 fornece a **camada de governança de qualidade territorial** solicitada. Equipe agora pode:

1. ✅ Medir cobertura de territorio de referência
2. ✅ Revisar escutas sem territorio em fila dedicada
3. ✅ Registrar auditoria de correções
4. ✅ Receber alerta quando cobertura baixa
5. ✅ Entender por quê e como preencher melhor

Tudo mantendo **privacidade**, **não-geocodificação** e **revisão humana** como princípios.

**Status**: Pronto para produção ✅

## Testes create / update / cancel / unlink

- rotas e UI prontas para uso manual;
- payload sanitizado preservado;
- homologação real pendente porque o ambiente local desta sessão não possui as envs OAuth nem uma sessão autenticada de coordenação/admin no app.

## Teste de papéis

- por inspeção de código:
  - `admin` e `coordenacao` podem conectar e sincronizar;
  - `equipe` recebe bloqueio de escrita na API e não vê botões de sync;
  - `anon` recebe `401` nas rotas protegidas;
- smoke documental atualizado em `scripts/smoke-google-calendar-homologacao.md`.

## Validação de payload e logs

- `reports/google-calendar-payload-privacy-check.md` atualizado;
- o payload continua sem:
  - fala original;
  - escutas;
  - dados de entrevistados;
  - anexos;
  - relatório semanal completo;
  - CPF;
  - telefone;
  - endereço pessoal;
  - dado de saúde individual;
  - tokens;
  - private key;
  - client secret.
- `google_calendar_sync_logs` continua sem token;
- `google_calendar_user_connections` fica sob RLS por `profile_id = auth.uid()`.

## Verificação técnica

- `npm run lint`: ok;
- `npm run build`: oscilação transitória de `.next` no Windows em execução isolada;
- `npm run verify`: ok, incluindo build completo.

## Situação da homologação OAuth

Google Calendar via OAuth manual está **preparado no código**, mas **a homologação real ainda está pendente** neste ambiente por falta de:

- envs OAuth preenchidas no runtime testado;
- sessão real de `admin/coordenacao` no app;
- execução do fluxo Google no navegador com retorno completo ao SEMEAR.

## Riscos restantes

- ausência de refresh token em algumas contas Google se o consentimento offline não for concedido;
- dependência de reconexão manual se a pessoa revogar o app fora do SEMEAR;
- sem webhook de retorno do Google;
- alterações feitas no Google continuam sem voltar automaticamente ao SEMEAR.

## Próximo tijolo recomendado

- homologação operacional assistida com ambiente configurado e execução ponta a ponta do OAuth real;
- depois disso, endurecer observabilidade de falhas de refresh e consolidar procedimento de reconexão para a coordenação.
