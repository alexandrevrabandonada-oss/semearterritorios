# Normalização de lugares

Documento interno do SEMEAR Territórios para padronizar lugares mencionados nas escutas antes de qualquer mapa interno autenticado.

## Por que normalizar

Lugares podem aparecer escritos de formas diferentes por cada pessoa revisora. A normalização evita duplicidade e melhora a leitura territorial sem geocodificar endereços.

Exemplos:

- `Praça Brasil`, `praça brasil` e `Pça. Brasil` devem apontar para um mesmo lugar normalizado.
- `Retiro` pode ser bairro, mas `rua no Retiro` é uma área/rua e precisa de tipo diferente.
- `perto da casa de fulano` é referência sensível e não deve ser publicada.

## Três camadas

1. Lugar citado: texto livre registrado na escuta.
2. Lugar estruturado: registro em `places_mentioned`, com tipo e bairro.
3. Lugar normalizado: registro em `normalized_places`, usado como nome padrão.

O futuro mapa interno deve usar preferencialmente `normalized_places`.

## Visibilidade

- `internal`: pode aparecer em telas internas autenticadas.
- `public_safe`: pode entrar em devolutiva pública agregada, sem fala original e sem identificação.
- `sensitive`: não publicar, não exportar em material público e não usar em mapa público.

## Quando marcar como sensível

Marque como `sensitive` ou `sensivel_nao_publicar` quando o lugar:

- parecer endereço pessoal;
- identificar casa, família ou pessoa;
- expuser situação de vulnerabilidade;
- permitir deduzir quem falou;
- precisar de decisão da coordenação antes de circular.

## O que nunca publicar

- endereço pessoal;
- nome completo de pessoa escutada;
- referência como “casa de X”;
- fala original completa;
- detalhe que permita identificar família ou ocorrência sensível.

## Como revisar

1. Abrir `/territorios/lugares`.
2. Filtrar por “não normalizados”.
3. Conferir bairro, tipo, ação e escuta vinculada.
4. Vincular a nome normalizado existente quando já houver padrão.
5. Criar novo nome normalizado apenas quando necessário.
6. Definir visibilidade.
7. Marcar `sensitive` se houver risco de exposição.

## Critério para mapa interno

Antes de avançar para mapa interno autenticado:

- escutas precisam estar revisadas;
- revisão territorial precisa estar concluída;
- lugares livres relevantes precisam estar estruturados;
- lugares estruturados precisam estar normalizados;
- lugares sensíveis precisam estar ocultos;
- não deve haver geocodificação de endereço pessoal.

## Validação operacional

Use `/territorios/normalizacao/qualidade` para revisar:

- possíveis duplicidades por diferença de maiúsculas, acentos ou espaços;
- nomes parecidos dentro do mesmo bairro;
- nomes iguais em bairros diferentes que possam gerar ambiguidade;
- lugares sensíveis;
- lugares normalizados sem menção;
- lugares com muitas menções.

O painel não faz merge automático. Qualquer consolidação de nomes deve ser decisão humana da equipe ou coordenação.
