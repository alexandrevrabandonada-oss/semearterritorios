# Estado da Nação: Tijolo 060 - Dashboard de Qualidade Territorial e Alertas Operacionais

**Período**: Maio 2026  
**Status**: Implementado ✅  
**Escopo**: visibilidade operacional da qualidade territorial no Dashboard, com foco em orientação e revisão

---

## Diagnóstico inicial

O Tijolo 059 já havia entregue:

- cálculo de cobertura de território de referência;
- painel e fila de revisão em `/escutas/revisao-territorial`;
- auditoria de correções em `listening_record_field_audits`;
- documentação de governança e seção em `/ajuda`.

Lacuna observada:

- coordenação só enxergava qualidade territorial dentro da área de revisão;
- faltava visibilidade imediata no Dashboard para orientar operação semanal;
- faltava alerta contextual na seção de próxima operação.

---

## Mudanças no Dashboard

Arquivo principal atualizado: `components/dashboard.tsx`.

### 1) Card principal: Qualidade territorial

Adicionado bloco com:

- cobertura geral (%);
- total de escutas;
- total com território de referência;
- total sem território de referência;
- status: boa, atenção ou crítica;
- microcopy metodológica;
- botão direto para revisão.

Link de revisão:

- `/escutas/revisao-territorial?tab=qualidade`

Microcopy aplicada:

- "Mostra quantas escutas têm território de referência do entrevistado preenchido. Não é endereço nem geolocalização."

### 2) Bloco: Ações com baixa cobertura territorial

Adicionado bloco com lista de ações abaixo de 80%:

- título da ação;
- território da ação;
- data;
- total de escutas;
- cobertura;
- escutas sem território;
- botão `Revisar`;
- link para pós-banca da ação.

Classificação:

- crítica: < 50%;
- atenção: 50% a 79%;
- boa: >= 80%.

Linguagem de cuidado aplicada em cada card:

- "Esta ação precisa de revisão territorial antes de gerar leitura por bairro."

### 3) Próxima operação com aviso de pendência

Na seção "Próxima operação", quando há escutas sem território:

- exibe alerta com total pendente;
- exibe botão `Corrigir território`.

Mensagem aplicada:

- "Há X escutas sem território de referência. Revise antes de publicar sínteses territoriais."

### 4) Bloco metodológico

Adicionado aviso fixo:

- título: "Como ler este indicador";
- texto orientando cautela quando cobertura está baixa;
- referência explícita ao impacto em relatórios e Transparência Viva.

### 5) Visão por entrevistador com cuidado

Implementada visão discreta interna:

- seção "Onde orientar a equipe";
- apenas para perfil `coordenacao` e `admin`;
- sem ranking punitivo e sem linguagem moral;
- foco em apoio e treinamento.

---

## Componente novo

Novo componente criado:

- `components/dashboard/territorial-quality-by-action.tsx`

Características:

- renderização em cards (boa para mobile);
- status por ação (boa/atenção/crítica);
- links para `/pos-banca` e revisão territorial;
- mensagem de cuidado metodológico.

---

## Link rápido para revisão (deep-link)

Arquivo atualizado:

- `components/listening-records/territorial-review-queue.tsx`

Ajustes:

- leitura de querystring `tab=qualidade` para abrir diretamente a aba correta;
- leitura de `actionId` para pré-filtrar revisão por ação quando vier do Dashboard.

Exemplo:

- `/escutas/revisao-territorial?tab=qualidade&actionId=<id-da-acao>`

---

## Comportamento mobile

Entregas mobile:

- card de qualidade territorial aparece próximo ao topo;
- botão de revisão com área de toque grande;
- ações críticas em cards (sem tabela espremida);
- alerta de pendência territorial na área móvel de operação.

---

## Documentação atualizada

1. `docs/governanca-qualidade-territorial.md`

Incluído:

- acompanhamento pelo Dashboard (Tijolo 060);
- quando revisar antes da devolutiva;
- quando revisar antes da Transparência Viva;
- orientação de equipe sem punição.

2. `app/ajuda/page.tsx`

Incluído na seção "Qualidade territorial das escutas":

- onde ver no Dashboard;
- interpretação dos status;
- reforço de que cobertura baixa não bloqueia operação, mas exige cautela.

---

## Testes realizados

### Cenário funcional

Cenário de referência usado para validação de regra:

- 10 escutas;
- 6 com território de referência;
- 4 sem território;
- cobertura esperada: 60%;
- status esperado: atenção;
- ação com 60% deve aparecer em "Ações com baixa cobertura territorial";
- botão deve levar para revisão.

Resultado esperado no Dashboard:

- cobertura exibida como 60%;
- status "atenção";
- listagem da ação em baixa cobertura;
- navegação para `/escutas/revisao-territorial?tab=qualidade`.

### Verificação técnica

Comandos executados:

- `npm run lint` ✅
- `npm run build` ✅
- `npm run verify` ✅

Build gerou 48 rotas sem erro.

---

## Riscos restantes

1. Em bases muito grandes, agregação client-side por ação pode crescer em custo; observar performance e paginar se necessário.
2. Visão de orientação por entrevistador depende de `interviewer_team_member_id` preenchido; lacunas históricas reduzem utilidade.
3. Cobertura baixa continua não bloqueante (intencional); exige disciplina operacional para revisão antes de sínteses críticas.

---

## Próximo tijolo recomendado

**Tijolo 061 - Nota metodológica automática em relatórios mensais**

- inserir cobertura territorial do período no topo do relatório;
- aplicar aviso automático quando status for atenção/crítica;
- padronizar texto para uso em devolutiva e snapshot público.

---

## Conclusão

O Tijolo 060 leva a governança de qualidade territorial para o centro da operação, sem criar bloqueios ou punição:

1. cobertura geral ficou visível no Dashboard;
2. ações críticas ficaram identificáveis com link de revisão;
3. próxima operação recebeu alerta de pendência territorial;
4. leitura metodológica foi reforçada;
5. coordenação ganhou visão de apoio à equipe, sem ranking punitivo.

Pronto para uso operacional diário ✅
