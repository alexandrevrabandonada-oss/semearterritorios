# Homologação das Falas Representativas Auditadas — Tijolo 067

**Versão:** 1.0  
**Data:** 2026-05-11  
**Responsável técnico:** Equipe SEMEAR Territórios  
**Escopo:** Homologação do fluxo editorial auditado das falas representativas, implementado no Tijolo 066.

---

## 1. Objetivo da homologação

Verificar que o fluxo completo de auditoria editorial das falas representativas está funcional, seguro e rastreável, incluindo:

- Colunas de justificativa obrigatória na tabela `listening_record_public_quotes`
- Tabela de auditoria `listening_record_public_quote_audits`
- Trigger de governança `apply_public_quote_workflow_guard()`
- Componentes de fila, histórico e governança
- Integridade das RLS policies
- Conformidade dos tipos TypeScript

---

## 2. Artefatos verificados

### 2.1 Banco de dados (migration 20260511170000)

| Artefato | Estado |
|---|---|
| Coluna `public_approval_reason` em `listening_record_public_quotes` | ✅ Presente |
| Coluna `rejection_reason` | ✅ Presente |
| Coluna `archive_reason` | ✅ Presente |
| Coluna `last_edit_reason` | ✅ Presente |
| Tabela `listening_record_public_quote_audits` | ✅ Criada |
| Índice por `(quote_id, changed_at desc)` | ✅ Presente |
| Índice por `(action_id, changed_at desc)` | ✅ Presente |
| Índice por `(event_type, changed_at desc)` | ✅ Presente |
| Trigger `apply_public_quote_workflow_guard()` | ✅ Substituído com logs automáticos |

### 2.2 Código da aplicação

| Artefato | Estado |
|---|---|
| `lib/database.types.ts` — tipos atualizados | ✅ Validado |
| `lib/public-quote-audit.ts` — funções de auditoria | ✅ Presente |
| `lib/public-quote-privacy.ts` — detector de risco | ✅ Presente |
| `lib/public-quotes.ts` — labels de status e evento | ✅ Atualizado no 067 |
| `components/listening-records/public-quotes-queue.tsx` | ✅ Com auditoria e justificativa |
| `components/listening-records/public-quote-candidate-panel.tsx` | ✅ Com auditoria e justificativa |
| `components/listening-records/public-quote-audit-history.tsx` | ✅ Criado |
| `app/escutas/falas/[id]/page.tsx` | ✅ Rota de histórico |
| `components/actions/action-dossier-page.tsx` — painel de governança | ✅ Atualizado |
| `components/actions/action-debrief-page.tsx` — conformidade editorial | ✅ Atualizado |

---

## 3. Cenários homologados

### Cenário 1 — Aprovação pública com justificativa

**Pré-condição:** Fala com `sanitized_text` preenchido, sem `sensitive_risk`, usuário com papel `coordenacao` ou `admin`.  
**Ação:** Preencher `Justificativa editorial` e clicar em "Aprovar pública".  
**Resultado esperado:**
- Status muda para `approved_public`
- Campo `public_approval_reason` salvo no banco
- Trigger auto-registra evento `approved_public` em `listening_record_public_quote_audits` com `reason = public_approval_reason`
- Fala aparece na devolutiva pública

**Proteções verificadas no trigger:**
- `get_user_role() not in ('admin', 'coordenacao')` → `raise exception 'Papel insuficiente para aprovação pública.'`
- `sanitized_text` vazio → `raise exception 'approved_public exige sanitized_text preenchido.'`
- `sensitive_risk = true` → `raise exception 'approved_public bloqueado por risco crítico de privacidade.'`
- `public_approval_reason` vazio → `raise exception 'approved_public exige justificativa da aprovação pública.'`

---

### Cenário 2 — Aprovação pública SEM justificativa (deve bloquear)

**Pré-condição:** Fala sanitizada, sem risco, usuário `coordenacao`.  
**Ação:** Clicar em "Aprovar pública" sem preencher a justificativa.  
**Resultado esperado:** Validação na camada app bloqueia antes de enviar para o Supabase. Mensagem: _"Aprovação pública exige justificativa editorial."_  
**Resultado no banco (segunda camada):** Mesmo que a validação da app fosse contornada, o trigger rejeitaria com exceção SQL.

---

### Cenário 3 — Aprovação pública com risco crítico de privacidade (deve bloquear)

**Pré-condição:** Fala com CPF, telefone ou e-mail no `sanitized_text`.  
**Ação:** Tentar aprovar publicamente.  
**Resultado esperado:** Detector `assessPublicQuotePrivacy()` bloqueia na camada app. Mesmo que contornado, o trigger verifica `sensitive_risk = true` e rejeita.  
**Microcopy validado:** Badge "Risco crítico" aparece no card antes mesmo de tentar aprovar.

---

### Cenário 4 — Rejeição com justificativa obrigatória

**Pré-condição:** Fala em qualquer status (exceto `archived`).  
**Ação:** Preencher motivo e clicar em "Rejeitar".  
**Resultado esperado:** Status muda para `rejected`, `rejection_reason` salvo, evento `rejected` registrado na auditoria.

**Bloqueio sem justificativa:** Validação app: _"Rejeição exige motivo da rejeição."_

---

### Cenário 5 — Arquivamento com justificativa obrigatória

**Ação:** Preencher motivo e clicar em "Arquivar".  
**Resultado esperado:** Status muda para `archived`, `archive_reason` salvo, evento `archived` registrado.

---

### Cenário 6 — Edição do texto sanitizado após aprovação pública

**Pré-condição:** Fala com status `approved_public`.  
**Ação:** Alterar `sanitized_text` e salvar (via edição inline no painel de candidatura).  
**Resultado esperado:** Campo `last_edit_reason` é exigido. Se vazio → bloqueia com mensagem. Se preenchido → salva e trigger registra evento `sanitized_text_changed` com `old_sanitized_text`, `new_sanitized_text` e `reason`.

---

### Cenário 7 — Acesso não autorizado à auditoria (RLS)

**Pré-condição:** Usuário com role `anon` (não autenticado).  
**Ação:** Tentar ler `listening_record_public_quote_audits`.  
**Resultado esperado:** RLS bloqueia totalmente. Nenhum evento de auditoria visível.  

**Para equipe autenticada:** Pode ler. Pode inserir apenas onde `changed_by = auth.uid()`.  
**Não pode inserir** com `changed_by` de outro usuário.

---

### Cenário 8 — Fala original nunca exposta publicamente

**Verificação:** `quote_text` (trecho original interno) nunca aparece em rotas públicas nem na devolutiva pública.  
**Confirmado:** `action-debrief-page.tsx` modo público usa apenas `sanitized_text` de falas `approved_public`. Histórico editorial e painel de governança só renderizam em modo técnico interno.

---

### Cenário 9 — Painel de governança no dossiê

**Pré-condição:** Dossiê de ação com falas processadas.  
**Resultado esperado no dossiê:**
- Total de falas, aprovadas públicas, com risco, pendentes de justificativa
- Editadas após aprovação
- Percentual de cobertura de auditoria
- Link para fila filtrada por `?actionId=...`

---

### Cenário 10 — Conformidade editorial na devolutiva (modo técnico interno)

**Resultado esperado:**
- Contagem `aprovadas_com_auditoria / total_aprovadas_publicas`
- Contagem `aprovadas_com_justificativa / total_aprovadas_publicas`
- Indicador verde se conformidade total; âmbar com aviso se alguma fala aprovada sem justificativa ou auditoria

---

## 4. Tipos TypeScript validados

| Tipo | Estado |
|---|---|
| `PublicQuoteStatus` | ✅ |
| `PublicQuoteAuditEventType` (union) | ✅ |
| `ListeningRecordPublicQuote` com 4 novas colunas | ✅ |
| `ListeningRecordPublicQuoteAudit` | ✅ |
| `Database["public"]["Tables"]["listening_record_public_quote_audits"]` | ✅ |
| Insert type com `null` explícito para colunas opcionais | ✅ |

---

## 5. Microcopy melhorado no Tijolo 067

| Local | Antes | Depois |
|---|---|---|
| Fila de falas — label evento | `event_type` (bruto) | _"Aprovada para publicação"_, _"Rejeitada"_, etc. |
| Fila de falas — campo interno | "Trecho original interno" | "Trecho original (interno — não aparece na devolutiva pública)" |
| Fila de falas — versão pública | "Versão sanitizada" | "Versão pública sanitizada" |
| Fila de falas — placeholder justificativa | texto técnico | "Obrigatória para aprovação pública, rejeição e arquivamento. Registrada na trilha de auditoria." |
| Fila de falas — painel evento | sem aviso de confidencialidade | "Histórico editorial é interno e não aparece na devolutiva pública." |
| Histórico de auditoria — subtítulo | sem aviso | + "Esta tela é interna e não aparece na devolutiva pública." |
| Histórico de auditoria — label evento | `event_type` (bruto) | label amigável via `getPublicQuoteAuditEventLabel()` |
| Painel candidatura — form criação | "Versao sanitizada" | "Versão pública sanitizada (obrigatória para aprovar publicamente)" |

---

## 6. Resultado da validação técnica

| Etapa | Resultado |
|---|---|
| `npm run lint` | ✅ Sem erros ou avisos |
| `npm run build` (TypeScript strict) | ✅ Compilação limpa |
| `npm run verify` | ✅ Exit code 0, 49 rotas |
| Tipagem dos Insert types com novas colunas | ✅ Corrigida no 066 |
| RLS policies (anon bloqueado, equipe pode ler) | ✅ Na migration |
| Trigger de governança (duas camadas) | ✅ App + SQL |

---

## 7. O que NÃO foi feito (intencionalmente)

- Nenhuma fala original exposta em rota pública
- Nenhum dado de auditoria na devolutiva pública
- Nenhum uso de `service_role` no frontend
- Nenhuma IA gerando ou sugerindo conteúdo de falas
- Nenhum quote inventado ou preenchido automaticamente
- RLS não foi enfraquecida

---

## 8. Pendências e próximos passos

| Pendência | Prioridade | Tijolo sugerido |
|---|---|---|
| Aplicar migration ao banco remoto (produção/staging) | Concluída | Executado no Tijolo 068 |
| Teste de aceitação real com usuário `equipe` logado | Média | Sessão operacional |
| Exportação do relatório de governança em PDF | Baixa | Futura feature |
| Política de retenção dos eventos de auditoria | Baixa | Decisão editorial |

---

## 8.1 Fechamento em produção (Tijolo 068)

Após a homologação local do 067, o 068 concluiu o deploy remoto e trouxe dois ajustes técnicos versionados:

- `20260511200000_fix_public_quote_risk_regex.sql`:
	- corrige regex da função de risco para sintaxe PostgreSQL.
- `20260511203000_make_quote_audit_fk_deferrable.sql`:
	- corrige FK da auditoria para permitir gravação transacional no trigger.

Com isso, a trilha de auditoria ficou operacional no remoto, com validação automatizada de eventos e constraints.

---

## 9. Assinatura da homologação

- **Tijolo 066 (base):** Implementado e validado tecnicamente
- **Tijolo 067 (homologação):** Documentação, microcopy e conformidade verificados
- **Status:** ✅ Aprovado para uso operacional após próximo deploy da migration
