# Trilha FEC — Persistência e homologação (PR #2)

> Atualização em 19/10/2026: a [entrega funcional](trilha-fec-entrega-2026-10-19.md) substitui os limites da prévia inicial descritos neste documento. A interface usa APIs quando a flag está ativa, há acervo versionado e a migração passou por testes RLS em PostgreSQL isolado. O esquema permanece **não aplicado** ao banco produtivo. Consulte a [reconciliação dos ambientes](trilha-fec-reconciliacao-2026-10-19.md).

**Estado:** proposta; migration NÃO aplicada e API bloqueada por padrão.

## Objetivo

Preparar gravação isolada para o profissional contratado diretamente pela FEC via aditivo, preservando as atividades da APS. O objeto é cartografia social, oficinas de educação ambiental, leitura territorial e diagnóstico participativo. A nova camada não altera `actions`, `workshop_records`, `listening_records`, `weekly_team_reports` nem relatórios da APS.

## Modelo inicial

- `fec_engagements`: aditivo/escopo, identificado pelo contrato verdadeiro (sem inventar número).
- `fec_access_grants`: atribuição ativa de executor e supervisor; grant nasce inativo, não há autoinscrição por profissionais.
- `fec_cycles`: bairro oficial, questão orientadora, executor e estados de revisão.
- `fec_activities`: oficina/visita/preparação com data, participação e metodologias; relatos comunitários separados de observações e fontes externas.
- `fec_review_log`: decisões de revisão com supervisor diferente do executor.

A migration está em `supabase/migrations/20261019190000_fec_technical_cycles_staged.sql`. Os endpoints `/api/fec/cycles` e `/api/fec/activities` exigem login, RLS e `SEMEAR_FEC_PERSISTENCE_ENABLED=true`. Sem a flag, respondem 503 e não tentam acessar a base. Mesmo habilitada, a gravação depende de aditivo ATIVO e grant explícito. O formulário atual `/fec/cartografia` continua apenas como prévia local e não chama a API.

## Regras de qualidade

Atividade de preparação não gera público; estimativa de participações não significa pessoas únicas. Mapa exige método de construção e legenda. Campos preliminares de achado e proposta NÃO são produto aprovado, e um relato não comprova medição de poluição nem causalidade. Revisão técnica não equivale a validação comunitária, aprovação pública ou aceite financeiro da FEC.

## Pré-condições para habilitar

1. Localizar e identificar o Supabase INTERNO vinculado a `www.semearterritorios.online`; não confundir com a base pública `semearsf`.
2. Comparar a migração de outubro mencionada no relatório de 19/10 com o código implantado: há divergência não resolvida de versões.
3. Confirmar instrumento do aditivo, profissional, supervisor responsável e escopo de acesso. Provisionamento dos grants exige administrador autorizado; sem isso nenhuma conta recebe acesso FEC.
4. Revisar a SQL com DBA e aplicar somente em ambiente de homologação com esquema isolado. NÃO executar esta migration diretamente no banco de produção.
5. Testar RLS com autenticação: anônimo, APS sem grant, executor FEC A, executor FEC B, supervisor designado e tentativa de autoaprovação.
6. Conferir envio/revisão/ressubmissão e logs, anexos privados e privacidade territorial.
7. Somente então ativar a flag no ambiente homologado e ligar o formulário à API.

## Limites deliberados

**Não implementados ainda:** tabela versionada de mapas, arquivos privados, entidades de achado/diagnóstico consolidados, fechamento mensal oficial, revisão comunitária e integração ao site público. Por enquanto a API só cria rascunhos de ciclos e atividades; a revisão por supervisor está modelada na SQL, sem tela operacional. Não alegar entrega financeira com a minuta.

**Testes:** GitHub Actions inclui testes unitários de validação de entrada, preservação da autoria JWT e inspeções estáticas das políticas SQL. Não são testes de aplicação da migration nem prova de RLS em produção.
