# Estado da Nação — SEMEAR Territórios 026

## Diagnóstico inicial

O sistema já tinha mapa-lista V0 em `/mapa`, homologação persistente em `internal_map_homologations`, rota `/territorios/mapa/homologacao`, biblioteca de escopo do mapa interno e tipos agregados para um futuro mapa. Não havia ainda uma rota intermediária que bloqueasse explicitamente o protótipo visual quando a homologação persistente não estivesse aprovada com decisão `go_prototipo_interno`.

Também foi confirmado que o Tijolo 026 não precisa criar migration: a tabela persistente já foi criada no Tijolo 025.

## Rota criada

- `/mapa/interno`

Nome da tela: “Mapa Interno Autenticado”.

A rota funciona como portão técnico. Ela não renderiza mapa geográfico, não usa Leaflet, não usa GeoJSON, não usa coordenadas e não geocodifica.

## Componente criado

- `components/mapa/internal-map-gate.tsx`

O componente carrega:

- última homologação persistente;
- escutas com temas e lugares estruturados;
- bairros;
- lugares normalizados;
- menções de lugares para qualidade de normalização.

Depois calcula escopo agregado seguro usando as bibliotecas existentes.

## Documentos criados/atualizados

Criado:

- `docs/portao-mapa-interno.md`

Atualizado:

- `docs/tijolo-025-prototipo-mapa-interno-condicionado.md`

## Como funciona `/mapa/interno`

A tela mostra:

- status da homologação persistente;
- decisão atual;
- justificativa registrada;
- aprovação e responsável, quando houver;
- resultado do portão;
- checklist de pendências quando o protótipo não está autorizado.

Se houver autorização, mostra apenas uma pré-visão textual dos dados agregados:

- total de territórios;
- total de escutas revisadas;
- territórios prontos;
- temas agregados por território;
- lugares normalizados seguros;
- territórios bloqueados, quando houver.

## Regra de liberação do protótipo

O estado “Autorizado para protótipo” só aparece quando:

- `internal_map_homologations.status = approved`;
- `internal_map_homologations.decision = go_prototipo_interno`.

Qualquer outro estado bloqueia o protótipo visual.

## Estado atual

O estado atual depende do último registro persistente no banco aplicado. Sem esse registro aprovado com decisão `go_prototipo_interno`, o portão exibirá bloqueio ou pendência de homologação.

## Integrações

`/mapa` agora exibe um card “Mapa Interno Autenticado” com:

- status da homologação persistente;
- decisão atual;
- botão para abrir `/mapa/interno`;
- alerta quando não há GO persistente.

`/ajuda` agora inclui a seção “Portão do mapa interno”.

## Privacidade

O portão não exibe:

- fala original;
- entrevistador;
- CPF;
- telefone;
- e-mail;
- endereço;
- lugares com `visibility = sensitive`;
- lugares com `place_type = sensivel_nao_publicar`;
- coordenadas.

## Tijolo 027

O Tijolo 027 só pode ser protótipo visual se `/mapa/interno` indicar “Autorizado para protótipo”. Caso contrário, o próximo tijolo deve corrigir pendências de homologação, dados, privacidade ou normalização.

## Riscos restantes

- A validação de RLS continua sendo manual e precisa de evidência fora do app.
- O campo `approved_by` é exibido como identificador técnico; se necessário, um próximo tijolo pode resolver nomes de perfis.
- A prévia textual depende da qualidade dos dados agregados já carregados no banco aplicado.

## Próximos passos

1. Aplicar migrations no ambiente usado.
2. Preencher e aprovar homologação persistente apenas quando os critérios forem cumpridos.
3. Abrir `/mapa/interno` e registrar o resultado.
4. Autorizar Tijolo 027 somente se o portão estiver liberado.
