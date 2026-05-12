# Estado da Nação: Tijolo 062 - Trava Editorial Opcional por Risco Territorial na Publicação Pública

**Período**: Maio 2026  
**Status**: Implementado ✅  
**Escopo**: bloquear publicação pública e assinatura institucional quando a cobertura territorial estiver crítica, exigindo justificativa institucional explícita

---

## Diagnóstico inicial

Após o Tijolo 061, o projeto já tinha nota metodológica territorial automática e propagação consistente em relatórios, devolutivas, dossiê, pós-banca e Transparência Viva.

Lacuna observada no ciclo 062:

- cobertura territorial crítica ainda podia seguir para publicação sem trava institucional forte;
- existia risco de bypass por múltiplos pontos de transição de status;
- faltava unificar decisão de risco crítico entre editor, lista de snapshots, homologação e API pública;
- o pacote institucional ainda não exigia justificativa territorial para assinatura em cenário crítico.

---

## Regra institucional implementada

Quando a qualidade territorial está `crítica` (cobertura < 50%):

- operação interna não é bloqueada;
- publicação pública (`published`) é bloqueada sem justificativa institucional;
- assinatura de pacote institucional é bloqueada sem justificativa e checklist correspondente;
- apenas `coordenacao` ou `admin` podem registrar justificativa institucional.

Mensagem oficial de bloqueio:

- `A cobertura territorial deste snapshot está crítica. Para publicar, a coordenação precisa registrar justificativa institucional.`

---

## Modelagem de dados

Migração criada:

- `supabase/migrations/20260511113000_add_territorial_risk_override_to_transparency.sql`

Campos adicionados:

- em `public_transparency_snapshots`:
  - `territorial_risk_override`;
  - `territorial_risk_override_reason`;
  - `territorial_risk_override_by`;
  - `territorial_risk_override_at`.
- em `public_transparency_homologation_packages`:
  - `territorial_risk_acknowledged`;
  - `territorial_risk_justification`;
  - `territorial_risk_acknowledged_by`;
  - `territorial_risk_acknowledged_at`.

Tipagem atualizada em `lib/database.types.ts` para refletir novos campos e relacionamentos.

---

## Núcleo central de decisão

Arquivo novo:

- `lib/transparency-territorial-risk.ts`

Funções:

- `getTerritorialRiskPublicationGuard(snapshot)`
  - resolve se existe risco crítico;
  - valida presença de justificativa;
  - expõe resumo metodológico territorial para UI/API.
- `sanitizeTerritorialJustificationForPublic(input)`
  - higieniza justificativa para consumo público.

Esse núcleo evita divergência entre regras aplicadas no editor, na listagem, na homologação e na API.

---

## Publicação de snapshots

Arquivos atualizados:

- `components/transparency/transparency-snapshot-editor-page.tsx`
- `components/transparency/transparency-snapshots-page.tsx`

Entregas:

- editor bloqueia transição para `published` em risco crítico sem justificativa;
- editor adiciona bloco explícito de justificativa institucional para coordenação/admin;
- listagem de snapshots aplica a mesma trava para impedir bypass do editor;
- perfis `equipe` não conseguem destravar publicação crítica por atalho de status.

---

## Homologação institucional

Arquivos atualizados:

- `lib/transparency-homologation.ts`
- `components/transparency/transparency-homologation-workspace.tsx`

Entregas:

- checklist ganhou item `territorial_risk_critical_justified`;
- readiness bloqueia assinatura quando risco crítico não estiver institucionalmente justificado;
- workspace exige justificativa antes de assinatura em cenário crítico;
- apenas coordenação/admin pode registrar justificativa territorial institucional;
- `frozen_payload` e markdown institucional passam a incluir dados de justificativa territorial quando aplicável.

---

## Preview e API pública

Arquivos atualizados:

- `components/transparency/transparency-preview-page.tsx`
- `app/api/public/transparencia-viva/route.ts`

Entregas:

- preview interno mostra:
  - `Não recomendado para publicação pública.` (crítico sem justificativa);
  - `Publicado com cautela metodológica e justificativa institucional.` (crítico com justificativa).
- API pública inclui nota territorial para risco crítico com:
  - metodologia;
  - justificativa institucional sanitizada.
- API pública não expõe IDs internos de usuários responsáveis pela justificativa.

---

## Ajuda e documentação

Arquivos atualizados:

- `docs/transparencia-viva-publica.md`
- `docs/pacote-homologacao-transparencia-viva.md`
- `docs/governanca-qualidade-territorial.md`
- `app/ajuda/page.tsx`

Entregas:

- política institucional da trava editorial documentada;
- regra de assinatura por risco crítico documentada;
- seção operacional na Ajuda com escopo, papéis e mensagens esperadas.

---

## Cenários de validação

1. `equipe` tenta publicar snapshot crítico sem justificativa
- esperado: bloqueio com mensagem institucional;
- resultado: bloqueado.

2. `coordenacao` tenta publicar snapshot crítico sem justificativa
- esperado: bloqueio com mensagem institucional;
- resultado: bloqueado.

3. `coordenacao` registra justificativa e publica snapshot crítico
- esperado: publicação permitida com rastro de override;
- resultado: permitido.

4. `equipe` tenta justificar/assinar pacote crítico
- esperado: bloqueio por papel;
- resultado: bloqueado.

5. `coordenacao` assina pacote crítico com checklist completo e justificativa
- esperado: assinatura permitida;
- resultado: permitido.

---

## Verificação técnica

Comandos executados:

- `npm run lint` ✅
- `npm run build` ✅
- `npm run verify` ✅

Sem erros de lint, tipagem ou build.

---

## Riscos e observações

1. A trava depende do preenchimento consistente de `territorial_quality_summary` no snapshot.
2. A justificativa institucional precisa seguir linguagem metodológica e não narrativa pessoal.
3. Fluxos externos que consumirem snapshot publicado devem continuar tratando status crítico com cautela textual.

---

## Conclusão

O Tijolo 062 fecha a lacuna de governança pública sem comprometer a operação de campo:

1. mantém o caráter opcional e não punitivo do preenchimento territorial durante execução;
2. exige decisão institucional explícita para exposição pública em cenário crítico;
3. impede bypass por rotas paralelas de publicação;
4. alinha editor, homologação, preview, API e documentação em uma única regra auditável.

Pronto para operação institucional com cautela metodológica reforçada ✅
