# Estado da Nacao — SEMEAR Territorios — Tijolo 064

## Diagnostico inicial
O fluxo de dossie e devolutiva ja era funcional, mas faltava densidade analitica para apoiar decisao institucional com leitura territorial responsavel. A equipe tinha indicadores basicos, sem coocorrencia de temas, sem sinais fortes priorizados e sem um bloco de recomendacoes orientado por evidencias.

## Motor analitico criado
- Arquivo: lib/action-analytics.ts
- Entrega: funcao buildActionAnalytics(actionId, records, actionName?, actionTerritory?)
- Garantias: 100% deterministico, sem IA gerativa, sem inferencia territorial indevida, sem geocodificacao, sem exposicao de dado pessoal.
- Saidas principais:
	- rankings de tema, palavra, prioridade e lugar
	- coocorrencia de temas
	- leitura por territorio de referencia do respondente
	- leitura por ocupacao com regra de frequencia minima
	- sinais analiticos (forca, cobertura, revisao e padroes)
	- alertas metodologicos
	- encaminhamentos sugeridos
	- avaliacao de seguranca para uso publico

## Mudancas no dossie
- Arquivo: components/actions/action-dossier-page.tsx
- Integracao completa do motor analitico e dos paineis:
	- sinais analiticos
	- matriz de temas
	- coocorrencia
	- leitura territorial responsavel
	- leitura por ocupacao
	- lugares mencionados com ocultacao de padrao sensivel
	- alertas metodologicos
	- proximos encaminhamentos
- Exportacao markdown melhorada: agora inclui resumo executivo, sinais fortes e encaminhamentos sugeridos.
- Inclusao de bloco de transicao para falas candidatas sanitizadas, sem publicar fala bruta automaticamente.

## Mudancas na devolutiva
- Arquivo: components/actions/action-debrief-page.tsx
- Redesenho com dois modos:
	- Modo tecnico interno
	- Modo publico
- Inclusao de ressalva metodologica automatica conforme qualidade de cobertura territorial.
- Integracao de alertas metodologicos no fluxo de devolutiva.
- Texto publico e markdown agora incorporam cautela territorial automaticamente quando necessario.

## Visual, impressao e mobile
- Painel analitico consolidado com cards e hierarquia visual padronizada.
- Arquivo: app/globals.css
	- melhorias de impressao com @page, preservacao de contraste e reducao de quebra ruim entre cards.
- Interfaces com grids responsivos e empilhamento adequado em telas menores.

## Ajuda operacional
- Arquivo: app/ajuda/page.tsx
- Nova secao "Dossie e devolutiva avancados" explicando:
	- diferenca entre uso interno e publico
	- regra de privacidade
	- regra metodologica quando cobertura territorial e critica

## Validacao tecnica
- npm run lint: OK
- npm run build: OK
- npm run verify: OK

## Garantias de privacidade
- Nao publica fala bruta automaticamente.
- Mantem abordagem agregada para devolutiva publica.
- Nao remove RLS nem amplia privilegios de acesso.

## Riscos restantes
- Fluxo de "falas representativas sanitizadas" ainda depende de schema dedicado para ciclo completo (selecao, revisao e aprovacao editorial de trecho).
- Teste de cenario real com massa especifica (ex: 42 escutas, cobertura 14.3%) depende da base de homologacao conter esse conjunto para validacao ponta a ponta.

## Proximo tijolo recomendado
Tijolo 065: consolidar workflow de falas representativas sanitizadas com trilha de aprovacao e auditoria editorial, reutilizando as salvaguardas metodologicas do motor 064.
