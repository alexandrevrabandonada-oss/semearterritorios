# Estado da Nação - SEMEAR Territórios 032

## Diagnóstico inicial

A tabela `public.neighborhoods` tinha apenas `name`, `city`, `notes`, `created_by`, `created_at` e `updated_at`. Não havia campos estruturados para `official_code`, `sector`, `region`, `aliases` ou `status`.

A lista oficial já estava disponível em `supabase/seeds/neighborhoods.official.csv` com 52 bairros de Volta Redonda, códigos oficiais de 1 a 52, setores `SCN`, `SO`, `SN`, `SL`, `SS`, `SCS` e `SSO`, sem linhas de total/subtotal e sem duplicidades exatas.

Não houve consulta ao banco remoto nesta sessão porque as variáveis Supabase não estavam disponíveis para o script de checagem. Por isso, nenhuma limpeza foi classificada como segura para execução.

## Decisão sobre campos estruturados

Foi adotado o modelo simples dentro de `public.neighborhoods`:

- `official_code integer nullable`;
- `sector text nullable`;
- `region text nullable`;
- `aliases text nullable`;
- `status text nullable default 'provisorio'`.

Foram adicionadas constraints para valores permitidos de `sector` e `status`, além de índice único parcial para `official_code` quando não nulo.

## Migrations criadas

- `supabase/migrations/20260504142500_extend_neighborhoods_official_metadata.sql`
- `supabase/migrations/20260504143000_apply_official_neighborhoods_volta_redonda.sql`

A migration de aplicação:

- aplica os 52 bairros oficiais;
- preenche `official_code`, `sector`, `region`, `aliases`, `notes` e `status`;
- preserva registros existentes por código oficial ou por nome/cidade;
- não apaga bairros;
- não remove vínculos;
- não geocodifica.

## SQL estruturado gerado

Arquivo criado:

- `supabase/seeds/generated/neighborhoods.official.structured.generated.sql`

O SQL estruturado usa a mesma lógica segura da migration de aplicação e serve como artefato de conferência.

## Checagem de limpeza segura

Arquivo criado:

- `supabase/seeds/generated/neighborhoods.cleanup-safety.report.md`

Resultado: pendente de conexão ao banco aplicado. O script `scripts/check-neighborhood-cleanup-safety.ts` foi tentado com Node, mas não havia `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` e chave configurada no ambiente.

Regra mantida:

- `SAFE_TO_REMOVE`: somente se não houver vínculo em `actions`, `listening_records`, `places_mentioned` ou `normalized_places`;
- `BLOCKED`: qualquer vínculo bloqueia remoção.

Nenhuma limpeza foi executada.

## Mudanças em /territorios

O painel administrativo de territórios agora mostra:

- total de territórios;
- total oficial;
- territórios sem uso;
- territórios com ações;
- territórios com escutas;
- nome;
- cidade;
- setor;
- região;
- código oficial;
- status;
- alerta quando status não for oficial.

Foram adicionados filtros por setor, status e cidade.

## Mudanças nos formulários

Os selects de bairro/território foram ajustados para ordenar por setor e nome e exibir rótulos como:

- `Retiro — SCN`;
- `Aterrado — SCS`.

Pontos atualizados:

- formulário de ação;
- formulário de escuta individual;
- listagem/filtros de escutas;
- fila de revisão territorial;
- painel de revisão territorial;
- listagem/filtros de ações;
- normalização de lugares;
- qualidade da normalização.

## Mudanças em /ajuda

Foi adicionada a seção “Lista oficial de bairros”, explicando:

- a lista oficial tem 52 bairros;
- setores foram preservados;
- códigos oficiais foram preservados;
- bairros/territórios são agregações;
- não registrar endereço pessoal;
- dúvidas de grafia devem ser registradas em `docs/decisao-grafia-bairros-oficiais.md`.

## Pontos de grafia

Documento criado:

- `docs/decisao-grafia-bairros-oficiais.md`

Pendências preservadas:

- `Jardim Suiça`: manter grafia lida no PDF até decisão da APS/equipe territorial;
- `Santa Inez`: manter grafia lida no PDF até decisão da APS/equipe territorial.

## Lista aplicada ou pendente

A aplicação foi preparada em migration versionada, mas não foi executada no banco remoto por este tijolo. A execução deve ocorrer pelo fluxo normal de deploy/migrations do projeto.

## Riscos restantes

- A checagem de limpeza segura precisa ser rodada contra o banco aplicado antes de qualquer limpeza futura.
- `Jardim Suiça` e `Santa Inez` ainda exigem decisão formal da APS/equipe territorial.
- Se houver registros operacionais com nomes muito parecidos, a aplicação segura pode manter linhas provisórias adicionais; isso deve ser tratado por relatório de limpeza, nunca por delete automático.

## Próximo tijolo recomendado

Tijolo 033: aplicar migrations no banco remoto/homologação, rodar checagem real de limpeza segura, validar `/territorios` com os 52 bairros oficiais e cadastrar a primeira ação real após confirmação da APS/equipe territorial.
