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

## Como arquivar

Pacotes arquivados permanecem como rastro institucional, mas deixam de ser candidatos ativos para assinatura.

## Uso futuro com Portal PWA

O Portal PWA não deve consumir o pacote diretamente como payload público. O uso correto é:

1. snapshot `published` como fonte de leitura pública;
2. pacote `signed` como evidência institucional de que aquela leitura foi homologada.
