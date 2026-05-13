# Testes - Falas Representativas Sanitizadas (Tijolo 065)

## Objetivo
Validar o fluxo de selecao, revisao, sanitizacao e aprovacao de falas para dossie e devolutiva, sem exposicao de dado pessoal.

## Cenario 1 - Fala sem dado sensivel
- Entrada: "A principal demanda e melhorar a limpeza no bairro."
- Acao: preencher sanitized_text, enviar revisao e aprovar como approved_public.
- Resultado esperado: aprovado_public permitido.

## Cenario 2 - Fala com CPF fake
- Entrada: "Meu CPF e 123.456.789-00 e nao consigo atendimento."
- Acao: tentar approved_public.
- Resultado esperado: bloqueio de approved_public por risco critico (CPF).

## Cenario 3 - Fala com telefone fake
- Entrada: "Meu telefone e (24) 99999-1234 para contato."
- Acao: tentar approved_public.
- Resultado esperado: bloqueio de approved_public por risco critico (telefone).

## Cenario 4 - Fala com endereco
- Entrada: "Moro na Rua das Flores, 120."
- Acao: tentar approved_public.
- Resultado esperado: bloqueio de approved_public por risco critico (endereco especifico).

## Cenario 5 - Fala editada apos aprovacao
- Pre-condicao: fala em approved_public.
- Acao: editar sanitized_text.
- Resultado esperado: status volta automaticamente para needs_review.

## Cenario 6 - Dossie
- Pre-condicao: existem falas approved_internal e approved_public na acao.
- Acao: abrir /acoes/[id]/dossie.
- Resultado esperado: secao mostra internas e publicas em blocos separados, com tema/contexto/status e alertas de risco quando houver.

## Cenario 7 - Devolutiva publica
- Pre-condicao: existem falas em multiplos status.
- Acao: abrir /acoes/[id]/devolutiva no modo publico.
- Resultado esperado: bloco "Vozes do territorio" mostra apenas approved_public; sem falas aprovadas exibe mensagem de ausencia.

## Validacao tecnica executada
- npm run lint: OK
- npm run build: OK
- npm run verify: OK

## Observacao
A validacao funcional depende de dados reais de homologacao para confirmar os cenarios com transicoes de estado ponta a ponta no banco.
