# Transparência Viva pública por snapshots aprovados

## Conceito

A Transparência Viva é a camada pública futura do SEMEAR Territórios para apresentar sínteses agregadas, sanitizadas e aprovadas pela coordenação. Ela não substitui o painel interno, não expõe dados brutos e não usa IA como fonte oficial.

## Painel interno x transparência pública

O painel interno acessa ações, escutas, temas, territórios, equipe operacional, devolutivas, dossiês e relatórios conforme o papel do usuário.

A transparência pública só deve ler `public_transparency_snapshots` com `status = published`. Ela não consulta `listening_records`, `team_members`, falas originais, entrevistadores ou registros internos.

## Fluxo editorial

1. Gerar rascunho determinístico em `/transparencia/snapshots`.
2. Abrir o editor em `/transparencia/snapshots/[id]`.
3. Revisar texto público, bloco metodológico, limites e próximos passos.
4. Conferir checklist de privacidade.
5. Coordenação ou admin marca como revisado.
6. Coordenação ou admin aprova.
7. Coordenação ou admin publica.

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

## Regra de edição

`draft` pode ser editado pela equipe autora, coordenação e admin.

`reviewed`, `approved`, `published` e `archived` ficam sob coordenação ou admin.

O editor registra resumo gerado, resumo editado, última edição e última revisão.

## Regra de republicação

Se um snapshot `published` for editado, ele volta automaticamente para `reviewed` e perde `published_at`. A decisão adotada neste tijolo é conservadora: toda republicação exige nova revisão e nova publicação.

## Quem pode publicar

Somente `coordenacao` ou `admin` podem aprovar e publicar snapshots.

## O que pode aparecer

- Totais agregados de ações, escutas revisadas, territórios alcançados, devolutivas aprovadas e dossiês fechados.
- Ranking geral de temas.
- Palavras recorrentes sanitizadas.
- Escutas por território de referência ou território da ação, somente em agregação.
- Linha do tempo de ações realizadas.
- Devolutivas aprovadas, sem nomes individuais.
- Aviso metodológico e notas de privacidade.

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

## Integração futura com Portal PWA SEMEAR

A rota `/api/public/transparencia-viva` retorna apenas o último snapshot com `status = published`, sem campos brutos e sem dados internos. O Portal PWA deve consumir essa API ou uma view equivalente com a mesma regra de segurança.

Antes de abrir página pública real, validar novamente RLS, payload da API, cache, logs, ausência de `service_role` no bundle público e checklist de privacidade.
