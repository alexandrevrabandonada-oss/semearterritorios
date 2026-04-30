# Estado da Nação — SEMEAR Territórios 024

## Diagnóstico inicial

O Tijolo 023 deixou o desenho técnico formalizado, mas ainda sem autorização para protótipo. O bloqueio correto era a ausência de homologação formal: RLS precisa ser validada manualmente no banco aplicado, a decisão precisa estar preenchida e a base precisa estar sem sensíveis, sem duplicidades relevantes e com volume territorial suficiente.

Foram verificados os fluxos existentes:

- `/mapa` segue como mapa-lista V0;
- `/territorios/qualidade` calcula qualidade territorial;
- `/territorios/normalizacao/qualidade` calcula duplicidades e sensíveis;
- `/pos-banca` mostra matriz GO/NO-GO;
- `lib/internal-map-scope.ts` concentra escopo técnico;
- `types/internal-map.ts` define a futura camada de dados.

## Documentos criados/atualizados

Criados:

- `docs/homologacao-mapa-interno.md`
- `docs/tijolo-025-prototipo-mapa-interno-condicionado.md`

Atualizado:

- `docs/tijolo-024-prototipo-mapa-interno.md`

## Rota criada

- `/territorios/mapa/homologacao`

## Componentes criados

- `components/territories/map-homologation-panel.tsx`
- `components/territories/map-homologation-page.tsx`

## Biblioteca criada

- `lib/internal-map-homologation.ts`

Ela gera:

- resumo de homologação;
- markdown copiável;
- lista de pendências;
- recomendação determinística.

## Estado da homologação do mapa

O padrão inicial é **homologação pendente**, porque a validação de RLS é manual e não deve ser simulada pelo app.

A tela permite registrar localmente:

- RLS validada manualmente;
- admin testado;
- coordenação testada;
- equipe testada;
- anônimo sem acesso;
- ausência de `service_role` no frontend;
- privacidade do mapa-lista;
- ausência de geocodificação.

## Como usar `/territorios/mapa/homologacao`

1. Abrir `/territorios/mapa/homologacao`.
2. Conferir métricas de escutas revisadas, territórios, sensíveis e duplicidades.
3. Marcar checklist manual de RLS e privacidade apenas com evidência real.
4. Conferir matriz GO/NO-GO.
5. Copiar relatório de homologação.
6. Colar evidências em `docs/homologacao-mapa-interno.md`.
7. Atualizar `docs/decisao-mapa-interno.md`.

## Critérios para GO

- RLS validada manualmente.
- Admin, coordenação e equipe testados.
- Anônimo sem acesso.
- `service_role` ausente do frontend.
- 20+ escutas revisadas.
- 3+ territórios com dados.
- Sem sensíveis pendentes.
- Sem duplicidades relevantes.
- Lugares normalizados seguros.
- Sem fala original e sem dado pessoal no contexto do mapa.

## Critérios para NO-GO

- RLS manual não validada.
- Sensível pendente.
- `sensivel_nao_publicar` visível no contexto de mapa.
- Duplicidade relevante.
- Menos de 20 escutas revisadas.
- Menos de 3 territórios com dados.
- Qualquer risco de fala original, endereço ou dado pessoal.

## Decisão recomendada

Recomendação atual: **não autorizar protótipo automaticamente**.

O Tijolo 025 só fica autorizado se a homologação registrar GO formal para protótipo interno autenticado.

## Tijolo 025 autorizado?

Não automaticamente. O Tijolo 025 está condicionado ao preenchimento de:

- `docs/homologacao-mapa-interno.md`;
- `docs/decisao-mapa-interno.md`;
- relatório copiado de `/territorios/mapa/homologacao`;
- evidência de RLS validada no banco aplicado.

## Riscos restantes

- Checklist da tela é local e não persistente.
- RLS continua exigindo validação manual fora do app.
- Duplicidades continuam heurísticas.
- O futuro mapa visual ainda pode sugerir precisão falsa se não for desenhado com cuidado.

## Próximos passos

1. Rodar homologação em ambiente com banco aplicado.
2. Registrar evidências em `docs/homologacao-mapa-interno.md`.
3. Atualizar decisão formal.
4. Só então decidir se o Tijolo 025 pode implementar protótipo interno autenticado.
