# Estado da Nação: Tijolo 061 - Nota Metodológica Automática de Qualidade Territorial

**Período**: Maio 2026  
**Status**: Implementado ✅  
**Escopo**: propagação automática da cautela metodológica territorial em relatório, devolutiva, dossiê, pós-banca e Transparência Viva

---

## Diagnóstico inicial

Com os Tijolos 058-060, o projeto já tinha:

- separação explícita entre território da ação e território de referência do entrevistado;
- governança de revisão territorial e auditoria;
- visibilidade operacional no Dashboard.

Lacuna observada no ciclo 061:

- a qualidade territorial ainda não aparecia de forma uniforme em todos os artefatos oficiais;
- existia risco de leitura territorial sem aviso metodológico quando cobertura estivesse baixa;
- faltava congelar esse aviso também no pacote institucional de homologação.

---

## Núcleo metodológico unificado

Arquivo-base: `lib/territorial-quality.ts`.

Foi adotada função única para textos oficiais de qualidade territorial:

- `buildTerritorialQualityMethodologyNote(metrics)`

Saída padronizada:

- status (`boa`, `atenção`, `crítica`);
- texto curto e texto completo;
- recomendação operacional.

Critério utilizado em todos os módulos:

- boa: cobertura >= 80%;
- atenção: cobertura entre 50% e 79%;
- crítica: cobertura < 50%.

---

## Relatórios mensais

Arquivos atualizados:

- `lib/monthly-reports.ts`
- `components/reports/monthly-report-detail.tsx`

Entregas:

- dados do relatório incluem métrica territorial e nota metodológica;
- exports (plain text, markdown e CSV) incluem contexto de cobertura e recomendação;
- detalhe do relatório mostra bloco visual com status, cobertura, com/sem território e alerta quando necessário.

---

## Pós-banca

Arquivo atualizado:

- `components/post-action/post-action-consolidation-page.tsx`

Entregas:

- cobertura territorial por ação no fluxo de decisão;
- faixa de status com texto metodológico;
- aviso explícito para atenção/crítica;
- link direto para revisão: `/escutas/revisao-territorial?tab=qualidade&actionId=<id>`.

---

## Devolutiva

Arquivos atualizados:

- `lib/action-debriefs.ts`
- `components/actions/action-debrief-page.tsx`

Entregas:

- geração de devolutiva incorpora nota metodológica territorial automática;
- linguagem cautelosa em status `atenção` e `crítica`:
  - "Entre as escutas com território de referência preenchido...";
- snapshot interno da devolutiva passa a registrar status e cobertura territorial;
- UI de devolutiva exibe card de qualidade territorial com link de revisão.

---

## Dossiê da ação

Arquivos atualizados:

- `lib/action-closures.ts`
- `components/actions/action-dossier-page.tsx`

Entregas:

- dossiê exibe cobertura, escutas sem território e status metodológico;
- markdown do dossiê ganhou seção "Nota metodológica territorial";
- seção "Auditoria de correções territoriais" adicionada no markdown;
- contagem de correções em `listening_record_field_audits` (`respondent_neighborhood_id`) incluída na interface e no documento.

---

## Transparência Viva

Arquivos atualizados:

- `lib/transparency-snapshots.ts`
- `components/transparency/transparency-preview-page.tsx`
- `components/transparency/transparency-snapshot-editor-page.tsx`

Entregas:

- payload territorial inclui `territorial_quality_summary` agregado:
  - status;
  - cobertura;
  - com/sem território;
  - nota metodológica;
  - recomendação operacional;
- preview e editor exibem esse bloco automaticamente;
- `methodology_notes` e `limits_text` passam a refletir status territorial quando cobertura está baixa;
- preservado princípio de não expor dados brutos na camada pública.

---

## Homologação institucional

Arquivo atualizado:

- `lib/transparency-homologation.ts`

Entregas:

- checklist do pacote ganhou item obrigatório:
  - "Cobertura territorial revisada.";
- frozen payload agora congela também:
  - nota metodológica territorial;
  - status de qualidade territorial;
  - cobertura territorial;
- markdown institucional ganhou seção "Nota metodológica territorial" com status e cobertura.

---

## Ajuda operacional

Arquivo atualizado:

- `app/ajuda/page.tsx`

Entregas:

- nova seção "Nota metodológica territorial" com:
  - regra de status;
  - linguagem cautelosa para atenção/crítica;
  - explicação de objetivo operacional;
  - links para relatório e preview.

---

## Cenários de validação

Cenários funcionais cobertos pelo cálculo único de qualidade territorial e pela propagação de texto:

1. boa (9/10)
- cobertura: 90%;
- status esperado: `boa`;
- leitura territorial permitida sem alerta crítico.

2. atenção (6/10)
- cobertura: 60%;
- status esperado: `atenção`;
- leitura territorial com cautela e recomendação de revisão.

3. crítica (3/10)
- cobertura: 30%;
- status esperado: `crítica`;
- alerta forte em artefatos e recomendação explícita de revisão antes de publicação territorial.

---

## Verificação técnica

Comandos executados:

- `npm run lint` ✅
- `npm run build` ✅
- `npm run verify` ✅

Build concluído com 48 rotas geradas, sem erros de lint e tipagem.

---

## Riscos e observações

1. cobertura é indicador de preenchimento e não de representatividade estatística; texto metodológico deve continuar explícito.
2. qualidade territorial depende de disciplina de revisão no campo; sistema orienta, mas não substitui revisão humana.
3. uso de status com acento (`atenção`, `crítica`) exige manutenção consistente de typing/string em integrações futuras.

---

## Próximo tijolo recomendado

**Tijolo 062 - Trava editorial opcional por risco territorial em publicação pública**

Proposta:

- manter operação sem bloqueio no campo;
- permitir bloqueio apenas na etapa de publicação externa quando status territorial estiver `crítica` e coordenação não registrar justificativa institucional.

---

## Conclusão

O Tijolo 061 consolidou a governança territorial como linguagem institucional automática:

1. a mesma regra metodológica agora aparece em todos os artefatos-chave;
2. cobertura baixa ativa cautela textual de forma consistente;
3. homologação congela a nota territorial para rastreabilidade;
4. Transparência Viva mantém agregado e auditável, sem dados brutos.

Pronto para operação e prestação institucional ✅
