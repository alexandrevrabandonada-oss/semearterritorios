# Estado da Nação - SEMEAR Territórios 007

Data: 2026-04-27  
Tijolo: 7 - Relatório Mensal

## Resumo

Foi implementado o módulo de relatório mensal com geração automática por mês/ano a partir dos dados já cadastrados em ações e escutas. O sistema consolida métricas, temas, prioridades, pendências e listas operacionais sem uso de IA generativa.

## Arquivos alterados

Alterado:

- `app/relatorios/page.tsx`

Criados:

- `app/relatorios/novo/page.tsx`
- `app/relatorios/[mes]/page.tsx`
- `components/reports/monthly-reports-hub.tsx`
- `components/reports/monthly-report-month-picker.tsx`
- `components/reports/monthly-report-detail.tsx`
- `lib/monthly-reports.ts`
- `reports/estado-da-nacao-semear-territorios-007.md`

## Rotas implementadas

- `/relatorios` - listagem de meses disponíveis e acesso ao relatório mensal.
- `/relatorios/novo` - escolha de mês e ano.
- `/relatorios/[mes]` - relatório gerado para o mês no formato `AAAA-MM`.

## Funcionalidades implementadas

Ao escolher um mês, o módulo gera:

- total de ações;
- total de escutas;
- bairros envolvidos;
- tipos de ação;
- temas mais recorrentes;
- síntese de busca ativa baseada em contagens e origens de escuta;
- síntese pedagógica baseada em temas, prioridades, revisão e resumos preenchidos;
- temas inesperados a partir de `unexpected_notes`;
- prioridades apontadas a partir de `priority_mentioned`;
- lista de ações do mês;
- pendências de revisão.

## Exportação

Foram implementados:

- botão para copiar texto simples do relatório;
- botão para copiar markdown do relatório;
- botão para exportar CSV com as escutas do mês.

O markdown é gerado localmente com estrutura pronta para colar em documentos, e o CSV inclui data, bairro, ação, temas, prioridade, observação inesperada, fala original e resumo da equipe.

## Método

Não foi usada IA. As sínteses são montadas por regras determinísticas em `lib/monthly-reports.ts`, usando contagens, listas e campos textuais já preenchidos pela equipe.

Essa abordagem mantém auditabilidade e reduz o risco de invenção de conteúdo não registrado.

## Dados utilizados

O módulo consolida dados de:

- `actions`;
- `listening_records`;
- `neighborhoods`;
- `listening_record_themes`;
- `themes`.

## Riscos e limites

1. As sínteses textuais dependem da qualidade do preenchimento de `team_summary`, `priority_mentioned` e `unexpected_notes`.
2. Como a geração é client-side, volumes muito grandes podem exigir views SQL ou RPCs no Supabase.
3. O módulo ainda não salva relatórios prontos em `monthly_reports`; ele os gera sob demanda a partir do mês solicitado.

## Verificação

Comandos planejados para verificação:

- `npm run lint`
- `npm run build`
- `npm run verify`

## Próximos passos

1. Permitir salvar uma versão revisada do relatório em `monthly_reports`.
2. Adicionar exportação `.md` como arquivo baixável.
3. Criar versão impressa do relatório com layout de devolutiva.
4. Limitar o relatório a escutas revisadas quando isso for uma decisão metodológica da equipe.