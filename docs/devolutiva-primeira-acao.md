# Devolutiva da Primeira Ação — Guia Operacional

**Referência:** Tijolo 035
**Tela:** `/acoes/[id]/devolutiva`

---

## O que é a devolutiva?

A devolutiva é o documento de retorno que a equipe leva para o território após a banca de escuta.
Ela sintetiza os temas, prioridades e observações coletadas, sem expor dados individuais.

**Não é um relatório de IA.** É um texto determinístico gerado a partir das escutas revisadas e aprovado pela coordenação ou admin.

---

## Passo a passo

1. **Revisar todas as escutas da ação.** A devolutiva só deve ser gerada quando todas as fichas relevantes estiverem com status `revisada`.
2. **Abrir a ação** em `/acoes/[id]`.
3. **Abrir a devolutiva** em `/acoes/[id]/devolutiva`.
4. **Gerar rascunho determinístico.** O sistema compila temas, palavras recorrentes, prioridades e observações das escutas revisadas.
5. **Revisar o texto.** A equipe lê o rascunho, verifica coerência e remove qualquer trecho com dado sensível.
6. **Remover qualquer dado sensível** que tenha escapado da revisão das escutas.
7. **Marcar como revisada.** Apenas após revisão humana completa.
8. **Aprovar.** Somente coordenação ou admin pode aprovar a devolutiva.
9. **Imprimir ou copiar** para uso no território.

---

## O que a devolutiva deve conter

- Síntese dos temas mais citados.
- Palavras recorrentes usadas pela comunidade.
- Prioridades apontadas.
- Observações inesperadas relevantes.
- Data e território da banca.

## O que a devolutiva **não deve** conter

- Nome de pessoa entrevistada.
- Fala original completa sem edição.
- Telefone, CPF, endereço pessoal.
- Lugar com visibilidade `sensitive` ou `sensivel_nao_publicar`.
- Interpretação da IA como texto oficial (IA pode auxiliar rascunho, mas revisão humana é obrigatória).

---

## Aprovação

| Papel | Permissão |
|---|---|
| Equipe | Gerar rascunho, revisar, sinalizar problemas |
| Coordenação | Aprovar ou rejeitar |
| Admin | Aprovar ou rejeitar |

Sem aprovação de coordenação ou admin, a devolutiva não pode ser usada no território.

---

## Documentos relacionados

- `docs/revisao-primeiras-escutas.md`
- `docs/dossie-primeira-acao.md`
- `/acoes/[id]/dossie`
