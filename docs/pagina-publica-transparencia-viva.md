# Página pública controlada da Transparência Viva (Tijolo 063)

## Objetivo

Implementar a primeira página pública oficial da Transparência Viva em rota interna do SEMEAR, sem integração PWA nesta etapa, consumindo exclusivamente o payload aprovado de `/api/public/transparencia-viva`.

Rota pública desta etapa:

- `/publico/transparencia-viva`

## Fonte única de dados

A página pública consome apenas o último snapshot com `status = published` retornado pela API pública.

Regras:

- não consulta tabelas de escutas brutas no frontend público;
- não usa `service_role` no frontend;
- não mostra IDs internos nem trilha editorial interna.

## Conteúdo exibido

A página publica apenas sínteses agregadas e revisadas:

- resumo público institucional;
- métricas agregadas;
- temas mais citados;
- separação explícita entre:
  - onde realizamos ações;
  - de onde vêm as pessoas escutadas;
- palavras recorrentes com filtro adicional de segurança;
- linha do tempo de ações;
- devolutivas aprovadas;
- nota metodológica territorial com sinalização por status;
- aviso fixo de proteção de dados.

## Estado sem publicação

Quando não existir snapshot `published`, a rota exibe somente:

- título: `Transparência Viva em preparação`;
- texto: `Os dados públicos do SEMEAR serão disponibilizados após revisão, homologação e publicação institucional.`

Sem stack trace, sem erro técnico e sem qualquer detalhe interno.

## Regras de privacidade desta página

A página não pode expor:

- escutas brutas;
- fala original;
- entrevistador;
- e-mail;
- CPF;
- telefone;
- endereço, rua, número ou CEP;
- dados de saúde individual;
- IDs internos;
- anexos;
- relatórios semanais.

Além disso, palavras recorrentes passam por filtro de padrão sensível no frontend para defesa em profundidade.

## Nota metodológica territorial

A sinalização territorial segue três estados:

- `boa`: nota discreta;
- `atenção`: aviso visível de leitura parcial;
- `crítica`: aviso forte de cautela metodológica e, quando houver, justificativa institucional sanitizada.

## Arquivos principais desta entrega

- `app/publico/transparencia-viva/page.tsx`
- `components/public/transparency/public-transparency-page.tsx`
- `components/public/transparency/public-transparency-methodology-note.tsx`
- `components/public/transparency/public-transparency-hero.tsx`
- `components/public/transparency/public-transparency-metrics.tsx`
- `components/public/transparency/public-transparency-themes.tsx`
- `components/public/transparency/public-transparency-territories.tsx`
- `components/public/transparency/public-transparency-words.tsx`
- `components/public/transparency/public-transparency-timeline.tsx`
- `tests/transparencia/public-page-privacy.test.ts`

## Validação sugerida

1. Publicar um snapshot aprovado e abrir `/publico/transparencia-viva`.
2. Confirmar ausência total de dados sensíveis e campos internos.
3. Simular ausência de snapshot publicado e validar estado de preparação.
4. Executar suíte local:
   - `npm run test:transparencia`
   - `npm run lint`
   - `npm run build`
   - `npm run verify`
