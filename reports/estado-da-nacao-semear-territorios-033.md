# Estado da Nação - SEMEAR Territórios 033

## Diagnóstico pré-aplicação

Artefatos verificados no repositório:

- `supabase/migrations/20260504142500_extend_neighborhoods_official_metadata.sql`;
- `supabase/migrations/20260504143000_apply_official_neighborhoods_volta_redonda.sql`;
- `supabase/seeds/neighborhoods.official.csv`;
- `supabase/seeds/generated/neighborhoods.official.structured.generated.sql`;
- `docs/decisao-grafia-bairros-oficiais.md`;
- `scripts/check-neighborhood-cleanup-safety.ts`;
- `scripts/build-neighborhoods-official-sql.ts`.

O projeto remoto identificado pela CLI Supabase foi `semear territorios`, referência `gtpitwhslqjgbuwlsaqg`.

## Migrations aplicadas

Aplicação realizada pelo fluxo padrão da Supabase CLI:

```bash
npx supabase db push
```

Migrations aplicadas no banco remoto/homologação:

- `20260504142500_extend_neighborhoods_official_metadata.sql`;
- `20260504143000_apply_official_neighborhoods_volta_redonda.sql`.

A primeira tentativa da segunda migration falhou porque o banco já possuía bairros operacionais com `name` igual a bairros oficiais e a constraint real do schema é `neighborhoods.name`. A migration foi ajustada para usar `on conflict (name) do update`, sem delete e sem limpeza. A segunda execução foi concluída com sucesso.

## Resultado da validação remota

Relatório criado:

- `reports/neighborhoods-remote-application-validation.md`

Resultado:

- total de `neighborhoods`: 73;
- bairros oficiais: 52;
- territórios provisórios restantes: 21;
- `actions_total`: 0;
- `listening_records_total`: 0;
- `places_mentioned_total`: 0;
- `normalized_places_total`: 0;
- `official_code` preenchido: 52;
- faixa de códigos: 1 a 52;
- códigos ausentes: nenhum;
- duplicidade de `official_code`: nenhuma;
- duplicidade exata de `name/city`: nenhuma;
- `region` preenchido nos oficiais: sim;
- `city = Volta Redonda` nos oficiais: sim;
- geocodificação: ausente;
- dados pessoais: ausentes.

## Setores encontrados

- `SCN`: 9;
- `SO`: 5;
- `SN`: 7;
- `SL`: 6;
- `SS`: 3;
- `SCS`: 11;
- `SSO`: 11.

## Checagem real de limpeza segura

Relatório atualizado:

- `supabase/seeds/generated/neighborhoods.cleanup-safety.report.md`

Resultado remoto:

- territórios avaliados: 73;
- `SAFE_TO_REMOVE`: 73;
- `BLOCKED`: 0.

Interpretação: não há vínculos em `actions`, `listening_records`, `places_mentioned` ou `normalized_places`. Isso não autoriza delete automático. Os 52 bairros oficiais devem ser preservados; eventual limpeza futura deve mirar apenas registros provisórios e passar por revisão humana.

Nenhuma limpeza foi executada.

## Status de /territorios

O build validou a rota `/territorios` com o painel administrativo atualizado. A tela está preparada para mostrar:

- total de territórios;
- total oficial;
- setor;
- região;
- código oficial;
- status;
- filtros por setor, status e cidade;
- alerta para territórios com status diferente de `oficial`.

Como ainda há 21 territórios provisórios sem vínculo, a interface deve exibir esses registros como pendência operacional, sem apagar nada automaticamente.

## Status dos formulários

Os selects de bairro/território foram atualizados e validados no build para:

- `/acoes/nova`;
- `/escutas/nova`;
- `/escutas`;
- revisão territorial;
- normalização de lugares.

Critério adotado: ordenar por setor e nome e exibir rótulos como `Retiro — SCN` e `Aterrado — SCS`.

## Decisão de grafia

Documento atualizado:

- `docs/decisao-grafia-bairros-oficiais.md`

Decisão operacional:

- `Jardim Suiça`: mantido como lido no PDF, pendente de validação futura;
- `Santa Inez`: mantido como lido no PDF, pendente de validação futura.

A pendência de grafia não bloqueou a aplicação porque a grafia do PDF foi preservada e registrada em `notes`.

## Liberação para primeira ação real

Do ponto de vista técnico, o sistema está liberado para cadastrar a primeira ação real, desde que a equipe selecione um território com `status = oficial` em `/territorios`.

Não foi criada nenhuma ação automaticamente.

## Riscos restantes

- Existem 21 territórios provisórios sem vínculo; eles podem confundir a seleção se permanecerem por muito tempo.
- A limpeza desses provisórios precisa de decisão humana e migration própria, nunca delete manual solto.
- A grafia de `Jardim Suiça` e `Santa Inez` segue pendente de validação da APS/equipe territorial.
- As credenciais usadas nesta sessão não foram gravadas em arquivo, mas devem ser rotacionadas se tiverem sido compartilhadas fora de canal seguro.

## Próximo tijolo recomendado

Tijolo 034: criar fluxo seguro de desativação/arquivamento dos 21 territórios provisórios sem vínculo ou ocultá-los dos selects operacionais, preservando os 52 bairros oficiais e permitindo cadastrar a primeira ação real com menor risco de escolha equivocada.
