# Limpeza Inteligente e Onboarding Operacional

Este documento descreve o funcionamento do **Tijolo 065**, que introduziu a camada de limpeza assistida de avisos e o fluxo de boas-vindas para novos membros do SEMEAR Territórios.

## 1. Limpeza Inteligente (Smart Cleanup)

Diferente de sistemas de notificação comuns que apagam avisos apenas por tempo, o SEMEAR utiliza um **Detector de Resolução** que verifica se a causa original do aviso ainda existe.

### O que é um Aviso Resolvido?
Um aviso é considerado resolvido quando o sistema detecta que a ação necessária foi realizada. Exemplos:
- **Devolutiva pendente**: Resolvido se a devolutiva foi aprovada.
- **Dossiê pendente**: Resolvido se o dossiê foi fechado.
- **Relatório semanal**: Resolvido se o relatório da semana foi enviado.
- **Sync Error Google**: Resolvido se o evento voltou ao estado sincronizado.

### Por que não apagamos automaticamente?
Para garantir a **rastreabilidade operacional** e o controle do usuário, avisos resolvidos não desaparecem silenciosamente. Eles são movidos para a seção **"Resolvidos na origem"** com uma sugestão de arquivamento.

### Como funciona:
1. Ao clicar em **"Atualizar avisos"**, o sistema recalcula todas as pendências.
2. Se um aviso antigo não for mais gerado pelo motor, ele é marcado como `auto_resolution_suggested = true`.
3. O usuário vê o motivo da sugestão (ex: "O relatório foi enviado").
4. O usuário pode **Arquivar todos os resolvidos** ou manter o aviso no histórico se desejar.

---

## 2. Onboarding Operacional

Para novos membros da equipe, o sistema oferece um fluxo de orientação para garantir que a cultura de privacidade e a rotina operacional sejam compreendidas rapidamente.

### Checklist de Primeiro Acesso
Exibido no Dashboard e na Central de Avisos para usuários novos:
1. **Completar perfil operacional**: Orientação sobre papéis no sistema.
2. **Conhecer a Agenda**: Verificação das ações de campo.
3. **Entender Escutas**: Como digitar fichas corretamente.
4. **Verificar Avisos**: Entender a rotina de pendências.
5. **Privacidade (Obrigatório)**: Confirmação de leitura das orientações básicas (não coletar CPF, telefone, etc.).

### Estado de Onboarding
O progresso é salvo na tabela `public.user_onboarding_state`. Uma vez concluído ou dispensado, o checklist desaparece do Dashboard para reduzir ruído, mas pode ser reativado via `/avisos?onboarding=true`.

---

## 3. Segurança e Privacidade

- **Sem Push/E-mail**: O onboarding e a limpeza são estritamente internos ao aplicativo.
- **Sem Dados Sensíveis**: Os avisos de onboarding focam em orientação de fluxo, nunca expondo dados de escutas ou identificadores pessoais.
- **RLS**: O estado de onboarding é protegido por Row Level Security; apenas o próprio usuário pode editar seu progresso, e a coordenação pode consultar o estado geral para suporte.

---

## 4. Como Revisar a Limpeza
Na Central de Avisos (`/avisos`), procure pela seção azul **"Resolvidos na origem"**. Ela agrupa todos os itens que o sistema identificou como concluídos. O botão **"Arquivar todos os resolvidos"** limpa a interface mantendo o histórico no banco de dados.
