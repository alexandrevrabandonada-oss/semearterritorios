# Aceite Presencial Executado - Tijolo 071

Data base: 2026-05-12
Objetivo: validar operação por papel real (admin, coordenacao, equipe, anon) e fluxos críticos sem abrir risco de privacidade.

## Critério de evidência

Para cada linha:

- usuário mascarado;
- papel;
- rota;
- ação;
- esperado;
- obtido;
- evidência;
- status.

## Resultado consolidado da rodada 071

- Parte técnica automatizada: executada.
- Parte presencial com login humano por papel: pendente de sessão assistida em campo.

## 1) Papel equipe

| Usuário mascarado | Papel | Rota | Ação | Esperado | Obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| pe***@gm***.com | equipe | /login | login Google | autentica sem aguardando-liberacao | pendente execução humana | sessão presencial não iniciada | pendente |
| pe***@gm***.com | equipe | /escutas | acessar módulo | acesso operacional permitido | pendente execução humana | sessão presencial não iniciada | pendente |
| pe***@gm***.com | equipe | /escutas/lote | fluxo em lote | operação permitida sem governança | pendente execução humana | sessão presencial não iniciada | pendente |
| pe***@gm***.com | equipe | /escutas/falas | tentar aprovar pública | bloqueado para equipe | pendente execução humana | regra validada por código (canApprove) | pendente presencial |
| pe***@gm***.com | equipe | /memoria | enviar relatório semanal | equipe envia, não aprova | pendente execução humana | sessão presencial não iniciada | pendente |

## 2) Papel coordenacao

| Usuário mascarado | Papel | Rota | Ação | Esperado | Obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| di***@id***.br | coordenacao | /escutas/revisao-territorial | revisar e corrigir com evidência | permitido | pendente execução humana | sessão presencial não iniciada | pendente |
| di***@id***.br | coordenacao | /escutas/falas | aprovar/rejeitar/arquivar com justificativa | permitido com bloqueios corretos | validado tecnicamente em banco | scripts/test_069_bloqueios.mjs (12 pass, 0 fail) | passou técnico |
| di***@id***.br | coordenacao | /escutas/falas/[id] | ver histórico editorial | permitido | pendente execução humana | sessão presencial não iniciada | pendente |
| di***@id***.br | coordenacao | /acoes/[id]/devolutiva | validar modo técnico e público | apenas approved_public no público | validado tecnicamente | revisão de regra + bateria 069 | passou técnico |
| di***@id***.br | coordenacao | /memoria | revisar/aprovar relatório semanal | permitido | pendente execução humana | sessão presencial não iniciada | pendente |

## 3) Papel admin

| Usuário mascarado | Papel | Rota | Ação | Esperado | Obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| al***@id***.br | admin | /escutas/falas | governança completa | permitido | validado tecnicamente | scripts/test_069_bloqueios.mjs | passou técnico |
| al***@id***.br | admin | /acoes/[id]/dossie | conferir governança das falas | permitido | validado tecnicamente | revisão técnica do fluxo 069/070 | passou técnico |
| al***@id***.br | admin | gestão de usuários | diagnóstico e regularização de vínculo | permitido | executado | reports/diagnostico-aceite-presencial-071.md | passou |

## 4) Papel anon

| Usuário mascarado | Papel | Rota/Tabela | Ação | Esperado | Obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| n/a | anon | listening_record_public_quotes | leitura | bloqueado | sem dados retornados | checagem anon 071 | passou técnico |
| n/a | anon | listening_record_public_quote_audits | leitura | bloqueado | sem dados retornados | checagem anon 071 | passou técnico |
| n/a | anon | weekly_team_reports | leitura | bloqueado | sem dados retornados | checagem anon 071 | passou técnico |
| n/a | anon | project_memory_entries | leitura | bloqueado | sem dados retornados | checagem anon 071 | passou técnico |
| n/a | anon | /escutas, /acoes, /memoria | acesso sem login | redirecionar/bloquear | pendente execução humana | sessão de navegação presencial não realizada | pendente |

## 5) Aceite do fluxo de falas (Tarefa 8)

Fluxo alvo:

1. equipe sugere fala;
2. coordenação revisa;
3. coordenação aprova pública com justificativa;
4. admin confere dossiê;
5. devolutiva pública mostra apenas sanitized_text;
6. anon não acessa histórico interno.

Situação em 071:

- validado tecnicamente em banco com 13 cenários (12 passou, 1 pendente não crítico de evento de insert direto).
- execução presencial ponta a ponta com sessão humana por papel: pendente.

## 6) Aceite do fluxo de memória (Tarefa 9)

Fluxo alvo:

1. equipe envia relatório;
2. coordenação revisa;
3. coordenação pede ajuste/aprova;
4. coordenação cria memória interna;
5. anexo permanece privado;
6. anon não acessa.

Situação em 071:

- bloqueio técnico anon para tabelas internas confirmado.
- validação presencial de UX e trilha operacional: pendente.

## 7) Aceite de qualidade territorial (Tarefa 10)

Fluxo alvo:

1. equipe registra escuta com/sem território de referência;
2. coordenação revisa territorial;
3. alteração só com evidência;
4. auditoria registra;
5. dashboard reflete qualidade.

Situação em 071:

- ambiente pronto e papéis regularizados.
- validação presencial por sessão humana: pendente.

## 8) Bugs e ajustes

- não foi identificado bug crítico novo na rodada técnica.
- sem alteração de feature.
- sem alteração de RLS.

## 9) Conclusão operacional da rodada 071

- prontidão técnica: alta.
- pendência principal: execução presencial com usuário humano por papel para fechar aceite UX/fluxo real.
