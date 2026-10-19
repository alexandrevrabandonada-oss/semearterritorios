# Reconciliação dos ambientes — 19/10/2026

## Evidências consultadas

- PR #2 aberta e em rascunho, branch `codex/semear-fec-ciclos-isolados-20261019`, SHA inicial `46d4f0ed0e517cc6949e36b59c1a8cf2307dc50f`.
- Consulta autenticada do alias `www.semearterritorios.online`: implantação `dpl_7NtEwWPEX4GQCyq3bVnJYvV5b7Es`, projeto Vercel `semearterritorios-pvsp`, estado READY. A origem é CLI; os metadados registram branch `codex/tijolo-073-oficinas` e base `716a1d4587a68c317c3df242bd3d8419af018b89`.
- A prévia inicial da PR no projeto correto era `dpl_C23g8AFSSspvngLA8DXTY2Ru59mH`, READY, do SHA `46d4f0e`. O check com falha pertence ao outro projeto, `semearterritorios`: erro `STATIC_BUILD_NO_OUT_DIR`, procurando saída `public`. Não foi alterada a configuração de nenhum dos projetos.
- O projeto Supabase interno é `gtpitwhslqjgbuwlsaqg`, confirmado pelo vínculo local e por consultas de catálogo via CLI autenticada. O conector Supabase não tem acesso a esse projeto; a CLI tem. O projeto público `semearsf` (`ojedgswernwbzrcfomqq`) é outro banco e não foi utilizado para executar a Trilha FEC.
- Consultas somente de leitura ao banco interno confirmaram `20261014213804_professional_monthly_reports` e `20261015232631_weekly_activity_monthly_synthesis` no histórico. Tabelas `weekly_activity_items`, `weekly_activity_products`, `weekly_activity_review_history`, `monthly_syntheses`, `monthly_synthesis_history` e `professional_monthly_reports` existem com RLS habilitado. Não havia tabelas `fec_*` no inventário consultado.

## Origem da divergência e recuperação

Os arquivos dos fluxos de outubro estavam no diretório `C:/Projetos/SEMEAR TERRITORIOS`, sobre `716a1d4`, como mudanças locais não commitadas. A implantação por CLI pode incluir arquivos locais sem alterar o SHA dos metadados. Portanto, o SHA isolado não era um retrato completo do código enviado à produção.

Esse estado local foi recuperado para a branch da PR em um commit próprio: componentes de Memória, registros semanais datados, sínteses mensais, mensais manuais legados, rotas, tipos, migrações correspondentes, guias, modelo DOCX existente e testes. Foram selecionados arquivos explicitamente; anexos da conversa, ambientes locais, chaves e alterações do site público não foram incluídos. O diretório original foi preservado.

A recuperação registra o conteúdo encontrado localmente. A existência das estruturas no banco e a implantação CLI estão comprovadas; não há manifesto original que permita afirmar igualdade criptográfica de todos os arquivos locais com o pacote implantado em 15/10. O novo commit fornece uma referência versionada e verificável daqui em diante.

## Reuso e fronteiras entre as frentes

- Reutilizados: cadastro oficial de bairros, identidade das ações do projeto, autenticação existente e convenções de revisão e rastreabilidade.
- Preservados: semanais e sínteses do fluxo existente. A migração FEC não altera tabelas de ações, escutas, oficinas ou relatórios APS.
- Específicos da FEC: aditivo, atribuição de executor/supervisor, ciclos, atividades, produtos versionados, evidências, diagnósticos, achados, propostas e arquivos privados. Não dependem de inclusão do contratado em `team_members` da APS nem de elevação para administrador.
- Eventos compartilhados exigem vínculo explícito com ação oficial realizada, mesma data e território. O cadastro geral de ações não é automaticamente rotulado como APS. Semelhança temática ou territorial não funde registros.
- Relatório FEC é uma minuta individual privada. Não é somado automaticamente à síntese institucional nem enviado ao site público. A integração editorial pública de outubro continua com seu bloqueio de implantação já documentado.

## Limites respeitados

Nenhuma migração, configuração produtiva, atribuição pessoal, dado real, publicação pública ou merge de produção foi realizado nesta execução. A flag `SEMEAR_FEC_PERSISTENCE_ENABLED` permanece desligada por padrão; foi ativada apenas no processo local conectado ao banco isolado de testes.

O relatório técnico gerado nesta etapa possui onze blocos e fontes, mas ainda é uma minuta recalculada. Persistência, assinatura de versão e aprovação do relatório mensal como documento próprio são o próximo incremento, antes da homologação institucional. A revisão dos registros de origem já é persistente e auditada na proposta de esquema.
