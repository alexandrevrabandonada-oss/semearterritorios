# Orquestração de Avisos Internos (Tijolo 064)

- [Documentação da Central de Avisos (Tijolo 063)](file:///c:/Projetos/SEMEAR%20TERRITORIOS/docs/central-de-avisos-internos.md)
- [Documentação de Limpeza e Onboarding (Tijolo 065)](file:///c:/Projetos/SEMEAR%20TERRITORIOS/docs/limpeza-e-onboarding-avisos.md)

Este documento descreve o funcionamento da camada de orquestração de avisos internos do SEMEAR Territórios.

## Conceito

A orquestração transforma avisos individuais em uma rotina de trabalho clara para cada papel da equipe. Em vez de apenas listar problemas, o sistema agrupa pendências e sugere ações recomendadas para manter o fluxo operacional saudável.

## Tipos de Prioridade

O sistema utiliza quatro níveis de prioridade determinística:

- **Urgente**: Exige ação imediata.
    - Dados sensíveis pendentes de revisão em escutas.
    - Erros de sincronização com Google Calendar em eventos próximos.
    - Eventos atrasados (passaram do horário de término).
    - Comentários críticos de transparência (privacidade, dados, metodologia).
    - Relatórios semanais de semanas anteriores ainda não entregues.
- **Alta**: Importante para o fluxo da semana.
    - Dossiês e Devolutivas pendentes de ações realizadas.
    - Escutas aguardando revisão territorial.
    - Pacotes de homologação aguardando assinatura.
    - Relatório semanal da semana atual pendente.
    - Alterações locais pendentes de sincronização (drift).
- **Normal**: Atividades de rotina.
    - Eventos previstos para amanhã.
    - Relatórios aguardando revisão da coordenação.
    - Snapshots aguardando revisão editorial.
    - Escutas em rascunho.
- **Baixa**: Informativos.
    - Avisos do sistema e notificações gerais.

## Resumo Diário (Daily Briefing)

O Painel de Resumo Diário (exibido no Dashboard e na Central de Avisos) organiza o trabalho em cinco baldes:

1. **Hoje**: Foco nas atividades do dia atual.
2. **Urgente**: O que não pode esperar.
3. **Esta Semana**: Planejamento de curto prazo.
4. **Coordenação**: Pendências exclusivas de gestão (aprovações, revisões).
5. **Equipe**: Ações de campo e digitação.

## Redução de Ruído (Agrupamento)

Quando há múltiplos avisos do mesmo tipo (ex: 12 escutas pendentes), o sistema os agrupa em um único card informativo:
- *"12 escutas aguardam revisão"* em vez de 12 entradas separadas.
- O clique no card leva à lista filtrada para resolução em massa.

## Como Atualizar Avisos

Os avisos não são gerados por cron externo. O recálculo é manual e seguro:
- **Atualizar meus avisos**: Recalcula apenas pendências individuais.
- **Avisos do papel**: Recalcula pendências coletivas do seu papel (ex: Coordenação).
- **Avisos gerais**: Disponível para Admin/Coordenação para atualizar a saúde global do sistema.

## Resolução Assistida

Cada aviso possui uma "Ação Recomendada" clara:
- "Abrir Dossiê"
- "Revisar Escutas"
- "Reconectar Google"
- "Arquivar como resolvido" (se a pendência já foi tratada na origem).

## Privacidade e Segurança

- O resumo diário **nunca** expõe conteúdo bruto de falas ou dados sensíveis (CPF, telefone, etc).
- Todas as URLs de ação são internas e protegidas por RLS.
- Não há envio de dados para serviços externos (push/e-mail).
