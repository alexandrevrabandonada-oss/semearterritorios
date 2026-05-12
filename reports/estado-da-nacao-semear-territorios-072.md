# Estado da Nação — SEMEAR Territórios — Tijolo 072

**Data:** 12 de maio de 2026  
**Versão:** 1.0  
**Tijolo:** 072 — Fechamento Presencial Assistido por Papel Real  
**Status:** ⏳ Checklist de execução presencial

---

## 1. Resumo executivo

O Tijolo 072 é o fechamento do ciclo técnico iniciado no Tijolo 071. Enquanto o 071 estabeleceu a base técnica de segurança e regulamentação operacional (papéis, vínculos, bloqueios), o 072 visa validar que essa base funciona de fato quando pessoas reais, em seus respectivos papéis, operam o sistema presencialmente.

**Objetivo**: transformar o status de "GO com pendências" em "GO operacional pleno" ou claramente identificar bloqueadores.

---

## 2. Diagnóstico inicial — Status confirmado

### 2.1 Distribuição de papéis

| Papel | Quantidade | Confirmado |
|-------|-----------|-----------|
| admin | 2 | ✅ |
| coordenacao | 2 | ✅ |
| equipe | 3 | ✅ |
| role null | 0 | ✅ |
| **Total** | **7** | **✅** |

### 2.2 Vínculos operacionais

- Profiles: 7
- Team members: 7
- Perfis sem team_member: 0
- **Status: COMPLETO ✅**

### 2.3 Recursos disponíveis para teste

| Recurso | Quantidade | Status |
|---------|-----------|--------|
| Ações | 3 | Pronto para teste |
| Escutas | 57 | Dados suficientes |
| Falas candidatas | 0 | Limpo — será gerado |
| Relatórios | 0 | Limpo — será gerado |
| Entradas memória | 0 | Limpo — será gerado |

---

## 3. Teste EQUIPE — Status: ⏳ Pendente

### Cenários para executar

1. Login com Google
2. Acesso a /escutas
3. Acesso a /escutas/lote
4. Sugestão de fala
5. Acesso a /memoria
6. Criação de relatório semanal
7. Restrição de governança

### Resultado esperado
- Equipe opera sem restrição em escutas, sugestão de falas, memória pessoal
- Equipe não consegue aprovar falas públicas
- Equipe não consegue rejeitar/arquivar sem permissão
- Equipe não consegue aprovar próprio relatório

### Resultado obtido
[Após teste presencial]

---

## 4. Teste COORDENAÇÃO — Status: ⏳ Pendente

### Cenários para executar

1. Login com Google
2. Revisão de escutas
3. Fila de falas (aprovação/rejeição/arquivo)
4. Bloqueio de justificativa
5. Dossiê com governança
6. Devolutiva (técnico vs público)
7. Revisão e aprovação de memória

### Resultado esperado
- Coordenação governa conteúdo sem ser admin
- Coordenação consegue revisar, aprovar, rejeitar com justificativa obrigatória
- Coordenação consegue separar e validar dados públicos/privados
- Trigger bloqueia ações sem justificativa

### Resultado obtido
[Após teste presencial]

---

## 5. Teste ADMIN — Status: ⏳ Pendente

### Cenários para executar

1. Login com Google
2. Confirmação de governança
3. Validação que admin não é necessário para operação comum

### Resultado esperado
- Admin consegue fazer tudo que coordenacao faz
- Papel admin é de exceção, não necessário para operação diária
- Equipe + coordenacao resolvem fluxo operacional comum

### Resultado obtido
[Após teste presencial]

---

## 6. Teste ANON — Status: ⏳ Pendente

### Cenários para executar

1. Bloqueio em /acoes
2. Bloqueio em /escutas
3. Bloqueio em /escutas/falas
4. Bloqueio em /memoria
5. Acesso restrito a /publico/transparencia-viva (se houver)

### Resultado esperado
- Anon bloqueado em todas as rotas internas
- Anon pode ver apenas conteúdo públicado/seguro
- Nenhum dado sensível exposto
- RLS funcionando corretamente

### Resultado obtido
[Após teste presencial]

---

## 7. Fluxos ponta a ponta — Status: ⏳ Pendente

### 7.1 Fluxo de Falas

```
Equipe sugere fala
  → armazenada em status "draft"

Coordenação revisa na fila
  → avalia risco de privacidade
  → aprova interna ou rejeita com motivo

Se aprovado internamente:
  → Coordenação aprova pública COM justificativa obrigatória
  → Trigger valida: não pode sem justificativa, não pode com risco crítico

Dossiê da ação:
  → Admin confere painel de governança das falas
  → Vê totais por status, cobertura de auditoria, edições pós-aprovação

Devolutiva:
  → Modo técnico interno: mostra todas as aprovações + auditoria
  → Modo público: mostra apenas approved_public com sanitized_text

Anon:
  → Não acessa histórico de auditoria
  → Acessa apenas devolutiva pública se fala foi published
```

**Status**: ⏳ Pendente | **Resultado**: [Após teste]

### 7.2 Fluxo de Memória

```
Equipe cria relatório semanal
  → status inicial permite envio para revisão

Equipe envia para revisão
  → coordenacao recebe notificação

Coordenação revisa
  → pode pedir ajuste ou aprovar

Coordenação aprova
  → relatório marcado como revisado

Coordenação cria entrada de memória interna
  → baseada no relatório aprovado
  → anexo permanece privado

Anon não acessa
  → RLS bloqueia leitura de weekly_team_reports
  → RLS bloqueia leitura de project_memory_entries
```

**Status**: ⏳ Pendente | **Resultado**: [Após teste]

### 7.3 Fluxo de Qualidade Territorial

```
Equipe registra escuta
  → com ou sem território de referência

Equipe identifica ausência de território
  → participa de revisão territorial

Coordenação abre revisão territorial
  → /escutas/revisao-territorial

Coordenação corrige territorio
  → SOMENTE se houver evidência anexada
  → auditoria registra alteração

Dashboard reflete cobertura
  → totais por território
  → silêncios (sem revisão)

Dossiê e Devolutiva:
  → nota metodológica coerente
  → não expõe endereço específico
  → resume cobertura por padrão administrativo
```

**Status**: ⏳ Pendente | **Resultado**: [Após teste]

---

## 8. Bugs encontrados

[Após teste presencial — documenta aqui]

| Descrição | Severidade | Ação |
|-----------|-----------|------|
| | | |

---

## 9. Correções feitas

[Durante/após teste — documenta aqui]

| Item | Tipo | Solução |
|------|------|---------|
| | | |

---

## 10. Validação técnica

### 10.1 npm run verify
- lint: [AGUARDANDO]
- build: [AGUARDANDO]
- test:transparencia: [AGUARDANDO]

### 10.2 Segurança
- Nenhuma exposição de CPF/telefone/e-mail: [AGUARDANDO]
- RLS funcionando: [AGUARDANDO]
- Trigger de justificativa: [AGUARDANDO]
- Trigger de privacidade crítica: [AGUARDANDO]
- Anon bloqueado: [AGUARDANDO]

---

## 11. Decisão GO/NO-GO

### Critérios de aceite

| Critério | Resultado | Status |
|----------|-----------|--------|
| Equipe opera sem restrição indevida | ? | ⏳ |
| Coordenacao revisa/aprova sem ser admin | ? | ⏳ |
| Admin é papel de exceção | ? | ⏳ |
| Anon bloqueado em dados internos | ? | ⏳ |
| Fluxo de falas validado ponta a ponta | ? | ⏳ |
| Fluxo de memória validado ponta a ponta | ? | ⏳ |
| Qualidade territorial funciona corretamente | ? | ⏳ |
| npm run verify passando | ? | ⏳ |
| Nenhuma falha crítica de segurança | ? | ⏳ |

### Decisão final

**Status: [AGUARDANDO TESTE PRESENCIAL]**

Se todos os critérios forem atendidos:
- ✅ **GO OPERACIONAL PLENO** — Sistema pronto para uso contínuo com papéis reais

Se houver bloqueadores não-críticos:
- ⚠️ **GO COM PENDÊNCIAS REDUZIDAS** — Próximo tijolo será resolução

Se houver falha crítica de segurança:
- ❌ **NO-GO** — Retornar para correção

---

## 12. Riscos residuais

[Documentado após teste]

| Descrição | Probabilidade | Impacto | Mitigação |
|-----------|--------------|--------|-----------|
| | | | |

---

## 13. Próximo tijolo recomendado

Após conclusão do 072, próximos passos:

1. **Se GO operacional pleno:**
   - Tijolo 073 — Operação contínua assistida (primeiras 2 semanas em produção)
   - Tijolo 074 — Integração com Transparência Viva (publicação controlada)

2. **Se GO com pendências reduzidas:**
   - Resolução de pendências
   - Re-validação
   - Então prosseguir para 073

3. **Se NO-GO:**
   - Análise de bloqueador
   - Correção
   - Retorno ao 072

---

## 14. Documentos de suporte

- `docs/aceite-presencial-executado-072.md` — Checklist detalhado de execução
- `reports/diagnostico-fechamento-presencial-072.md` — Diagnóstico técnico inicial
- `reports/aceite-presencial-final-072.md` — Relatório de aceite final

---

*Estado da Nação — SEMEAR Territórios — Tijolo 072 — 12 de maio de 2026*
