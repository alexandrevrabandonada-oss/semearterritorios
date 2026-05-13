# Transparência Viva pública por snapshots aprovados

## Conceito

A Transparência Viva é a camada pública futura do SEMEAR Territórios para apresentar sínteses agregadas, sanitizadas e aprovadas pela coordenação. Ela não substitui o painel interno, não expõe dados brutos e não usa IA como fonte oficial.

## Primeira página pública controlada (Tijolo 063)

Nesta etapa, a primeira página pública controlada já está disponível em:

- `/publico/transparencia-viva`

Ela consome apenas `/api/public/transparencia-viva` e exibe exclusivamente o último snapshot `published`.

Se não houver snapshot publicado, a rota mostra somente o estado de preparação institucional, sem detalhes técnicos internos.

## Painel interno x transparência pública

O painel interno acessa ações, escutas, temas, territórios, equipe operacional, devolutivas, dossiês e relatórios conforme o papel do usuário.

A transparência pública só deve ler `public_transparency_snapshots` com `status = published`. Ela não consulta `listening_records`, `team_members`, falas originais, entrevistadores ou registros internos.

## Fluxo editorial

1. Gerar rascunho determinístico em `/transparencia/snapshots`.
2. Alternativamente, gerar rascunho interno a partir de `/leituras` com o botão `Preparar snapshot da Transparência Viva`.
3. Abrir o editor em `/transparencia/snapshots/[id]`.
3. Revisar conteúdo e bloco metodológico.
4. Conferir checklist de privacidade.
5. Registrar comentários e resolver pendências críticas.
6. Coordenação ou admin marca como `reviewed`.
7. Coordenação ou admin aprova.
8. Coordenação ou admin publica.
9. Se necessário, gerar pacote institucional em `/transparencia/homologacao`.

## Trilha de auditoria

Cada snapshot pode ter:

- versões editoriais;
- comentários de revisão;
- checklist persistido;
- alerta de risco persistido;
- pacote formal de homologação institucional.

## Checklist de privacidade

Antes de publicar, o snapshot deve confirmar:

- não contém fala original bruta;
- não contém nome de entrevistador;
- não contém e-mail de equipe;
- não contém CPF;
- não contém telefone;
- não contém endereço, rua, número ou CEP;
- não contém dado de saúde individual identificável;
- ocupações raras foram agrupadas;
- territórios com menos de 5 escutas revisadas aparecem como dados insuficientes;
- lugares sensíveis não aparecem;
- publicação foi revisada por coordenação ou admin.

## Regra de comentários

Comentários de `privacidade`, `dados` e `metodologia` bloqueiam a publicação enquanto estiverem pendentes.

Comentários de `texto` não bloqueiam sozinhos, mas só podem ser assumidos por coordenação ou admin na publicação final.

## Regra de edição

`draft` pode ser editado pela equipe autora, coordenação e admin.

`reviewed`, `approved`, `published` e `archived` ficam sob coordenação ou admin.

## Regra de republicação

Se um snapshot `published` for editado, ele volta automaticamente para `reviewed` e perde `published_at`. Toda republicação exige nova revisão e nova publicação.

## Quem pode publicar

Somente `coordenacao` ou `admin` podem aprovar e publicar snapshots.

## Trava editorial opcional por risco territorial

Quando a qualidade territorial estiver em status `crítica` (cobertura menor que 50%), a publicação pública fica bloqueada por padrão.

Para liberar a publicação nesse cenário, a coordenação ou admin deve registrar justificativa institucional explícita no snapshot.

Regras:

- não bloqueia operação de campo;
- não bloqueia cadastro, revisão ou devolutiva interna;
- bloqueia somente a transição para `published` sem justificativa;
- perfis `equipe` não podem registrar essa justificativa em nome institucional.

No preview interno:

- risco crítico sem justificativa: `Não recomendado para publicação pública.`;
- risco crítico com justificativa: `Publicado com cautela metodológica e justificativa institucional.`.

Na API pública:

- a rota continua retornando apenas o último snapshot `published`;
- quando houver risco crítico, inclui nota metodológica e justificativa sanitizada para leitura pública;
- nunca expõe IDs internos de usuário responsáveis pela justificativa.

## O que pode aparecer

- totais agregados de ações, escutas revisadas, territórios alcançados, devolutivas aprovadas e dossiês fechados;
- ranking geral de temas;
- palavras recorrentes sanitizadas;
- escutas por território de referência ou território da ação, somente em agregação;
- linha do tempo de ações realizadas;
- devolutivas aprovadas, sem nomes individuais;
- aviso metodológico e notas de privacidade.

## O que nunca entra no payload público

- fala original bruta;
- nome de entrevistador;
- e-mail da equipe;
- CPF, telefone, endereço, rua, número, CEP ou dado de saúde individual;
- ocupação rara individualizada;
- lugar sensível;
- ponto individual no mapa;
- dados não aprovados;
- qualquer uso de `service_role` no frontend público.

## Regra de amostra mínima

Territórios com menos de 5 escutas revisadas devem aparecer como `dados insuficientes para síntese pública`.

Ocupação só pode entrar de forma agregada. Ocupações com contagem menor que 3 devem ser agrupadas como `outras ocupações`.

## Origem coletiva (source_type)

Snapshots criados a partir de `/leituras` recebem metadados de origem:

- `source_type = collective_reading`
- `source_filters` com filtros usados na geração
- `source_generated_at` com data/hora da geração

Esse registro não altera as regras de publicação: continua obrigatório revisar checklist, comentários e privacidade antes de aprovar/publicar.

## Versões e pacote institucional

- snapshot: peça editorial viva;
- versão: congelamento editorial em eventos de status;
- pacote institucional: congelamento formal para assinatura interna.

O pacote institucional deve ser usado quando a coordenação precisar registrar aprovação formal antes de orientar integração pública futura.

## Export seguro

O pacote de homologação inclui metadados, checklist, alertas, versões, comentários, payload congelado e decisão institucional, mas não inclui dados brutos nem qualquer identificador pessoal.

## Integração futura com Portal PWA SEMEAR

A rota `/api/public/transparencia-viva` retorna apenas o último snapshot com `status = published`, sem campos brutos e sem dados internos.

Antes da integração com PWA, manter a página controlada local como referência de UX e governança em `/publico/transparencia-viva`.

Quando houver integração com o Portal PWA:

- consumir apenas snapshot `published`;
- usar pacote `signed` como referência institucional;
- validar novamente RLS, payload, cache, logs e ausência de `service_role` no bundle público.

## Testes automatizados e smoke (Tijolo 048)

Para evitar regressões de segurança e governança, manter a suíte ativa:

- `npm run test:transparencia` para testes automatizados locais;
- `npm run smoke:transparencia` para smoke remoto de triggers/versionamento/assinatura.

Referências:

- [docs/testes-transparencia-viva.md](docs/testes-transparencia-viva.md)
- [scripts/smoke-transparencia-rls.md](scripts/smoke-transparencia-rls.md)
