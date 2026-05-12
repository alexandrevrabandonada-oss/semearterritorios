# Aceite Presencial Executado — Tijolo 072

Data de execução: 12 de maio de 2026  
Status: Checklist de testes guiados por papel real

## Formato de cada cenário

```
- Papel: [admin/coordenacao/equipe/anon]
- Pessoa/e-mail: [mascarado]
- Rota: [url testada]
- Ação realizada: [descrição]
- Resultado esperado: [o que deve acontecer]
- Resultado obtido: [o que de fato aconteceu]
- Evidência: [print ou descrição]
- Status: [PASSOU/FALHOU/PENDENTE]
- Observações: [notas relevantes]
```

---

## PAPEL: EQUIPE

### Cenário 1.1 — Login com Google

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com (Penha)
- **Rota**: /auth/callback (após login)
- **Ação realizada**: entra com Google, é redirecionada
- **Resultado esperado**: não cai em /aguardando-liberacao; acessa dashboard
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.2 — Acesso a /escutas

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /escutas
- **Ação realizada**: abre lista de escutas
- **Resultado esperado**: vê escutas da ação/lote; consegue navegar
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.3 — Acesso a /escutas/lote

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /escutas/lote
- **Ação realizada**: abre tela de criação/edição de escuta em lote
- **Resultado esperado**: formulário de lote visível; consegue selecionar ação/entrevistador
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.4 — Sugestão de fala

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /escutas/[id] (dentro de uma escuta)
- **Ação realizada**: abre escuta; sugere fala candidata; envia para revisão
- **Resultado esperado**: fala criada em status `needs_review`; equipe não consegue `approved_public`
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.5 — Acesso a /memoria

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /memoria
- **Ação realizada**: abre lista de relatórios semanais
- **Resultado esperado**: vê próprios relatórios; botão "novo" disponível
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.6 — Criação de relatório semanal (equipe)

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /memoria/novo
- **Ação realizada**: cria relatório; preenche texto; envia para revisão
- **Resultado esperado**: relatório criado em status que permite envio mas não aprovação própria
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 1.7 — Restrição de governança (equipe)

- **Papel**: equipe
- **Pessoa/e-mail**: pe***@gm***.com
- **Rota**: /escutas/falas
- **Ação realizada**: tenta acessar fila de aprovação de falas
- **Resultado esperado**: ou acessa com restrição (view-only) ou é redirecionada com mensagem apropriada
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Resumo EQUIPE

| Cenário | Status | Observações |
|---------|--------|-------------|
| 1.1 Login | ? | |
| 1.2 /escutas | ? | |
| 1.3 /escutas/lote | ? | |
| 1.4 Sugestão de fala | ? | |
| 1.5 /memoria | ? | |
| 1.6 Relatório semanal | ? | |
| 1.7 Restrição de governança | ? | |

**Decisão EQUIPE**: [PASSOU/FALHOU/PENDENTE]

---

## PAPEL: COORDENAÇÃO

### Cenário 2.1 — Login com Google

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br (Diogo)
- **Rota**: /auth/callback
- **Ação realizada**: entra com Google; é redirecionada
- **Resultado esperado**: não cai em /aguardando-liberacao; acessa dashboard
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.2 — Revisão de escutas

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /escutas/revisao-territorial (ou equivalente)
- **Ação realizada**: revisa escuta; corrige território se houver evidência
- **Resultado esperado**: consegue editar; auditoria registra; não consegue sem justificativa
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.3 — Fila de falas

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /escutas/falas
- **Ação realizada**: abre fila; revisa fala candidata; aprova interna; aprova pública com justificativa
- **Resultado esperado**: consegue todas as ações; trigger valida justificativa obrigatória
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.4 — Rejeição com motivo

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /escutas/falas/[id]
- **Ação realizada**: rejeita fala; preenche motivo da rejeição
- **Resultado esperado**: rejeição bloqueada sem motivo; passa com motivo
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.5 — Dossiê

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /acoes/[id]/dossie
- **Ação realizada**: abre painel de governança das falas; confere cobertura territorial
- **Resultado esperado**: painel exibe status das falas; sem dado sensível exposto
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.6 — Devolutiva (modo técnico e público)

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /acoes/[id]/devolutiva
- **Ação realizada**: alterna entre modo técnico e público; verifica conteúdo
- **Resultado esperado**: modo técnico mostra governança; modo público mostra apenas `approved_public` com `sanitized_text`
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 2.7 — Revisão de memória

- **Papel**: coordenacao
- **Pessoa/e-mail**: di***@id***.br
- **Rota**: /memoria
- **Ação realizada**: revisa relatório semanal; aprova ou pede ajuste; cria entrada de memória
- **Resultado esperado**: consegue revisar e criar entrada; anexo permanece privado
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Resumo COORDENAÇÃO

| Cenário | Status | Observações |
|---------|--------|-------------|
| 2.1 Login | ? | |
| 2.2 Revisão de escutas | ? | |
| 2.3 Fila de falas | ? | |
| 2.4 Rejeição com motivo | ? | |
| 2.5 Dossiê | ? | |
| 2.6 Devolutiva | ? | |
| 2.7 Revisão de memória | ? | |

**Decisão COORDENAÇÃO**: [PASSOU/FALHOU/PENDENTE]

---

## PAPEL: ADMIN

### Cenário 3.1 — Login com Google

- **Papel**: admin
- **Pessoa/e-mail**: al***@id***.br (Alexandre)
- **Rota**: /auth/callback
- **Ação realizada**: entra com Google; é redirecionada
- **Resultado esperado**: não cai em /aguardando-liberacao; acessa dashboard
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 3.2 — Confirmação de governança

- **Papel**: admin
- **Pessoa/e-mail**: al***@id***.br
- **Rota**: /acoes/[id]/dossie
- **Ação realizada**: abre dossiê; confere painel de governança
- **Resultado esperado**: painel visível; governa como coordenacao + acesso administrativo
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 3.3 — Admin não é necessário para operação comum

- **Papel**: admin
- **Pessoa/e-mail**: al***@id***.br
- **Rota**: /escutas/falas
- **Ação realizada**: abre fila como coordenacao faria
- **Resultado esperado**: consegue fazer tudo, mas confirm que equipe+coordenacao resolvem operação comum
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Resumo ADMIN

| Cenário | Status | Observações |
|---------|--------|-------------|
| 3.1 Login | ? | |
| 3.2 Governança | ? | |
| 3.3 Papel de exceção | ? | |

**Decisão ADMIN**: [PASSOU/FALHOU/PENDENTE]

---

## PAPEL: ANON (Sessão anônima)

### Cenário 4.1 — Bloqueio em /acoes

- **Papel**: anon
- **Pessoa/e-mail**: N/A
- **Rota**: /acoes
- **Ação realizada**: tenta acessar sem autenticação
- **Resultado esperado**: redirecionado para /login ou /auth
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 4.2 — Bloqueio em /escutas

- **Papel**: anon
- **Pessoa/e-mail**: N/A
- **Rota**: /escutas
- **Ação realizado**: tenta acessar sem autenticação
- **Resultado esperado**: redirecionado
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 4.3 — Bloqueio em /escutas/falas

- **Papel**: anon
- **Pessoa/e-mail**: N/A
- **Rota**: /escutas/falas
- **Ação realizada**: tenta acessar
- **Resultado esperado**: redirecionado
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 4.4 — Bloqueio em /memoria

- **Papel**: anon
- **Pessoa/e-mail**: N/A
- **Rota**: /memoria
- **Ação realizada**: tenta acessar
- **Resultado esperado**: redirecionado
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Cenário 4.5 — Acesso a /publico/transparencia-viva (se houver publicação)

- **Papel**: anon
- **Pessoa/e-mail**: N/A
- **Rota**: /publico/transparencia-viva
- **Ação realizada**: tenta acessar página pública
- **Resultado esperado**: vê apenas conteúdo publicado e seguro; sem fala bruta; sem auditoria
- **Resultado obtido**: 
- **Evidência**: 
- **Status**: PENDENTE
- **Observações**: 

### Resumo ANON

| Cenário | Status | Observações |
|---------|--------|-------------|
| 4.1 /acoes | ? | |
| 4.2 /escutas | ? | |
| 4.3 /escutas/falas | ? | |
| 4.4 /memoria | ? | |
| 4.5 /publico/transparencia-viva | ? | |

**Decisão ANON**: [PASSOU/FALHOU/PENDENTE]

---

## FLUXO PONTA A PONTA: FALAS

### Execução integrada

1. **Equipe sugere fala**
   - Resultado: 
   - Evidência: 

2. **Coordenação revisa**
   - Resultado: 
   - Evidência: 

3. **Coordenação aprova pública com justificativa**
   - Resultado: 
   - Evidência: 

4. **Admin confere dossiê**
   - Resultado: 
   - Evidência: 

5. **Devolutiva pública mostra apenas sanitized_text**
   - Resultado: 
   - Evidência: 

6. **Anon não acessa histórico interno**
   - Resultado: 
   - Evidência: 

**Status fluxo de falas**: [PASSOU/FALHOU/PENDENTE]

---

## FLUXO PONTA A PONTA: MEMÓRIA

### Execução integrada

1. **Equipe cria relatório semanal**
   - Resultado: 
   - Evidência: 

2. **Equipe envia para revisão**
   - Resultado: 
   - Evidência: 

3. **Coordenação revisa**
   - Resultado: 
   - Evidência: 

4. **Coordenação aprova ou pede ajuste**
   - Resultado: 
   - Evidência: 

5. **Coordenação cria entrada de memória interna**
   - Resultado: 
   - Evidência: 

6. **Anexo permanece privado**
   - Resultado: 
   - Evidência: 

7. **Anon não acessa**
   - Resultado: 
   - Evidência: 

**Status fluxo de memória**: [PASSOU/FALHOU/PENDENTE]

---

## FLUXO PONTA A PONTA: QUALIDADE TERRITORIAL

### Execução integrada

1. **Equipe registra escuta com território de referência**
   - Resultado: 
   - Evidência: 

2. **Equipe identifica escuta sem território**
   - Resultado: 
   - Evidência: 

3. **Coordenação abre revisão territorial**
   - Resultado: 
   - Evidência: 

4. **Coordenação corrige apenas com evidência**
   - Resultado: 
   - Evidência: 

5. **Auditoria registra alteração**
   - Resultado: 
   - Evidência: 

6. **Dashboard reflete cobertura territorial**
   - Resultado: 
   - Evidência: 

7. **Dossiê/devolutiva exibem nota metodológica coerente**
   - Resultado: 
   - Evidência: 

**Status qualidade territorial**: [PASSOU/FALHOU/PENDENTE]

---

## BUGS E AJUSTES ENCONTRADOS

| Descrição | Severidade | Status | Solução |
|-----------|-----------|--------|---------|
| | | | |

---

## DECISÃO FINAL DE ACEITE

**GO operacional pleno?** [SIM/NÃO/PENDENTE]

**Critérios:**
- Equipe opera: ?
- Coordenação revisa/aprova: ?
- Admin governa: ?
- Anon bloqueado: ?
- Fluxo de falas aprovado: ?
- Fluxo de memória aprovado: ?
- Qualidade territorial validada: ?
- Verify passando: ?
- Nenhuma falha crítica de segurança: ?

---

*Documento de execução — Tijolo 072 — Fechamento Presencial Assistido por Papel Real*
