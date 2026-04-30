# Portão Técnico do Mapa Interno

Este documento define o portão técnico do futuro mapa interno autenticado do SEMEAR Territórios.

## O que é

O portão técnico é a rota `/mapa/interno`. Ela não exibe mapa geográfico, não usa GeoJSON, não usa coordenadas e não faz geocodificação.

Sua função é verificar se existe homologação persistente em `internal_map_homologations` com:

- `status = approved`;
- `decision = go_prototipo_interno`.

Sem esses dois critérios, o protótipo visual do mapa permanece bloqueado.

## Por que existe

O mapa pode aumentar risco de exposição territorial se for criado antes de revisão, normalização e validação de privacidade. O portão impede que o protótipo avance sem decisão institucional auditável.

## Mapa-lista, portão e futuro protótipo

- `/mapa`: mapa-lista V0, sem precisão geográfica.
- `/mapa/interno`: portão técnico, sem visualização geográfica.
- Futuro protótipo: só pode existir após homologação aprovada com decisão `go_prototipo_interno`.

## Critérios de liberação

- Homologação criada.
- Homologação revisada.
- Homologação aprovada.
- Decisão `go_prototipo_interno`.
- RLS validada manualmente no banco aplicado.
- 20 ou mais escutas revisadas.
- 3 ou mais territórios com dados.
- Nenhum lugar sensível pendente.
- Nenhuma duplicidade relevante.

## Estados possíveis

- Sem homologação: pendente de criação do registro persistente.
- Rascunho: homologação começou, mas não libera protótipo.
- Revisada: homologação foi revisada, mas ainda não aprovada.
- Aprovada sem `go_prototipo_interno`: mantém bloqueio para protótipo visual.
- Aprovada com `go_prototipo_interno`: autoriza iniciar o próximo tijolo de protótipo interno.
- Rejeitada: bloqueia até nova homologação ou correção.

## Se estiver bloqueado

1. Abrir `/territorios/mapa/homologacao`.
2. Corrigir pendências de dados, privacidade, normalização ou RLS.
3. Salvar nova homologação persistente.
4. Coordenação/admin deve aprovar quando os critérios forem atendidos.
5. Voltar para `/mapa/interno`.

## Se estiver autorizado

1. Registrar a evidência da homologação aprovada.
2. Anexar a decisão persistente ao planejamento do próximo tijolo.
3. Manter o escopo do protótipo autenticado, agregado e sem página pública.

## Regra central

Sem homologação persistente aprovada, sem protótipo visual do mapa.

## Tijolo 027

O Tijolo 027 deve começar verificando `/mapa/interno` e a última homologação persistente. Se o portão não estiver em “Autorizado para protótipo”, o tijolo deve parar com segurança, não criar componentes de mapa visual e registrar relatório de bloqueio.

## Kit de homologação real

Para desbloquear o portão, a coordenação deve preencher:

- `docs/checklist-homologacao-real-mapa.md`;
- `docs/teste-manual-rls-mapa.md`;
- `docs/evidencias-homologacao-mapa.md`;
- `scripts/smoke-homologacao-mapa.md`.

Esses documentos registram testes manuais de RLS, evidências de privacidade e decisão final. Sem evidência real, a homologação persistente não deve ser aprovada como `go_prototipo_interno`.
