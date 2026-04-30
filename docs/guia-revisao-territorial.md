# Guia de Revisão Territorial

Este guia orienta a equipe a revisar bairros e lugares mencionados antes de qualquer mapa interno.

## Por que revisar lugares mencionados

Lugares citados ajudam a entender padrões territoriais, mas também podem expor pessoas, famílias ou situações sensíveis. Antes de usar dados em mapa, devolutiva ou relatório público, é preciso separar referência territorial útil de dado identificável.

## Bairro, lugar citado e endereço pessoal

- Bairro: território amplo usado para agregação, como “Centro”, “Vila X” ou “Bairro Y”.
- Lugar citado: referência coletiva ou pública, como praça, escola, CRAS, rio, ponto de ônibus ou área conhecida.
- Endereço pessoal: rua com número, casa, complemento, referência à moradia de alguém ou local que identifique pessoa/família.

## O que não publicar

- CPF, telefone, e-mail ou nome completo.
- Endereço pessoal.
- Ponto de moradia.
- Lugar que identifique uma família.
- Fala original completa.
- Lugar marcado como `sensivel_nao_publicar`.
- Lugar normalizado com visibilidade `sensitive`.

## Como marcar lugar sensível

Na revisão territorial:

1. Abra `/escutas/revisao-territorial`.
2. Encontre a escuta com lugar em texto livre ou alerta.
3. Adicione o lugar estruturado.
4. Se houver risco de identificação, escolha o tipo `sensivel_nao_publicar`.
5. Marque o status territorial como `needs_attention` se ainda precisar de decisão.
6. Use `reviewed` apenas quando bairro e lugares estiverem conferidos.

## Como normalizar nomes

Depois de estruturar o lugar, abra `/territorios/lugares` para vincular variações a um nome padrão em `normalized_places`.

- Use um único nome para variações simples, como “Praça Brasil”, “praça brasil” e “Pça. Brasil”.
- Diferencie bairro, rua/área, equipamento público, escola, CRAS, praça e ponto de referência.
- Marque visibilidade `sensitive` quando a referência puder identificar pessoa, casa ou família.
- O futuro mapa interno deve usar nomes normalizados, não texto livre.

## Como preparar dados para mapa

- Conferir bairro da escuta.
- Transformar texto livre em lugar estruturado.
- Ocultar lugares sensíveis.
- Normalizar lugares estruturados antes de qualquer mapa interno.
- Evitar rua com número ou referência de casa.
- Usar agregação por bairro/território.
- Validar se há volume suficiente de escutas revisadas.

## Exemplos bons

- “Praça da feira” como `praca`.
- “CRAS do bairro” como `cras`.
- “Córrego próximo à feira” como `rio_ou_corpo_dagua`.
- “Ponto de ônibus da feira” como `ponto_de_referencia`.

## Exemplos ruins

- “Rua X, 123”.
- “Casa da dona Maria”.
- “Em frente ao portão azul da família Y”.
- “Telefone da pessoa para retorno”.

Esses casos devem ser removidos, generalizados ou marcados como `sensivel_nao_publicar`.
