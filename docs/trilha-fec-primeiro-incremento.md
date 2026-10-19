# SEMEAR Territórios — primeiro incremento seguro da Trilha Técnica FEC

**Estado:** proposta de código isolada para revisão, NÃO implantada. 19/10/2026.

## Por que esse incremento é limitado

A implantação de produção de `www.semearterritorios.online` foi localizada no projeto Vercel `semearterritorios-pvsp`, com deploy READY e commit `716a1d4587a68c317c3df242bd3d8419af018b89` no ramo `codex/tijolo-073-oficinas`. A migração `20261015232631_weekly_activity_monthly_synthesis.sql` e os guias de outubro mencionados no relatório de 19/10 **não foram encontrados nesse commit**. A informação não prova que a migração não esteja aplicada no banco ou presente em outro workspace. **Não executar SQL e não fazer merge antes de conciliar a origem atual.**

Este incremento cria apenas um módulo de domínio sem efeitos colaterais, que poderá ser conectado à interface, API e esquema reais após reconciliação.

## O que foi acrescentado

- `lib/fec-technical-cycles.ts`: contratos de dados para ciclo FEC, atividade, revisão de produto, achado com evidência e proposta; validadores; síntese individual mensal; índice de contribuições por território com evento compartilhado não duplicado.
- `tests/fec-technical-cycles.test.ts`: seis testes de regras centrais (isolamento da frente, validações, relatórios, versões, deduplicação).

**Fronteiras intencionais:** nenhuma tabela nova, rota, alteração de autenticação ou de painel APS; nenhuma gravação em banco, atribuição de permissão, publicação de PDF nem atesto financeiro.

## Fluxo proposto para a próxima integração

1. Coordenação competente confirma número do aditivo, executor, supervisor técnico e permissões.
2. Front-end apresenta `Frentes de trabalho > Cartografia e diagnóstico (FEC) > Ciclos`.
3. O profissional cria ciclo territorial (pergunta, bairro/área, contrato, metodologia) **antes** de registrar oficinas.
4. Atividades datadas criam produtos técnicos com versões; oficinas de plantio mantêm finalidade educativa, e preparação não gera contagem de público.
5. Achados apontam para fontes concretas. Cartografia exige legenda, método e revisão de privacidade.
6. Fechamento mensal deriva somente de execução aprovada, referenciada e datada. A síntese do projeto pode citar a frente sem creditá-la à APS.
7. Publicação exige curadoria separada; validação comunitária e aceite financeiro não são inferidos do status de revisão técnica.

## Checklist para unir a trilha ao sistema existente

- [ ] Identificar último SHA realmente implantado e branch correto; reconciliar migração de outubro.
- [ ] Inventariar as tabelas de atividades semanais, produtos e sínteses no ambiente homologado, incluindo RLS e triggers.
- [ ] Reaproveitar, quando possível, as identidades `actions`, `workshop_records`, `weekly_team_reports` e o novo fluxo de outubro, evitando duplicação de eventos e oficinas.
- [ ] Definir ACL por contrato/organização + `professionalId`: executor FEC edita apenas seus próprios registros; APS mantém autonomia; supervisores podem revisar sem autoaprovação.
- [ ] Criar migração apenas depois da comparação; evitar `RLS auth.uid() IS NOT NULL` como autorização genérica.
- [ ] Criar tela/formulário de ciclo e registro de atividade, com documentos privados por padrão.
- [ ] Executar testes de integração, RLS, horário local e relatórios em banco isolado; nenhuma pessoa ou oficina fictícia em produção.
- [ ] Piloto real autorizado: 1 ciclo, 2 atividades, 1 mapa versionado, 1 achado com fonte, 1 diagnóstico, 1 proposta e 1 relatório mensal.

**Referências:** especificação funcional v1.0 de 19/10/2026; relatório de fluxo semanal e transparência de 19/10/2026; implantação Vercel consultada na mesma data.