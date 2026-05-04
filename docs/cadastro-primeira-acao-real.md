# Cadastro da Primeira Ação Real

Use este roteiro para cadastrar a primeira Banca de Escuta real no SEMEAR Territórios. Não crie seed real sem dados definidos pela coordenação.

1. Abrir `/acoes/nova`.
2. Usar título no padrão: `Banca de Escuta — Feira Livre — [território]`.
3. Selecionar tipo: `banca_escuta`.
4. Informar a data da ação.
5. Selecionar apenas um território com status `oficial` no campo Bairro/Território.
   — O select exibe apenas bairros oficiais validados (52 bairros de Volta Redonda).
   — Se o território desejado não aparecer no select, acessar `/territorios` e verificar
     se o registro existe e está marcado como `status = oficial`.
   — Não usar território provisório sem aprovação explícita da coordenação registrada em
     decisão escrita.
6. Confirmar que o território escolhido aparece como `status = oficial` em `/territorios`.
7. Informar local coletivo, como feira, praça, escola, CRAS ou associação de moradores.
   Nunca registrar endereço pessoal, residência, nome completo ou dado identificável de participante.
8. Descrever objetivo da ação.
9. Registrar equipe responsável.
10. Informar público estimado, se houver.
11. Usar status `planejada` antes da atividade ou `realizada` se a banca já aconteceu.
12. Salvar.
13. Após a feira, usar `/escutas/lote`.

## Privacidade

- Não coletar CPF.
- Não coletar telefone.
- Não registrar endereço pessoal.
- Não registrar dado de saúde individual identificável.
- Território/bairro é agregação, não localização de pessoa.
- Local da ação deve ser equipamento coletivo: feira, praça, escola, CRAS ou associação. Nunca residência.

## Sobre seleção de território

- Os selects de ações e escutas exibem apenas os 52 bairros oficiais de Volta Redonda.
- Os 21 territórios provisórios restantes estão ocultos dos formulários operacionais.
- Se o território desejado não aparecer, verificar em `/territorios` antes de solicitar cadastro.
- Não usar provisório sem aprovação da coordenação.
- Decisão de referência: `docs/decisao-territorios-provisorios.md`.
