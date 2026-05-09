# Roteiro de Homologação: Importação de Relatórios Reais

Este documento orienta a equipe na fase de homologação (Tijolo 055) do sistema de importação de documentos Word e PDF.

## 1. Preparação de Amostras
Para testar a robustez do sistema, prepare os seguintes arquivos:
1. **Relatório Padrão (Alta Qualidade):** Use o [modelo oficial](/docs/modelo-relatorio-semanal-equipe.md) com os cabeçalhos numerados (1. Atividades, 2. Ações...).
2. **Relatório Livre (Média Qualidade):** Um documento Word sem numeração, mas com palavras-chave como "Atividades", "Dificuldades" e "Aprendizados".
3. **PDF de Texto:** Um arquivo exportado do Word/Google Docs como PDF.
4. **PDF Escaneado (Baixa Qualidade):** Uma foto de um relatório impresso salva como PDF.
5. **Relatório com "Armadilhas" de Privacidade:** Inclua um CPF fictício (000.000.000-00) ou um telefone para testar o detector de riscos.

## 2. Roteiro de Teste
Para cada arquivo:
1. Vá em `/memoria/novo`.
2. Ative o modo **"Importar Word/PDF"**.
3. Selecione o arquivo e clique em **"Importar e criar rascunho"**.
4. Verifique:
   - [ ] O sistema criou o relatório com status "Rascunho".
   - [ ] O texto foi extraído e os campos sugeridos foram preenchidos.
   - [ ] A **Qualidade da Extração** (Alta/Média/Baixa) condiz com o arquivo.
   - [ ] Alertas de privacidade apareceram se houver dados sensíveis.

## 3. Painel de Qualidade
Acesse `/memoria/importacoes` e valide:
- [ ] O relatório importado aparece na **Fila de Revisão Prioritária**.
- [ ] As estatísticas de sucesso/falha foram atualizadas.
- [ ] Os gráficos de distribuição por tipo de arquivo estão corretos.

## 4. Revisão e Aprovação
Como coordenador:
1. Abra o relatório na fila.
2. Compare o **Conteúdo Extraído** com o **Texto Bruto**.
3. Faça os ajustes necessários.
4. Se houver alertas de privacidade, remova os dados sensíveis do texto.
5. Marque como **"Aprovado"**.
6. Verifique se o relatório agora aparece na linha do tempo principal de `/memoria`.

## 5. Critérios de Aceite para Produção
- [X] Taxa de sucesso de extração > 80% para documentos com texto selecionável.
- [X] Bloqueio efetivo de aprovação se houver riscos de privacidade não resolvidos.
- [X] Disponibilidade do modelo padrão para a equipe copiar e usar.
