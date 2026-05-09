# Estado da Nação — SEMEAR Territórios — Tijolo 064

## Diagnóstico Inicial
O sistema possuía uma Central de Avisos funcional (Tijolo 063), mas os alertas eram exibidos de forma isolada, gerando ruído visual e dependendo da proatividade individual para recálculo. Faltava uma camada de inteligência que traduzisse esses avisos em uma rotina de trabalho clara por papel.

## Componentes Criados
- **DailyBriefingPanel**: Componente premium e responsivo integrado ao Dashboard e à Central de Avisos. Oferece uma visão consolidada do "estado da nação" operacional para o usuário logado.
- **build-daily-briefing.ts**: Motor de lógica determinística que agrupa notificações, calcula métricas de saúde e gera recomendações de ação personalizadas.

## Regras de Prioridade (Tijolo 064)
Implementamos uma hierarquia clara de prioridades:
- **Urgent**: Riscos de privacidade (dados sensíveis), erros críticos de sincronização, eventos atrasados e relatórios de semanas anteriores pendentes.
- **High**: Pendências operacionais da semana (dossiês, devolutivas, revisão territorial).
- **Normal**: Rotina e planejamento (eventos de amanhã, revisões editoriais).
- **Low**: Informativos gerais.

## Agrupamento de Avisos
Para reduzir o ruído, avisos repetitivos são agora agrupados logicamente:
- Ex: *"12 escutas aguardam revisão"* em vez de 12 cards individuais.
- Isso permite uma leitura rápida e foco no que é volumoso ou urgente.

## Melhorias no Recálculo
O botão "Atualizar Avisos" foi aprimorado para suportar diferentes escopos:
- **Meus avisos**: Foco no indivíduo.
- **Avisos do papel**: Foco na colaboração (ex: Coordenação).
- **Avisos gerais**: Visão macro da operação (Admin/Coordenação).
O sistema agora exibe estatísticas da última atualização (novos, atualizados, ignorados).

## Resolução Assistida
Cada aviso na central agora exibe uma **Ação Recomendada** contextualizada com ícones específicos:
- "Revisar escutas", "Abrir dossiê", "Reconectar Google", "Abrir relatório", etc.
- Botões de ação rápida para marcar como lido, dispensar ou arquivar.

## Métricas de Saúde Operacional
Adicionamos um painel de indicadores de saúde no resumo diário:
- Monitoramento de pendências de escuta, relatórios, transparência e erros técnicos.

## Documentação
- Criado: `docs/orquestracao-avisos-internos.md`
- Atualizado: `docs/central-de-avisos-internos.md`

## Garantias de Privacidade e Segurança
- **Sem Push/E-mail/Webhook**: Todo o sistema continua 100% interno ao app.
- **Dados Protegidos**: O resumo diário não expõe falas, CPFs ou dados sensíveis.
- **RLS Preservado**: Nenhuma regra de segurança foi relaxada.

## Riscos Restantes
- O recálculo ainda é manual; embora facilitado, depende de um clique do usuário para refletir mudanças externas imediatas (como uma alteração manual no banco por outro usuário).

## Próximo Tijolo Recomendado
**Tijolo 065: Automação de Limpeza e Notificações de Contexto**. Sugerir limpeza automática de avisos cujas fontes foram excluídas e adicionar avisos de "boas-vindas operacional" para novos membros.
