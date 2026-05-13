# Testes - Tijolo 066 (Auditoria editorial)

## 1. Aprovacao publica sem justificativa

1. Abrir `/escutas/falas`.
2. Selecionar fala com texto sanitizado valido.
3. Clicar em "Aprovar publica" sem preencher justificativa.
4. Esperado: operacao bloqueada com mensagem de justificativa obrigatoria.

## 2. Rejeicao sem motivo

1. Abrir `/escutas/falas`.
2. Clicar em "Rejeitar" sem preencher justificativa.
3. Esperado: bloqueio com mensagem de motivo obrigatorio.

## 3. Arquivamento sem motivo

1. Abrir `/escutas/falas`.
2. Clicar em "Arquivar" sem preencher justificativa.
3. Esperado: bloqueio com mensagem de motivo obrigatorio.

## 4. Edicao apos approved_public sem motivo

1. Na escuta individual, editar texto sanitizado de fala `approved_public`.
2. Nao preencher justificativa editorial.
3. Esperado: bloqueio por motivo obrigatorio de alteracao.

## 5. Historico por fala

1. Abrir `/escutas/falas`.
2. Clicar em "Ver historico".
3. Esperado:
   - lista de eventos em ordem decrescente
   - autor, data, status anterior/novo
   - justificativa quando aplicavel

## 6. Dossie com governanca

1. Abrir `/acoes/[id]/dossie`.
2. Verificar painel "Governanca editorial das falas".
3. Esperado: contadores por status, risco, cobertura de auditoria, edicao pos-aprovacao e pendencias de justificativa.

## 7. Devolutiva interna com conformidade

1. Abrir `/acoes/[id]/devolutiva`.
2. Trocar para "Modo tecnico interno".
3. Esperado: bloco com contagem de aprovadas publicas, com auditoria e com justificativa.
4. Modo publico deve manter apenas vozes aprovadas sem dados internos de auditoria.
