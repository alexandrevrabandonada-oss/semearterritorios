# Preparação de release FEC — 16/11/2026

Base de aplicação: main 58b1d0d138f7a3b1b93104e16b2c62afe0f1e452; branch local codex/fec-acoes-integrada. Nenhuma operação de produção foi executada nesta etapa.

## Controle de acesso

O histórico da conversa registra pedido e confirmação para promover as 13 contas a admin. A origem técnica de cada alteração não foi comprovada por auditoria individual. O cadastro Auth atual cria perfil com role NULL; a política existente permite que admin ou coordenação alterem perfis, inclusive role. A migration 20261117000613 remove INSERT e UPDATE amplos e TRUNCATE, TRIGGER e REFERENCES de anon/authenticated em profiles, permite UPDATE apenas de full_name e updated_at e preserva o cadastro criado por função privilegiada. Atribuições de role passam a exigir operação administrativa controlada. Não reclassifica os perfis existentes. Confirmar antes da aplicação eventuais integrações que atualizem profiles diretamente, e revisar acessos das 13 contas em processo institucional separado. O mesmo problema de TRUNCATE em outras tabelas não foi investigado nesta tarefa.

A autorização FEC depende de perfil SEMEAR habilitado, membro ativo da equipe vinculado por profile_id, fec_access_grants ativo e frente ativa. O papel geral, isoladamente, não concede acesso FEC. Não criar contratos, ciclos ou grants até confirmação institucional do aditivo e das pessoas; ativar flags sem atribuições mantém acesso FEC negado. Supervisor deve ser pessoa diferente do executor.

## Ordem exata proposta (aplicar somente após autorização)

Produção possui 56 migrations e não registra os identificadores abaixo; não rodar db push indiscriminado, porque existem migrations locais anteriores à última versão de produção. Conferir novamente banco, políticas, ownership, permissões de storage.objects e existência dos nomes antes de executar cada SQL individualmente e registrar versão correspondente, garantindo backup/recuperação e janela de manutenção.

1. 20261117000613_restrict_profile_role_changes.sql.
2. 20261019190000_fec_technical_cycles_staged.sql.
3. 20261019190720_fec_monthly_report_versions.sql.
4. 20261109182913_fec_import_documental_privado.sql.
5. 20261109234909_fec_resposta_evidencia_privada.sql.
6. 20261110001929_fec_integridade_documental.sql.
7. 20261116204308_fec_supporting_documents.sql.
8. 20261117003944_fec_vinculo_ativo_referencia_pendente.sql.

A primeira é segurança de perfis; as demais são ordenadas por dependências FEC. A última endurece a autorização e permite referência jurídica pendente, separada do identificador interno. O banco produtivo já chegou à versão 20261106215725, posterior às duas primeiras FEC: não presumir aplicação cronológica automática; revisar o mecanismo de registro de migrations fora de ordem. Sem reset, drop de dados ou alteração de tabelas APS. O patch altera somente constraints FEC recém-criadas e limites de bucket FEC; revisar as operações concretas antes de autorizar.

## Publicação e recuperação

Flags SEMEAR_FEC_PERSISTENCE_ENABLED e SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED ficam desativadas até aprovação e verificação. Após migrações e testes autorizados, enviar uma vez à branch de produção e acompanhar o único deploy automático do Render. Confirmar flags, URL pública OAuth, armazenamento privado, executor e supervisor com atribuições independentes, acesso negado a terceiros, upload sintético, hash e histórico de revisão. Evitar gravar relatórios pessoais durante smoke test.

Em falha, desativar as duas flags e retornar ao deployment anterior do Render, sem apagar tabelas, objetos ou histórico. Não fazer rollback automático destrutivo; reconciliar migrações parcialmente aplicadas, estado dos arquivos e backup antes de retomar. A reversão do controle de perfis exige revisão de segurança específica. Render e banco são sistemas distintos: rollback de código não desfaz migrations.

## Política institucional pendente

Originais e anexos ficam em buckets privados, sem publicação e sem exclusão automática; RLS depende de atribuição contratual. Não há prazo de retenção institucional aprovado. Confirmar responsável, finalidade, prazo, gestão de acesso, atendimento a exclusão e revisão de documentos, e identificação do aditivo. Outubro de 2026 é pré-importação documental sujeita a revisão, não evidência automática de entrevistas ou atividades comprovadas.

## Validação

As sete migrations FEC foram aplicadas no Supabase local isolado, incluindo vínculo ativo e referência pendente. RLS, arquivos privados, SHA-256 de bytes armazenados, supervisor independente e ajustes foram testados com dados sintéticos. Build Node 22 e TypeScript passaram após reconciliação; teste sintético da migration de perfis verifica bloqueio de elevação e TRUNCATE, atualização permitida de nome e alteração controlada pelo DBA. O banco de produção não foi modificado.
