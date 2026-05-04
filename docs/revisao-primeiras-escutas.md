# Revisão das Primeiras Escutas — Guia Operacional

**Referência:** Tijolo 035
**Tela principal:** `/escutas/revisao-territorial` e `/escutas/[id]`

---

## Princípios da revisão

1. **Preservar a fala original.** O campo "Fala original / síntese livre" registra o que a pessoa disse. Não editar, corrigir gramática nem resumir nesse campo.
2. **Separar fala de interpretação.** A equipe interpreta no "Resumo da equipe" e nos "Temas". A fala original fica intacta.
3. **Revisão humana obrigatória.** Nenhuma escuta deve sair do status `rascunho` sem revisão da equipe.

---

## Filtros disponíveis em /escutas

| Filtro | Uso |
|---|---|
| Ação | Filtrar escutas de uma banca específica |
| Status: rascunho | Ver fichas ainda não revisadas |
| Status: revisada | Confirmar quais já foram aprovadas |
| Sem tema | Identificar fichas sem codificação temática |
| Possível dado sensível | Priorizar fichas com alerta de privacidade |
| Revisão territorial pendente | Identificar lugares citados ainda não estruturados |

---

## Passo a passo de revisão por escuta

1. Abrir a escuta em `/escutas/[id]` ou pela fila em `/escutas/revisao-territorial`.
2. Ler a fala original com atenção.
3. Verificar se há dado sensível (nome, telefone, CPF, endereço). Se houver, corrigir antes de prosseguir.
4. Preencher **Resumo da equipe**: síntese interpretativa da fala, sem dado pessoal.
5. Marcar **Temas**: codificação da equipe (ex.: saúde, trabalho, moradia, transporte).
6. Preencher **Palavras usadas pela pessoa**: literalmente, as palavras que a pessoa usou.
7. Conferir **Lugares citados**: remover qualquer endereço pessoal; manter referências coletivas.
8. Preencher **Prioridade apontada** — ou registrar explicitamente "não apareceu prioridade".
9. Registrar **Observações inesperadas**, se houver.
10. Alterar status para `revisada`.
11. Salvar.

---

## Revisão territorial

Em `/escutas/revisao-territorial`:

- Conferir o bairro/território herdado da ação.
- Verificar se os lugares citados na fala precisam ser estruturados como `places_mentioned`.
- Para cada lugar: criar ou vincular a um `normalized_place` com visibilidade adequada.
- Não criar lugar sensível sem marcar como `sensivel_nao_publicar` ou `sensitive`.

---

## Critérios para aprovar uma escuta como "revisada"

- [ ] Fala original preservada.
- [ ] Resumo da equipe preenchido.
- [ ] Pelo menos um tema marcado, ou campo "observações inesperadas" preenchido.
- [ ] Prioridade preenchida (ou registrado que não apareceu).
- [ ] Nenhum dado sensível identificável na ficha.
- [ ] Status territorial verificado.

---

## O que nunca fazer na revisão

- Não apagar a fala original.
- Não substituir a fala por uma paráfrase sem manter o original.
- Não aprovar fichas com CPF, telefone ou endereço pessoal sem tratar.
- Não alterar a data de registro.
- Não vincular escuta a território provisório sem aprovação da coordenação.
