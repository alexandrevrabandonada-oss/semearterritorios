# Trilha FEC — Persistência e homologação (PR #2)

> Atualização em 19/10/2026: a [entrega funcional](trilha-fec-entrega-2026-10-19.md) substitui os limites da prévia inicial descritos neste documento. A interface usa APIs quando a flag está ativa, há acervo versionado e a migração passou por testes RLS em PostgreSQL isolado. O esquema permanece **não aplicado** ao banco produtivo. Consulte a [reconciliação dos ambientes](trilha-fec-reconciliacao-2026-10-19.md).

> Atualização em 17/11/2026: a migration aditiva `20261117140527_fec_active_team_review_access.sql` substitui as atribuições individuais descritas abaixo. A autorização exige perfil institucional permitido e vínculo ativo em `team_members`; qualquer membro ativo pode revisar registros de outra pessoa. A migration é local e não foi aplicada em produção.

**Estado:** proposta; migration NÃO aplicada e API bloqueada por padrão.

## Objetivo

Preparar gravação isolada para o profissional contratado diretamente pela FEC via aditivo, preservando as atividades da APS. O objeto é cartografia social, oficinas de educação ambiental, leitura territorial e diagnóstico participativo. A nova camada não altera `actions`, `workshop_records`, `listening_records`, `weekly_team_reports` nem relatórios da APS.

## Modelo inicial

- `fec_engagements`: aditivo/escopo, identificado pelo contrato verdadeiro (sem inventar número).
- `fec_access_grants`: tabela legada mantida para compatibilidade histórica; seus registros não autorizam o acesso após a migration aditiva de 17/11.
- `fec_cycles`: bairro oficial, questão orientadora, executor e estados de revisão.
- `fec_activities`: oficina/visita/preparação com data, participação e metodologias; relatos comunitários separados de observações e fontes externas.
- `fec_review_log`: decisões de revisão com supervisor diferente do executor.

A migration inicial está em `supabase/migrations/20261117011729_fec_technical_cycles_staged.sql`. Os endpoints `/api/fec/cycles` e `/api/fec/activities` exigem login, perfil institucional permitido, vínculo ativo, RLS e `SEMEAR_FEC_PERSISTENCE_ENABLED=true`. Sem a flag, respondem 503. A gravação requer uma frente FEC ativa; não exige grant individual.

## Regras de qualidade

Atividade de preparação não gera público; estimativa de participações não significa pessoas únicas. Mapa exige método de construção e legenda. Campos preliminares de achado e proposta NÃO são produto aprovado, e um relato não comprova medição de poluição nem causalidade. Revisão técnica não equivale a validação comunitária, aprovação pública ou aceite financeiro da FEC.

## Pré-condições para habilitar

1. Localizar e identificar o Supabase INTERNO vinculado a `www.semearterritorios.online`; não confundir com a base pública `semearsf`.
2. Comparar a migração de outubro mencionada no relatório de 19/10 com o código implantado: há divergência não resolvida de versões.
3. Confirmar o instrumento do aditivo e o escopo institucional. A permissão operacional vem do vínculo ativo da equipe e não cria grants individuais.
4. Revisar a SQL com DBA e aplicar somente em ambiente de homologação com esquema isolado. NÃO executar esta migration diretamente no banco de produção.
5. Testar RLS com autenticação: anônimo, membro ativo autor, dois revisores distintos, perfil inativo, perfil sem vínculo, tentativa de autoaprovação e separação da APS.
6. Conferir envio/revisão/ressubmissão e logs, anexos privados e privacidade territorial.
7. Somente então ativar a flag no ambiente homologado e ligar o formulário à API.

## Limites deliberados

**Não implementados ainda:** tabela versionada de mapas, arquivos privados, entidades de achado/diagnóstico consolidados, fechamento mensal oficial, revisão comunitária e integração ao site público. Por enquanto a API só cria rascunhos de ciclos e atividades; a revisão por supervisor está modelada na SQL, sem tela operacional. Não alegar entrega financeira com a minuta.

**Testes:** GitHub Actions inclui testes unitários de validação de entrada, preservação da autoria JWT e inspeções estáticas das políticas SQL. Não são testes de aplicação da migration nem prova de RLS em produção.
