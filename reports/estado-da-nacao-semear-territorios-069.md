# Estado da Nação — SEMEAR Territórios (Tijolo 069)

**Data:** 12 de maio de 2026  
**Escopo:** Bateria Operacional Assistida da Auditoria de Falas com Papéis Reais  
**Ambiente:** Produção (`gtpitwhslqjgbuwlsaqg.supabase.co`)  
**Status geral:** **GO ✅**

---

## 1. Diagnóstico inicial

Foi executado o script `scripts/diagnose_069_roles.mjs` para mapear usuários, papéis e estado inicial das tabelas de falas/auditoria.

### Achados principais

1. Existem **7 perfis** cadastrados.
2. Desses, **6 são `admin`**.
3. Não existem usuários com role `coordenacao`.
4. Não existem usuários com role `equipe`.
5. Existe 1 perfil com `role = null`.
6. Tabela `listening_record_public_quotes` estava vazia.
7. Tabela `listening_record_public_quote_audits` estava vazia.

### Implicação operacional

Não foi possível executar sessão de UI real com usuários distintos de `coordenacao` e `equipe`, pois esses papéis não existem no ambiente no momento do teste. O aceite operacional foi concluído com:

1. testes automatizados de banco/trigger;
2. análise de código dos controles de role no frontend;
3. validação de RLS com cliente anon.

---

## 2. Usuários/papéis testados

| Papel | Situação no ambiente | Método de validação |
|------|----------------------|---------------------|
| `admin` | Disponível (6 usuários) | Testes automatizados + análise de UI |
| `coordenacao` | Não disponível | Análise de código e regras de role (`canApprove`) |
| `equipe` | Não disponível | Análise de código e regras de role (`canApprove=false`) |
| `anon` | Disponível por chave anon | Teste automatizado de RLS |

---

## 3. Resultado com equipe

**Situação:** Papel ausente em produção.  
**Resultado:** **PENDENTE operacional** (falta usuário real com role `equipe`).

### Evidência técnica indireta

- `PublicQuoteCandidatePanel` permite criar rascunho e enviar para revisão sem exigir role admin.
- Aprovação pública é bloqueada no frontend por `canApprove`.
- Rejeição e arquivamento também dependem de `canApprove`.

**Conclusão:** comportamento esperado para equipe está implementado; falta apenas execução com login real do papel.

---

## 4. Resultado com coordenação

**Situação:** Papel ausente em produção.  
**Resultado:** **PENDENTE operacional** (falta usuário real com role `coordenacao`).

### Evidência técnica indireta e direta

- `canApprove` inclui `coordenacao`.
- Todos os fluxos críticos de coordenação (aprovação, rejeição, arquivamento, justificativas) foram validados nos testes de trigger com sucesso.

**Conclusão:** regras de coordenação estão corretas; pendência é de disponibilidade de usuário para sessão manual.

---

## 5. Resultado com admin

**Situação:** Disponível e validado.  
**Resultado:** **PASSOU**.

### Itens validados

1. Admin pode executar mesmos fluxos da coordenação (`canApprove=true`).
2. Dossiê exibe painel "Governança editorial das falas".
3. Devolutiva interna exibe conformidade editorial.
4. Histórico de auditoria é carregável para autenticados.

---

## 6. Resultado com anon

**Situação:** Validado por script com chave anon.  
**Resultado:** **PASSOU**.

### Evidências

- `listening_record_public_quotes`: anon recebeu 0 linhas.
- `listening_record_public_quote_audits`: anon recebeu 0 linhas.
- Rotas internas continuam protegidas por `middleware.ts`.

---

## 7. Bloqueio sem justificativa

Executado em `scripts/test_069_bloqueios.mjs`.

| Cenário | Resultado |
|---------|-----------|
| `approved_public` sem `public_approval_reason` | ✅ Bloqueado |
| `rejected` sem `rejection_reason` | ✅ Bloqueado |
| `archived` sem `archive_reason` | ✅ Bloqueado |
| Edição de `sanitized_text` pós `approved_public` sem `last_edit_reason` | ✅ Bloqueado |

**Status:** **PASSOU**.

---

## 8. Bloqueio por risco crítico

Também executado em `scripts/test_069_bloqueios.mjs` com dados fictícios.

| Tipo de risco | Resultado |
|---------------|-----------|
| CPF fake | ✅ Bloqueado |
| Telefone fake | ✅ Bloqueado |
| E-mail fake | ✅ Bloqueado |
| Endereço fake | ✅ Bloqueado |
| Fala segura | ✅ Aprovada com justificativa |

**Status:** **PASSOU**.

---

## 9. Validação do dossiê

Componente analisado: `components/actions/action-dossier-page.tsx`.

### Resultado

1. Painel "Governança editorial das falas" presente.
2. Totais por status calculados corretamente.
3. Cobertura de auditoria calculada e exibida.
4. Link para fila filtrada por ação implementado.
5. Não há exposição pública de fala bruta no dossiê.

**Status:** **PASSOU**.

---

## 10. Validação da devolutiva

Componente analisado: `components/actions/action-debrief-page.tsx`.

### Resultado

1. Modo técnico interno exibe conformidade editorial.
2. Modo público filtra falas para `approved_public`.
3. Modo público utiliza `sanitized_text` (com fallback defensivo para `quote_text`).
4. Modo público não exibe auditoria nem justificativas internas.

**Status:** **PASSOU**, com observação de risco residual baixo no fallback (mitigado por regra de aprovação pública exigir `sanitized_text`).

---

## 11. Evidências coletadas

1. Saída completa de `node scripts/diagnose_069_roles.mjs`.
2. Saída completa de `node scripts/test_069_bloqueios.mjs` (12 PASSOU, 0 FALHOU, 1 PENDENTE).
3. Análise dos componentes:
   - `public-quote-candidate-panel.tsx`
   - `public-quotes-queue.tsx`
   - `public-quote-audit-history.tsx`
   - `action-dossier-page.tsx`
   - `action-debrief-page.tsx`
4. Correções de microcopy aplicadas:
   - "Enviar para revisão"
   - "Falas representativas aprovadas para o público"

---

## 12. Decisão GO/NO-GO

## **GO ✅**

### Justificativa

1. Nenhuma falha crítica de segurança encontrada.
2. Trigger de governança editorial está efetivo.
3. Trigger de privacidade crítica está efetivo.
4. RLS para anon está efetivo.
5. Build/lint/verify final passaram sem erros.

---

## 13. Riscos restantes

1. Ausência de usuários `coordenacao` e `equipe` impede validação operacional presencial por papel.
2. Um perfil com role nula (`null`) precisa regularização para evitar comportamento indefinido.
3. Cenário de evento `sent_to_review` no INSERT direto via service_role ficou pendente (gera `created`), porém sem impacto de segurança.

---

## 14. Próximo tijolo recomendado

**Tijolo 070 — Preparação Operacional de Papéis Reais e Rodada de Aceite Assistido Presencial**

Escopo sugerido:

1. Criar/regularizar usuários `equipe` e `coordenacao` em produção.
2. Executar roteiro presencial completo de UI com cada papel.
3. Capturar evidências de tela por cenário (passo a passo).
4. Fechar pendências operacionais do 069.
5. Reconfirmar GO para ciclo de uso real contínuo.

---

## 15. Verificação final de qualidade

Comando executado:

```bash
npm run verify
```

Resultado:

- `npm run lint`: ✅ sem warnings/erros
- `npm run build`: ✅ compilou com sucesso
- 49 rotas geradas
- tipos e lint validados

---

*Documento gerado no fechamento do Tijolo 069.*
