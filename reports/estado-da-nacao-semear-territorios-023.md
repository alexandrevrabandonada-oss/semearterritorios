# Estado da Nação — SEMEAR Territórios 023

## Diagnóstico inicial

O sistema já tinha mapa-lista V0, revisão territorial, `normalized_places`, qualidade territorial, qualidade da normalização e painel de prontidão. O Estado da Nação 022 recomendou “desenho técnico antes”, pois ainda faltava formalizar escopo, fontes de dados, regras de privacidade e matriz GO/NO-GO para autorizar um protótipo.

Diagnóstico do mapa-lista atual:

- usa `listening_records`, `neighborhoods`, `listening_record_themes`, `themes` e `places_mentioned`;
- prefere `normalized_places.normalized_name` quando existe;
- oculta `visibility = sensitive`;
- oculta `place_type = sensivel_nao_publicar`;
- agrega por bairro, tema e lugar seguro;
- não usa fala original, coordenada, GeoJSON, Leaflet ou geocodificação.

## Documentos criados/atualizados

Criados:

- `docs/desenho-tecnico-mapa-interno.md`
- `docs/tijolo-024-prototipo-mapa-interno.md`

Atualizados:

- `docs/decisao-mapa-interno.md`
- `docs/escopo-futuro-mapa-interno.md`

## Componentes criados

- `components/territories/map-go-no-go-panel.tsx`

O painel foi integrado em:

- `/territorios/qualidade`
- `/territorios/normalizacao/qualidade`
- `/pos-banca`

## Bibliotecas e tipos criados

Criados:

- `lib/internal-map-scope.ts`
- `types/internal-map.ts`

A biblioteca calcula:

- total de escutas revisadas;
- territórios com dados;
- territórios prontos;
- territórios bloqueados;
- lugares normalizados seguros;
- lugares sensíveis;
- temas agregados por território;
- recomendação de escopo do mapa;
- matriz GO/NO-GO.

## Como interpretar GO/NO-GO

Resultados possíveis:

- `NO-GO: dados insuficientes`: falta volume, território ou revisão territorial.
- `NO-GO: privacidade`: há sensível pendente ou território bloqueado.
- `NO-GO: normalização`: há lugar sem normalização ou duplicidade relevante.
- `GO: desenho técnico`: dados permitem detalhar escopo, mas ainda há validação institucional/manual pendente.
- `GO: protótipo interno`: critérios técnicos, institucionais e RLS manual estão atendidos.

Critérios exibidos:

- 20+ escutas revisadas;
- 3+ territórios com dados;
- revisão territorial concluída;
- lugares normalizados;
- sem lugares sensíveis pendentes;
- sem duplicidades relevantes;
- RLS validada manualmente;
- devolutiva e dossiê fechados quando houver ação principal.

## Decisão técnica sobre mapa

Decisão do Tijolo 023: **desenho técnico formalizado, sem protótipo ainda**.

Motivo:

- o desenho técnico está documentado;
- o app agora tem matriz GO/NO-GO;
- a decisão formal foi estruturada;
- mas o protótipo ainda depende de validação manual de RLS no banco aplicado e preenchimento de `docs/decisao-mapa-interno.md`.

## Próximo tijolo pode ser protótipo?

Pode ser protótipo apenas se:

- `/territorios/qualidade` indicar base territorial suficiente;
- `/territorios/normalizacao/qualidade` não apontar duplicidade relevante ou sensível pendente;
- RLS for validada manualmente no banco aplicado;
- `docs/decisao-mapa-interno.md` autorizar “Prototipar mapa interno”.

Sem esses itens, o próximo tijolo deve ampliar dados ou corrigir normalização.

## Riscos restantes

- Validação de RLS ainda é manual.
- O papel `leitor` segue fora do schema atual.
- Duplicidades são heurísticas e exigem revisão humana.
- Não há versionamento histórico detalhado da normalização.
- O futuro mapa precisa evitar precisão falsa e interpretação de ponto individual.

## Recomendação para Tijolo 024

Recomendação: executar o Tijolo 024 somente após GO formal.

Escopo autorizado quando houver GO:

- protótipo interno autenticado;
- agregação por bairro/território;
- filtros por mês, tema e tipo de ação;
- lugares normalizados seguros;
- sem fala original;
- sem dado pessoal;
- sem página pública;
- sem geocodificação de endereço pessoal.
