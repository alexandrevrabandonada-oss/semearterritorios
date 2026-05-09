# Guia de Importação de Relatórios Semanais (Word/PDF)

Este documento orienta a equipe operacional e a coordenação sobre como utilizar a funcionalidade de importação de relatórios no módulo **Memória do Projeto**.

## Objetivo
Automatizar a estruturação do relatório semanal a partir de arquivos produzidos fora do sistema, garantindo que as atividades, problemas e aprendizados sejam registrados de forma padronizada, mantendo o controle de privacidade e a revisão humana.

## Como Funciona

### 1. Preparação do Arquivo
- O sistema aceita arquivos nos formatos **.docx** (Word) e **.pdf**.
- **Importante:** PDFs resultantes de escaneamento de papel (imagens) não terão o texto extraído automaticamente. Utilize PDFs gerados diretamente do Word ou Google Docs.
- O arquivo deve conter cabeçalhos claros para facilitar a identificação das seções pelo sistema.

### 2. Processo de Upload
1. Acesse **Memória do Projeto** > **Novo Relatório**.
2. Selecione a aba **Importar Word/PDF**.
3. Selecione a **Semana de Referência** e o **Membro da Equipe**.
4. Faça o upload do arquivo.
5. Clique em **Importar e criar rascunho**.

### 3. Extração Automática
O sistema realizará a extração do texto no servidor e tentará preencher os seguintes campos:
- Resumo
- Atividades Realizadas
- Problemas Encontrados
- Aprendizados
- Pendências
- Próximos Passos

### 4. Revisão Obrigatória (Coordenação)
Todo relatório importado entra automaticamente no status **Rascunho** e exibe um alerta de revisão.
- **Privacidade:** O sistema verifica automaticamente a presença de CPFs, telefones e e-mails no texto extraído. Caso encontre, o status será marcado para atenção redobrada.
- **Correção:** A coordenação deve ler o texto extraído, ajustar a formatação se necessário e garantir que nenhum dado sensível de entrevistados seja mantido.
- **Aprovação:** Somente após a revisão manual o relatório deve ser aprovado para gerar as entradas de memória públicas/internas.

## Dicas para Melhor Extração
Para que o sistema identifique melhor as seções, utilize os seguintes termos como títulos no seu documento:
- `Atividades Realizadas`
- `Problemas Encontrados` ou `Desafios`
- `Aprendizados` ou `Observações`
- `Próximos Passos`

## Qualidade da Extração e Fila de Revisão
O sistema avalia automaticamente a qualidade da extração com base no volume de texto e no número de seções identificadas.

- **Alta (Verde):** Sucesso na extração de 4 ou mais seções.
- **Média (Amarela):** Algumas seções encontradas, mas requer atenção.
- **Baixa (Laranja):** Pouco texto ou poucas seções. Pode indicar um PDF escaneado.
- **Falhou (Vermelha):** Erro técnico no processamento.

A coordenação pode acompanhar todas as importações e gerenciar a fila de revisão em:
`/memoria/importacoes`

## O que fazer quando a extração for "Baixa" ou "Falhar"
1. **PDF Escaneado:** Se o arquivo for uma foto/scan de papel, o sistema não conseguirá ler o texto. Converta para DOCX ou transcreva manualmente.
2. **Formatação fora do padrão:** Se o documento não usar os cabeçalhos recomendados, o mapeamento falhará. Ajuste o documento e tente novamente ou preencha os campos manualmente a partir do "Texto Bruto".
3. **Dados Sensíveis:** Se o alerta de privacidade for disparado, revise o conteúdo e remova as informações identificáveis antes de aprovar o relatório.
