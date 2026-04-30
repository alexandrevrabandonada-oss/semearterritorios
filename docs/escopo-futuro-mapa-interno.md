# Escopo Futuro — Mapa Interno Autenticado

Este documento descreve um possível tijolo futuro de mapa interno, caso os dados pós-banca indiquem que há base suficiente para mapa.

## Condições mínimas

- 20 ou mais escutas revisadas.
- 3 ou mais bairros/territórios envolvidos.
- Dossiês fechados ou justificativa institucional.
- Devolutivas aprovadas quando forem usadas como referência.
- Nenhum alerta de dado sensível pendente.
- Lugares estruturados normalizados em `normalized_places`.
- Nenhum lugar com visibilidade `sensitive` no recorte do mapa.

## Pré-requisitos obrigatórios antes de implementar

- Relatório de qualidade territorial copiado de `/territorios/qualidade`.
- Relatório de qualidade da normalização copiado de `/territorios/normalizacao/qualidade`.
- Desenho técnico registrado em `docs/desenho-tecnico-mapa-interno.md`.
- Decisão formal preenchida em `docs/decisao-mapa-interno.md`.
- Validação de RLS no banco aplicado, especialmente `normalized_places` e `places_mentioned`.
- Validação de que `visibility = sensitive` não aparece em `/mapa`.
- Validação de que `place_type = sensivel_nao_publicar` não aparece em `/mapa`.
- Confirmação de que o mapa não incluirá fala original, entrevistador, nome de pessoa ou endereço pessoal.

O primeiro mapa interno deve ser autenticado, agregado por bairro/território, sem falas originais, sem dados pessoais e sem publicação externa.

## Escopo do mapa interno

- Mapa interno autenticado.
- Agregação por bairro/território.
- Temas por bairro.
- Intensidade de escutas por território.
- Lugares mencionados sanitizados e agregados.
- Uso preferencial de `normalized_places` para nomes exibidos.
- Filtros por mês, ação, tema e status de revisão.

## Fora do escopo

- Página pública.
- Mapa público.
- GeoJSON aberto.
- Falas originais.
- Entrevistador.
- Nome de pessoa escutada.
- CPF, telefone, e-mail ou endereço pessoal.
- Ponto preciso de residência ou local sensível.

## Cuidados de privacidade

- Não mostrar pontos individuais de escuta.
- Usar agregação territorial.
- Evitar visualização quando houver poucos registros no território.
- Sinalizar dados incompletos ou sem revisão.
- Manter acesso autenticado.
- Usar apenas lugares estruturados e não sensíveis.
- Usar preferencialmente lugares normalizados, não texto livre.
- Não usar lugares marcados como `sensivel_nao_publicar`.
- Não usar lugares com `normalized_places.visibility = sensitive`.
- Falas originais não entram no mapa.
- Lugares ambíguos devem permanecer como “em revisão” até decisão da equipe.

## Critérios de validação

- A equipe entende o que o mapa mostra.
- O mapa não sugere precisão falsa.
- A coordenação valida que não há risco de identificação.
- O relatório mensal continua funcionando sem depender do mapa.
