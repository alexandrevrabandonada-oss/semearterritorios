# Estado da Nação - SEMEAR Territórios 005

Data: 2026-04-27  
Tijolo: 5 - Dashboard de padrões

## Resumo

O dashboard inicial foi transformado em um painel funcional de padrões calculado a partir dos dados reais disponíveis no Supabase. Os dados mockados do Tijolo 1 foram removidos da home.

O painel organiza sínteses para a equipe e para relatórios mensais, mantendo o cuidado metodológico de não apresentar classificação automática como verdade final.

## Arquivos alterados

Alterado:

- `components/dashboard.tsx`

Criado:

- `reports/estado-da-nacao-semear-territorios-005.md`

## Funcionalidades implementadas

O dashboard mostra:

- total de ações;
- total de escutas;
- bairros visitados;
- escutas por mês;
- temas mais recorrentes;
- temas por bairro;
- últimas escutas digitadas;
- pendências de revisão;
- palavras recorrentes a partir de `words_used`.

## Filtros

Foram implementados filtros por:

- mês;
- bairro;
- tipo de ação;
- tema.

Os indicadores e visualizações são recalculados no cliente a partir dos dados filtrados.

## Visualizações

Foram implementadas:

- cards de indicadores;
- tabela simples;
- barras horizontais para temas mais citados;
- lista de palavras recorrentes;
- lista de últimas escutas;
- tabela de pendências de revisão;
- estados vazios pedagógicos.

## Dados e privacidade

O dashboard busca dados de:

- `actions`;
- `listening_records`;
- `neighborhoods`;
- `themes`;
- `listening_record_themes`.

Não foram adicionados campos sensíveis. O dashboard não exibe CPF, telefone, endereço pessoal ou dado de saúde individual identificável.

As últimas escutas exibem trecho da fala original, que é dado interno do sistema. Isso segue a proposta do produto, mas deve continuar protegido por autenticação e RLS.

## Estados vazios

Quando não há dados, o painel orienta a equipe a cadastrar ações e escutas. Quando há dados, mas faltam temas ou palavras usadas, cada bloco explica o que precisa ser preenchido para gerar aquela síntese.

## Verificação

Comandos rodados:

- `npm run lint` - passou.
- `npm run build` - passou.
- `npm run verify` - passou.

## Pendências operacionais

1. Aplicar migrations no Supabase real.
2. Configurar `.env.local` com variáveis públicas do Supabase.
3. Implementar autenticação, pois os dados são internos.
4. Refinar RLS antes de produção.
5. Avaliar se o painel deve exibir trechos da fala original ou apenas metadados em perfis menos autorizados.

## Riscos

1. O dashboard depende de queries client-side; com volume grande de dados, será necessário mover agregações para views/RPCs no Postgres.
2. Sem login implementado, a RLS impedirá acesso ao dashboard real para usuários anônimos.
3. Os tipos Supabase ainda são manuais.
4. A lista de palavras recorrentes depende da qualidade do preenchimento de `words_used`.

## Próximos passos

1. Implementar autenticação interna.
2. Aplicar schema e seeds no Supabase.
3. Criar módulo de Territórios para qualificar bairros.
4. Criar relatório mensal baseado em escutas revisadas.
5. Considerar views SQL para agregações do dashboard quando houver mais dados.
