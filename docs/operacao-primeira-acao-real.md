# Operação: Primeira Ação Real — SEMEAR Territórios

**Referência:** Tijolo 035
**Status:** Documento operacional para a equipe

---

## 1. Dados da ação

Preencher antes de cadastrar no sistema.

| Campo | Instrução |
|---|---|
| **Título** | Padrão: `Banca de Escuta — Feira Livre — [bairro]` |
| **Tipo** | `banca_escuta` |
| **Data** | Data real da banca |
| **Bairro/Território** | Selecionar bairro **oficial** em `/acoes/nova`. Não usar provisório sem aprovação da coordenação. |
| **Local** | Referência coletiva: feira, praça, escola, CRAS, associação. **Nunca residência, número de porta ou endereço pessoal.** |
| **Equipe** | Nomes das pessoas da equipe de escuta (não do público). |
| **Objetivo** | Descrição da intenção da banca (escuta territorial, sondagem de prioridades, etc.). |
| **Público estimado** | Número aproximado de pessoas abordadas na ação (não identificadas). |
| **Status** | `planejada` antes da banca; `realizada` após a banca. |

---

## 2. Antes da ação

- [ ] Ação cadastrada no sistema em `/acoes/nova`.
- [ ] Fichas de papel impressas e numeradas (FEIRA-001, FEIRA-002, ...).
- [ ] Equipe orientada sobre privacidade (não coletar nome, telefone, CPF, endereço).
- [ ] Responsável pela digitação definido.
- [ ] Responsável pela revisão definido.
- [ ] Definida a data-limite para digitação das fichas.
- [ ] Definida a data-limite para revisão das fichas.
- [ ] Local coletivo confirmado (não residência).

---

## 3. Durante a ação

### O que registrar na ficha de papel:

- Código da ficha (ex.: FEIRA-001).
- Faixa etária aproximada (opcional): jovem, adulto, pessoa idosa.
- Fala original ou síntese livre: o que a pessoa disse, com as próprias palavras.
- Palavras usadas pela pessoa.
- Lugares citados pela pessoa — sem endereço pessoal; usar referência coletiva ou de bairro.
- Prioridade apontada, se aparecer.
- Observações inesperadas.

### O que **não** registrar:

- Nome completo do entrevistado.
- Telefone.
- CPF ou outro documento.
- Endereço residencial ou número de porta.
- Dado de saúde individual identificável.

---

## 4. Depois da ação

1. Abrir `/escutas/lote`.
2. Selecionar e travar a ação criada.
3. Confirmar que o bairro e a data foram herdados da ação.
4. Digitar cada ficha como rascunho — a revisão será feita depois, com calma.
5. Clicar em "Salvar e digitar próxima" para cada ficha.
6. Ao terminar, verificar o contador de fichas da sessão.
7. Acessar `/escutas` e filtrar pela ação para confirmar que todas as fichas aparecem.
8. Usar `/escutas/revisao-territorial` para revisar, marcar temas e confirmar lugares.
9. Em cada escuta: preencher resumo da equipe, marcar temas, registrar prioridade.
10. Gerar devolutiva em `/acoes/[id]/devolutiva`.
11. Fechar dossiê em `/acoes/[id]/dossie`.
12. Conferir relatório mensal em `/relatorios`.
13. Preencher `docs/relatorio-pos-banca-primeira-acao.md`.

---

## 5. Privacidade — reforço

- Bairro é **agregação territorial**, não localização de pessoa.
- Fala original é material interno de revisão — não entra em relatório ou devolutiva sem revisão da equipe.
- Devolutiva e dossiê usam sínteses, não falas completas.
- Se aparecer alerta de possível dado sensível na digitação, revisar antes de salvar.
- Não publicar lugar com visibilidade `sensivel_nao_publicar` ou `sensitive`.

---

## Arquivos relacionados

- `docs/controle-fichas-papel-primeira-acao.md`
- `docs/revisao-primeiras-escutas.md`
- `docs/devolutiva-primeira-acao.md`
- `docs/dossie-primeira-acao.md`
- `docs/relatorio-pos-banca-primeira-acao.md`
- `docs/cadastro-primeira-acao-real.md`
