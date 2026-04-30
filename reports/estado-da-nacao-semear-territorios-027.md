# Estado da Nação — SEMEAR Territórios 027

## Diagnóstico do portão

O Tijolo 027 foi tratado como condicional.

Foram verificados:

- `/mapa/interno`;
- `components/mapa/internal-map-gate.tsx`;
- `internal_map_homologations`;
- `lib/internal-map-homologation-records.ts`;
- `lib/internal-map-scope.ts`;
- `types/internal-map.ts`;
- `/mapa`;
- `/territorios/qualidade`;
- `/territorios/normalizacao/qualidade`.

A regra lógica confirmada no código é:

```ts
mapPrototypeAuthorized =
  latestHomologation.status === "approved" &&
  latestHomologation.decision === "go_prototipo_interno";
```

Sem essa combinação no último registro persistente, o protótipo visual permanece bloqueado.

## Resultado

Tijolo 027 não implementou mapa visual porque o portão não está autorizado.

Não foi criada biblioteca de mapa, não foi instalado Leaflet, não foi usado GeoJSON, não foi criada camada visual geográfica e não foi alterado o escopo do mapa-lista V0.

## Status da homologação

Durante esta execução local não houve evidência acessível de um registro persistente aprovado no banco aplicado com:

- `status = approved`;
- `decision = go_prototipo_interno`.

O estado real em produção/homologação continua sendo determinado em tempo de execução pela consulta da rota `/mapa/interno` à tabela `internal_map_homologations`.

## Decisão atual

Sem confirmação persistente de GO formal, a decisão técnica é:

- manter `/mapa` como mapa-lista V0;
- manter `/mapa/interno` como portão técnico;
- não implementar protótipo visual neste tijolo.

## Pendências

Para liberar o protótipo visual, é necessário:

- criar ou atualizar homologação persistente em `/territorios/mapa/homologacao`;
- validar RLS manualmente no banco aplicado;
- confirmar admin, coordenação, equipe e anon nos testes;
- confirmar ausência de `service_role` no frontend;
- confirmar privacidade;
- confirmar ausência de geocodificação;
- ter 20 ou mais escutas revisadas;
- ter 3 ou mais territórios com dados;
- zerar sensíveis pendentes;
- zerar duplicidades relevantes;
- aprovar a homologação como coordenação/admin;
- garantir `decision = go_prototipo_interno`.

## Ajuste feito

`components/mapa/internal-map-gate.tsx` foi ajustado para deixar explícito:

- a variável lógica `mapPrototypeAuthorized`;
- a mensagem “Tijolo 027 bloqueado para mapa visual” quando não houver GO;
- que o mapa-lista V0 deve continuar sendo usado até aprovação persistente.

## Motivo do bloqueio

O bloqueio existe porque o protótipo visual do mapa interno pode aumentar risco institucional e territorial se for criado antes de homologação auditável.

Sem registro persistente aprovado, o sistema não deve assumir autorização por documentação, expectativa ou estado visual local.

## Privacidade

Nenhum mapa visual foi implementado.

A rota `/mapa/interno` continua sem exibir:

- fala original;
- entrevistador;
- CPF;
- telefone;
- e-mail;
- endereço;
- lugares `sensitive`;
- lugares `sensivel_nao_publicar`;
- coordenadas;
- pontos individuais.

## Próximo passo recomendado

1. Abrir `/territorios/mapa/homologacao`.
2. Criar ou revisar a homologação persistente.
3. Validar RLS manualmente no banco aplicado.
4. Resolver pendências de dados, privacidade e normalização.
5. Aprovar apenas quando os critérios forem atendidos.
6. Voltar a `/mapa/interno`.
7. Só executar o protótipo visual em um próximo tijolo se o portão mostrar “Autorizado para protótipo”.
