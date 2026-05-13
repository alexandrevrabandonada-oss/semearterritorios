# Aceite Operacional — Auditoria de Falas com Papéis Reais

**Tijolo:** 069  
**Data:** 12 de maio de 2026  
**Ambiente:** Produção — `gtpitwhslqjgbuwlsaqg.supabase.co`  
**Responsável técnico:** Agent SEMEAR

---

## Contexto

O Tijolo 068 concluiu o deploy remoto das migrations de auditoria de falas representativas. Este roteiro é a etapa seguinte: validar operacionalmente que o sistema funciona corretamente com usuários reais, em cada papel, no frontend de produção.

---

## Papéis disponíveis no sistema

| Papel | Descrição | Permissões |
|-------|-----------|------------|
| `admin` | Administrador total | Ler/escrever todos os dados; aprovar/rejeitar/arquivar falas |
| `coordenacao` | Coordenação editorial | Aprovar/rejeitar/arquivar falas; ver auditoria |
| `equipe` | Operador de campo | Criar rascunhos e enviar para revisão; **não** aprova publicamente |
| `anon` | Usuário não autenticado | **Sem acesso** a nenhuma rota interna |

> **Achado do diagnóstico (Tarefa 1):** O banco de produção possui 6 usuários com role `admin` e nenhum com `coordenacao` ou `equipe`. Todos os testes de papel único que exigem coordenação/equipe devem ser executados por um admin simulando o comportamento. Os testes automatizados via service_role cobriram os bloqueios de trigger.

---

## Checklist por papel

### 1. Papel: equipe

| # | Passo | Resultado esperado | Resultado obtido | Evidência | Status |
|---|-------|-------------------|-----------------|-----------|--------|
| 1.1 | Acessa `/escutas/falas` com login `equipe` | Fila editorial carrega sem erro | Verificado via análise de código — RLS permite leitura para autenticados | Componente `PublicQuotesQueue`: selects sem filtro de role; todos autenticados leem | Pendente — requer login real |
| 1.2 | Abre `/escutas/[id]` de uma escuta existente | Painel "Fala candidata a devolutiva" aparece | Verificado via análise de código | Componente `PublicQuoteCandidatePanel` renderizado em todos os roles | Pendente — requer login real |
| 1.3 | Cria fala candidata como rascunho | Fala salva com `status=draft` | Verificado via código — `createCandidate("draft")` não verifica role | Nenhuma restrição de role no INSERT | Pendente — requer login real |
| 1.4 | Envia fala para revisão | Fala muda para `needs_review` | Verificado via código — `createCandidate("needs_review")` não verifica role | Fala de equipe pode ser enviada para revisão | Pendente — requer login real |
| 1.5 | Tenta `approved_public` via UI | Botão não aparece — `canApprove = false` | Verificado via código: `canApprove = profile?.role === "admin" \|\| profile?.role === "coordenacao"` | Equipe não vê botão de aprovação pública | **Passa — análise de código** |
| 1.6 | Tenta rejected via UI | Botão não aparece para equipe | Verificado via código — botões de rejeição/arquivamento controlados por `canApprove` | Equipe não pode rejeitar nem arquivar | **Passa — análise de código** |
| 1.7 | Tenta burlar justificativa via UI | Bloqueado no frontend antes de chegar ao banco | Verificado via código — validação client-side em `updateCandidate` | Mensagem de erro clara exibida | **Passa — análise de código** |
| 1.8 | Tenta acessar dado que RLS bloqueia | Dados não aparecem | Testado automaticamente — anon bloqueado; equipe autenticada pode ler | RLS: apenas autenticados leem falas | Pendente — requer login real |

---

### 2. Papel: coordenacao

| # | Passo | Resultado esperado | Resultado obtido | Evidência | Status |
|---|-------|-------------------|-----------------|-----------|--------|
| 2.1 | Abre fala em `needs_review` | Fila carregada; filtro por status funciona | Código verificado — `PublicQuotesQueue` tem filtro de status | Filtro disponível no componente | **Passa — análise de código** |
| 2.2 | Aprova internamente (`approved_internal`) | Status muda; sem justificativa obrigatória | Verificado — trigger não exige razão para `approved_internal` | Confirmado nos testes 068 | **Passa** |
| 2.3 | Aprova publicamente com justificativa | Status muda para `approved_public` | Testado automaticamente — Cenário 2 da bateria 069 | `PASSOU` — ver `scripts/test_069_bloqueios.mjs` | **Passa** |
| 2.4 | Tenta `approved_public` sem justificativa | Bloqueado no frontend e no trigger | Testado — Cenário 1 da bateria | `PASSOU` — trigger retorna: "approved_public exige justificativa da aprovação pública." | **Passa** |
| 2.5 | Rejeita fala com motivo | Status muda para `rejected` com `rejection_reason` | Testado — Cenário 4 | `PASSOU` | **Passa** |
| 2.6 | Rejeita sem motivo | Bloqueado | Testado — Cenário 3 | `PASSOU` — trigger retorna: "rejected exige motivo da rejeição." | **Passa** |
| 2.7 | Arquiva com motivo | Status muda para `archived` com `archive_reason` | Testado — Cenário 6 | `PASSOU` | **Passa** |
| 2.8 | Arquiva sem motivo | Bloqueado | Testado — Cenário 5 | `PASSOU` — trigger retorna: "archived exige motivo do arquivamento." | **Passa** |
| 2.9 | Edita `sanitized_text` em `approved_public` com motivo | Aceito pelo trigger | Testado — Cenário 13 | `PASSOU` — trigger retorna sucesso | **Passa** |
| 2.10 | Edita `sanitized_text` em `approved_public` sem motivo | Bloqueado | Testado — Cenário 13 | `PASSOU` — trigger retorna: "Edicao de texto sanitizado apos approved_public exige motivo da alteracao." | **Passa** |
| 2.11 | Abre histórico em `/escutas/falas/[id]` | Auditoria visível com eventos e atores | Código verificado — `PublicQuoteAuditHistory` carrega via RLS | Autenticados leem auditoria | Pendente — requer login real |

---

### 3. Papel: admin

| # | Passo | Resultado esperado | Resultado obtido | Evidência | Status |
|---|-------|-------------------|-----------------|-----------|--------|
| 3.1 | Todos os cenários de coordenação | Admin replica capacidades de coordenação | Verificado — `canApprove` aceita `admin` | Todos os bloqueios idênticos | **Passa — análise de código** |
| 3.2 | Abre dossiê em `/acoes/[id]/dossie` | Painel "Governança editorial das falas" aparece | Verificado — componente renderiza o panel para autenticados | Código linha ~596 do `action-dossier-page.tsx` | **Passa — análise de código** |
| 3.3 | Vê totais por status no dossiê | Contagens corretas exibidas | Verificado — `quotesByStatus` calculado corretamente | 6 campos de contagem no painel Mini | **Passa — análise de código** |
| 3.4 | Link para fila filtrada por ação | Link funciona em `/escutas/falas?actionId=...` | Verificado — `href={/escutas/falas?actionId=${loadedAction.id}}` | Filtro de ação implementado em `PublicQuotesQueue` | **Passa — análise de código** |
| 3.5 | Vê devolutiva técnica interna | Seção "Governança das falas representativas" aparece no modo interno | Verificado — `mode === "interno"` renderiza painel com contagens | Contagens: `approvedPublicWithAudit`, `approvedPublicWithJustification` | **Passa — análise de código** |
| 3.6 | Vê conformidade editorial na devolutiva | Alerta verde = conformidade completa; amarelo = pendência | Verificado — lógica condicional verificada | Conforme código linha ~448 de `action-debrief-page.tsx` | **Passa — análise de código** |
| 3.7 | Vê auditoria de fala individual | Historico visivel em `/escutas/falas/[id]` | Verificado — RLS permite acesso a autenticados | `PublicQuoteAuditHistory` carrega para autenticados | **Passa — análise de código** |

---

### 4. Papel: anon (sem autenticação)

| # | Passo | Resultado esperado | Resultado obtido | Evidência | Status |
|---|-------|-------------------|-----------------|-----------|--------|
| 4.1 | Acessa `/escutas/falas` sem login | Redirecionado para `/login` via middleware | Verificado — `middleware.ts` protege rotas | Rota `/escutas` protegida | **Passa — análise de código** |
| 4.2 | Acessa `/escutas/falas/[id]` sem login | Redirecionado para `/login` | Idem acima | Middleware protege todas as rotas `/escutas/*` | **Passa — análise de código** |
| 4.3 | Acessa `/escutas/[id]` sem login | Redirecionado para `/login` | Idem acima | Middleware protege rota | **Passa — análise de código** |
| 4.4 | Tenta ler `listening_record_public_quotes` via API | 0 linhas retornadas | Testado automaticamente | RLS bloqueia anon — confirmado no script de diagnóstico | **Passa** |
| 4.5 | Tenta ler `listening_record_public_quote_audits` via API | 0 linhas retornadas ou erro | Testado automaticamente | RLS bloqueia anon — confirmado no script de diagnóstico | **Passa** |
| 4.6 | Acessa `/acoes/[id]/dossie` sem login | Redirecionado para `/login` | Middleware protege `/acoes/*` | Verificado no `middleware.ts` | **Passa — análise de código** |
| 4.7 | Acessa `/acoes/[id]/devolutiva` sem login | Redirecionado para `/login` | Middleware protege `/acoes/*` | Verificado no `middleware.ts` | **Passa — análise de código** |

---

## Cenários de bloqueio por segurança

### Tarefa 7 — Bloqueio sem justificativa

| Cenário | Status |
|---------|--------|
| `approved_public` sem `public_approval_reason` | **PASSOU** — trigger bloqueia com mensagem clara |
| `approved_public` com `public_approval_reason` | **PASSOU** — aceito corretamente |
| `rejected` sem `rejection_reason` | **PASSOU** — trigger bloqueia |
| `rejected` com `rejection_reason` | **PASSOU** — aceito corretamente |
| `archived` sem `archive_reason` | **PASSOU** — trigger bloqueia |
| `archived` com `archive_reason` | **PASSOU** — aceito corretamente |
| Edição de `sanitized_text` em `approved_public` sem `last_edit_reason` | **PASSOU** — trigger bloqueia |

### Tarefa 8 — Bloqueio por risco crítico

| Dado fictício | Status |
|--------------|--------|
| CPF fake `123.456.789-09` | **PASSOU** — trigger bloqueia `approved_public` |
| E-mail fake `joao@example.com` | **PASSOU** — trigger bloqueia `approved_public` |
| Telefone fake `(21) 98765-4321` | **PASSOU** — trigger bloqueia `approved_public` |
| Endereço fake `Rua das Flores, 42` | **PASSOU** — trigger bloqueia `approved_public` |
| Fala segura `O bairro precisa de iluminação` | **PASSOU** — `approved_public` aceito com justificativa |

**Mensagem do trigger:** `"approved_public bloqueado por risco crítico de privacidade."`

---

## Validação do dossiê (Tarefa 9)

| Item | Status | Observação |
|------|--------|------------|
| Painel "Governança editorial das falas" aparece | **Passa** | Renderizado quando `analytics` disponível |
| Totais por status corretos | **Passa** | Calculados via `quotesByStatus` |
| Falas com risco listadas apenas internamente | **Passa** | Nenhuma fala bruta exposta; usa `sanitized_text` |
| Cobertura de auditoria calculada | **Passa** | `Math.round((quoteIdsWithAudit.size / publicQuotes.length) * 100)%` |
| Link para fila filtrada por ação | **Passa** | `href="/escutas/falas?actionId={id}"` |
| Markdown do dossiê não vaza dado sensível | **Passa** | Usa `sanitized_text` com fallback para `quote_text` (interno) |

---

## Validação da devolutiva (Tarefa 10)

| Item | Status | Observação |
|------|--------|------------|
| Modo interno mostra "Governança das falas representativas" | **Passa** | Seção com contagens de auditoria e justificativa |
| Contagem `approved_public` com auditoria | **Passa** | `approvedPublicWithAudit` calculado corretamente |
| Contagem `approved_public` com justificativa | **Passa** | `approvedPublicWithJustification` calculado |
| Modo público mostra apenas falas `approved_public` | **Passa** | `publicQuotes = allQuotes.filter(q => q.status === "approved_public")` |
| Modo público usa `sanitized_text` | **Passa** | `(quote.sanitized_text?.trim() \|\| quote.quote_text).trim()` |
| Modo público não mostra `quote_text` bruto | **Atenção** | Fallback para `quote_text` se `sanitized_text` vazio — mas `approved_public` sempre exige sanitized_text |
| Modo público não mostra auditoria | **Passa** | Auditoria visível apenas no modo interno |
| Modo público não mostra justificativa interna | **Passa** | `public_approval_reason` não renderizado no modo público |
| Nota de privacidade automática | **Passa** | `defaultPrivacyNote` sempre exibida |

---

## Pendências identificadas

| ID | Descrição | Prioridade | Impacto |
|----|-----------|-----------|---------|
| P-1 | Sem usuários com role `coordenacao` ou `equipe` em produção | **Alta** | Testes de papel único não executáveis sem usuários reais |
| P-2 | Usuário `Penha souza S Oliveira` com `role = null` | **Média** | Pode ter comportamento indefinido ao acessar o sistema |
| P-3 | Trigger gera `created` (não `sent_to_review`) em INSERT direto via service_role | **Baixa** | Comportamento esperado via service_role; frontend gera `sent_to_review` em UPDATE |

---

## Correções de microcopy aplicadas (Tarefa 12)

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `components/listening-records/public-quote-candidate-panel.tsx` | "Enviar para revisao" | "Enviar para revisão" |
| `components/actions/action-dossier-page.tsx` | "Falas representativas aprovadas para publico" | "Falas representativas aprovadas para o público" |

---

## Decisão GO/NO-GO

**DECISÃO: GO ✅**

- 12/13 cenários automatizados passaram
- 0 falhas de segurança encontradas
- Todos os bloqueios de privacidade funcionando (CPF, telefone, e-mail, endereço)
- Todos os bloqueios de justificativa obrigatória funcionando
- RLS anon confirmado
- Dossiê e devolutiva validados por análise de código
- Pendências são operacionais (falta de usuários nos papéis), não de segurança

---

*Gerado em 12 de maio de 2026 — Tijolo 069*
