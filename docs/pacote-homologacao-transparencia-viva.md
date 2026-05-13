# Pacote institucional da Transparência Viva

## O que é

O pacote institucional é o artefato formal da Transparência Viva para congelar uma versão editorial de um snapshot e registrar a decisão interna de homologação antes de orientar integração pública futura.

## Quando gerar

Gerar o pacote quando o snapshot já estiver consistente do ponto de vista editorial e precisar entrar em validação institucional.

Em regra:

1. rascunho gerado;
2. texto revisado;
3. checklist de privacidade conferido;
4. comentários críticos resolvidos;
5. snapshot aprovado;
6. pacote institucional criado.

## Diferença entre snapshot, versão e pacote

- snapshot: peça editorial viva, ainda revisável;
- versão: registro histórico criado em marcos editoriais;
- pacote: congelamento formal para assinatura institucional.

## O que entra

- título;
- período;
- resumo institucional;
- metodologia;
- declaração de privacidade;
- checklist multi-etapa;
- relatório de risco;
- export da auditoria editorial;
- payload congelado sanitizado;
- decisão institucional;
- assinatura interna.

## O que nunca entra

- escutas brutas;
- fala original;
- entrevistador;
- e-mail da equipe;
- CPF;
- telefone;
- endereço, rua, número ou CEP;
- dado de saúde individual;
- lugar sensível;
- ponto individual no mapa.

## Quem pode assinar

Somente `coordenacao` ou `admin`.

Assinatura é bloqueada se:

- snapshot não estiver `approved` ou `published`;
- houver comentário crítico pendente;
- houver CPF, telefone ou e-mail detectado;
- checklist estiver incompleto;
- `frozen_payload` estiver vazio;
- pacote estiver `rejected` ou `archived`.

## Trava por risco territorial crítico

Se o snapshot vinculado estiver com qualidade territorial `crítica` (cobertura menor que 50%), a assinatura institucional também é bloqueada até existir justificativa institucional registrada.

Regras adicionais:

- somente `coordenacao` ou `admin` podem registrar a justificativa;
- o checklist inclui o item `territorial_risk_critical_justified`;
- sem esse item e sem justificativa, o pacote não pode ser assinado;
- a justificativa aparece no markdown institucional e no payload congelado do pacote.

## Como arquivar

Pacotes arquivados permanecem como rastro institucional, mas deixam de ser candidatos ativos para assinatura.

## Uso futuro com Portal PWA

O Portal PWA não deve consumir o pacote diretamente como payload público. O uso correto é:

1. snapshot `published` como fonte de leitura pública;
2. pacote `signed` como evidência institucional de que aquela leitura foi homologada.

## Página pública controlada atual

A rota pública controlada desta fase é `/publico/transparencia-viva`.

Ela não lê o pacote institucional diretamente. Ela lê apenas `/api/public/transparencia-viva`, que já retorna somente conteúdo aprovado/publicado e sanitizado.

O pacote `signed` continua sendo evidência institucional e trilha formal, não payload de exibição direta.

## Origem de leituras coletivas

Quando o snapshot foi criado via `/leituras`, o processo de homologação deve manter a rastreabilidade da origem com:

- `source_type = collective_reading`;
- filtros de geração (`source_filters`);
- data/hora de geração (`source_generated_at`).

Esses metadados não substituem revisão editorial e não reduzem exigências de privacidade.

## Testes de regressão institucional (Tijolo 048)

Reforçar validação contínua antes de homologação final:

1. `npm run test:transparencia` para regras de bloqueio, checklist e payload.
2. `npm run smoke:transparencia` para validar assinaturas e transições no banco remoto.

Documentos de apoio:

- [docs/testes-transparencia-viva.md](docs/testes-transparencia-viva.md)
- [scripts/smoke-transparencia-rls.md](scripts/smoke-transparencia-rls.md)
