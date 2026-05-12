# Governança de Qualidade Territorial de Referência

## Sumário

O Tijolo 059 cria uma camada de governança de qualidade territorial focada no preenchimento de **território de referência do entrevistado** — informação que representa de onde a pessoa fala, mora, circula ou ao qual se refere.

Diferente do Tijolo 058 que **separou** territorio da ação de territorio de referência, o Tijolo 059 **mede, revisa e governa a qualidade** do campo de território de referência.

---

## Diferença entre Território da Ação e Territorio de Referência do Entrevistado

### Territorio da Ação
- **O quê**: Local onde a atividade (ação ou evento) aconteceu
- **Quando**: Preenchido no cadastro da ação
- **Exemplo**: Feira no Centro de Volta Redonda
- **Usado em**: Filtros operacionais, mapa de "onde realizamos ações"

### Territorio de Referência do Entrevistado
- **O quê**: Bairro ou región de onde a pessoa fala, trabalha, estuda, circula ou ao qual se refere
- **Quando**: Preenchido ao capturar cada escuta (listening record)
- **Exemplo**: Pessoa que mora em Retiro ou trabalha em Aterrado
- **Usado em**: Análise de chegada, mapa de "de onde vêm as pessoas", relatórios de origem territorial

### Por Que Separar?
Uma ação pode acontecer em um lugar, mas as pessoas escutadas vêm de vários territórios. Ex:
- **Ação**: Feira no Centro
- **Pessoas escutadas**: Moram em Retiro, trabalham em Aterrado, circulam por Volta Redonda inteira

Não separar causa ambiguidade: não se sabe se um dado se refere ao lugar da ação ou ao lugar de origem das pessoas.

---

## Por Que Preencher Territorio de Referência?

1. **Qualidade da leitura territorial**: Sem esse campo, não se sabe de onde vêm as vozes e padrões podem ser mal interpretados.
2. **Planejamento**: Entender quais bairros geram mais engajamento ajuda a priorizar onde fazer mais ações.
3. **Transparência**: Snapshot público mostra de onde vieram as contribuições (agregado, sem endereço).
4. **Auditoria**: Rastrear quem preencheu, quem corrigiu, por quê.

---

## Quando Preencher Territorio de Referência

### **Preencha quando há evidência na ficha ou na fala:**
- Pessoa menciona "Moro em..." ou "Trabalho em..."
- Ficha indica o bairro de origem
- Conversa deixa claro de qual territorio a pessoa fala

### **Marque "Não informado" quando:**
- Pessoa não menciona origem, trabalho ou referência territorial
- Informação é ambígua ou não basta para decidir
- Pessoa menciona um lugar que não é um bairro oficial (ex: "lá em cima")
- Situação de rua ou em movimento constante

---

## Quando NÃO Inventar

**Nunca faça inferência automática:**
- Não use geocodificação automática
- Não assuma que quem mora em A trabalha em B
- Não use IA para "adivinhar" territorio
- Não confunda lugar mencionado na conversa com territorio de origem
  - Ex: Pessoa fala sobre trabalho em Aterrado, mas mora em Retiro → preencha Retiro (territorio onde a pessoa está baseada)

**Se não houver base:**
- Deixe "Não informado"
- Registre nota "Sem informação suficiente"
- Não invente dado

---

## Campos de Auditoria

Cada alteração em territorio de referência é registrada em `listening_record_field_audits`:

```
- listening_record_id: Qual escuta foi alterada
- field_name: "respondent_neighborhood_id" ou "respondent_territory_relation"
- old_value: Valor anterior
- new_value: Novo valor
- reason: Por quê (ex: "Revisão de qualidade territorial")
- changed_by: Quem fez (user_id)
- changed_at: Quando (timestamp)
```

Permite rastrear correções e validar que alterações têm justificativa.

---

## Indicador de Qualidade Territorial

Calculado em `lib/territorial-quality.ts`:

```typescript
calculateRespondentTerritoryQuality(totalRecords, recordsWithTerritory)
```

Retorna:
```typescript
{
  totalRecords: number,
  recordsWithRespondentTerritory: number,
  recordsWithoutRespondentTerritory: number,
  coveragePercent: number,  // 0-100%
  qualityStatus: "boa" | "atenção" | "crítica"
}
```

### Status:
- **Boa**: ≥ 80% cobertura
- **Atenção**: 50-79% cobertura
- **Crítica**: < 50% cobertura

---

## Fila de Revisão

Em `/escutas/revisao-territorial`, aba "Qualidade de territorio de referência":

1. **Painel de qualidade**: Mostra métrica geral e status
2. **Fila de escutas sem territorio**: Cards com:
   - Ação e local da ação
   - Data da escuta
   - Lugares citados (se houver)
   - Campos para selecionar territorio e vínculo
   - Botão Revisar e Salvar

3. **Auditoria**: Cada save registra alteração

### Microcopy
> "Corrija apenas quando houver evidência na ficha ou na fala. Não invente territorio."

---

## Interpretando Cobertura Baixa

Se cobertura for < 80%:

1. **Não é dado irreparável**: Pode ser corrigido em futuras bancas ou revisão
2. **Cautela na leitura**: Leituras territoriais são parciais
3. **Próxima ação**: Treinar equipe a perguntar "De qual bairro você é?" ou "De onde você fala?"
4. **Não bloqueia operação**: Campo é opcional

---

## Exemplo de Fluxo

### Banca 1: Ação no Aterrado
- 10 escutas capturadas
- 6 tem territorio de referência preenchido (60% cobertura)
- 4 sem territorio
- **Status**: Atenção

### Revisão
- Equipe revisa 2 das 4 sem territorio
- Encontra evidência para preencher
- Registra: "Pessoa mencionou trabalho em Retiro na segunda página da ficha"
- **Auditoria**: Registra alteração + reason

### Banca 2: Ação em Aterrado (mesma ação, continuação)
- Mais 5 escutas
- Dessa vez 5/5 tem territorio preenchido
- **Status da ação**: Agora 11/15 = 73% (ainda Atenção, melhorando)

---

## Regras de RLS

- **Anon**: Sem acesso
- **Equipe**: Lê auditoria de escutas que criou ou que faz parte da ação
- **Coordenação/Admin**: Pode auditar todas as alterações
- **Inserts**: Seguem regras de edição de escutas (só editam o que criou ou ação que participa)

---

## Próximas Etapas

1. **Monitore regularmente**: Checagem semanal de cobertura
2. **Treine equipe**: Reforçar pergunta de territorio em cada banca
3. **Alerta em ações**: Dashboard mostra ações críticas
4. **Integre em pós-banca**: Revisor vê qualidade territorial antes de fechar ação

---

## Acompanhamento no Dashboard (Tijolo 060)

O Dashboard principal agora mostra uma visão operacional de qualidade territorial com cinco blocos:

1. **Card "Qualidade territorial"**
  - Cobertura geral (%)
  - Total de escutas com e sem território de referência
  - Status boa, atenção ou crítica
  - Atalho: **Revisar escutas sem território**

2. **Ações com baixa cobertura territorial**
  - Lista ações com cobertura abaixo de 80%
  - Classifica em crítica (&lt; 50%) e atenção (50% a 79%)
  - Mostra total de escutas, sem território e links de revisão
  - Linguagem de cuidado: não é punição

3. **Aviso na Próxima operação**
  - Se houver pendência territorial, exibe alerta de revisão antes de sínteses por bairro

4. **Bloco metodológico "Como ler este indicador"**
  - Reforça que cobertura baixa exige cautela para leitura territorial

5. **Onde orientar a equipe (interno)**
  - Visão restrita à coordenação/admin
  - Foco em suporte e treinamento, sem ranking punitivo

---

## Quando revisar antes da devolutiva

Recomenda-se revisar escutas sem território de referência quando:

- cobertura da ação estiver abaixo de 80%;
- houver mais de 3 escutas sem território na ação;
- for necessário comparar padrões entre bairros na devolutiva.

Se a cobertura estiver baixa, use linguagem metodológica explícita de cautela na devolutiva.

---

## Quando revisar antes da Transparência Viva

Antes de snapshot público, revisar quando:

- cobertura geral do recorte estiver em atenção ou crítica;
- ações principais do período tiverem baixa cobertura territorial;
- a leitura pública depender de comparação entre bairros.

Cobertura baixa não bloqueia publicação, mas exige nota metodológica clara sobre limites de interpretação.

---

## Como orientar equipe sem punição

Diretriz institucional:

- usar o painel para identificar **onde apoiar** a equipe;
- evitar exposição individual como ranking ou punição;
- priorizar formação prática de pergunta territorial na banca;
- reconhecer quando "não informado" é a decisão correta por falta de evidência;
- auditar correções com justificativa objetiva.

---

## Referências

- **Tijolo 058**: Separou territorio da ação de territorio de referência nas visualizações
- **Fila de revisão**: `/escutas/revisao-territorial` (aba "Qualidade de territorio de referência")
- **Dashboard**: Card "Qualidade territorial" mostra cobertura geral
- **Relatórios**: Incluem nota metodológica sobre cobertura
- **Transparência Viva**: Snapshot indica se cobertura é baixa

---

## Trava editorial opcional por risco territorial crítico (Tijolo 062)

Quando a cobertura territorial entra em status **crítica** (&lt; 50%), o SEMEAR passa a adotar uma trava editorial opcional para publicação pública:

- **não bloqueia a operação interna** (cadastro, revisão, devolutiva, dossiê, agenda e memória seguem funcionando);
- **bloqueia publicação pública** de snapshot sem justificativa institucional explícita;
- **bloqueia assinatura institucional** do pacote de homologação sem justificativa e checklist correspondente;
- **mantém cautela metodológica visível** no preview e no payload público sanitizado.

Responsabilidade institucional:

- apenas perfis `coordenacao` ou `admin` podem registrar a justificativa de risco crítico;
- perfis `equipe` conseguem continuar operando normalmente, sem poder destravar publicação em nome institucional.

Objetivo da trava:

- evitar leitura pública superinterpretada quando a base territorial está incompleta;
- preservar a continuidade do trabalho de campo sem punição operacional;
- deixar rastro de decisão para auditoria e prestação de contas.
