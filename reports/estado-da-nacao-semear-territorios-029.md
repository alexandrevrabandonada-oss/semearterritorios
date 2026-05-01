# Estado da Nação — SEMEAR Territórios 029

## Diagnóstico inicial

Foi concluída a estabilização do banco remoto para o ciclo territorial inicial:

- schema completo aplicado por migrations versionadas;
- carga inicial de bairros executada;
- conjunto operacional ampliado para permitir uso imediato da interface;
- templates criados para migração futura para lista oficial.

A execução no remoto foi feita com conexão direta via db-url, contornando limitação de permissão no fluxo padrão de login role do CLI.

## Status atual no banco remoto

Métricas coletadas após o push das migrations:

- neighborhoods_total: 23
- neighborhoods_with_actions: 0
- neighborhoods_with_records: 0
- actions_total: 0
- records_total: 0

Leitura operacional: a base está pronta para uso, com bairros carregados, mas ainda sem operação real registrada.

## Entregas concluídas neste ciclo

- Criação das tabelas e políticas necessárias ao fluxo territorial.
- Seed inicial de bairros padrão.
- Seed operacional ampliado de bairros para destravar formulários.
- Ajuste do .gitignore para suprimir supabase/.temp.
- Template para lista oficial:
  - supabase/seeds/neighborhoods.official.template.sql
- Template para limpeza segura de bairros operacionais:
  - supabase/seeds/neighborhoods.operational.cleanup.template.sql
- Atualização do procedimento em docs/matriz-priorizacao-mapa.md.

## Risco e governança

Risco principal atual: manter bairros operacionais por tempo excessivo sem substituição oficial.

Mitigação já preparada:

1. Carga oficial versionada por migration nova.
2. Limpeza segura apenas para bairros sem vínculos em ações, escutas e lugares.
3. Registro contínuo no histórico de migrations e relatórios.

## Próximo passo recomendado

1. Receber a lista oficial da APS/equipe territorial.
2. Gerar migration com base em supabase/seeds/neighborhoods.official.template.sql.
3. Aplicar no remoto.
4. Executar limpeza segura com base em supabase/seeds/neighborhoods.operational.cleanup.template.sql.
5. Validar em /acoes/nova, /escutas/nova e /territorios.

## Privacidade

Não houve introdução de mapa geográfico público, geocodificação, nem exposição de dado pessoal. O escopo permanece em agregação territorial autenticada.
