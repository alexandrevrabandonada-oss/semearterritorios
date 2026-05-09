# Roteiro do Lote Piloto: Importação de Relatórios Semanais

Este documento orienta a coordenação na execução do lote piloto para validar o sistema de extração e mapeamento de relatórios.

## Objetivos
1. Validar a acurácia da extração em diferentes formatos.
2. Medir o impacto do uso do modelo padrão na qualidade da extração.
3. Identificar padrões de erro recorrentes.
4. Ajustar as orientações de escrita para a equipe.

## Amostragem Recomendada (8 documentos)
- **2x DOCX (Modelo Padrão):** Testar o "caminho feliz".
- **2x DOCX (Modelo Livre):** Testar a resiliência do mapeamento por palavras-chave.
- **2x PDF (Texto selecionável):** Validar a extração do `pdf-parse`.
- **1x PDF (Escaneado/Foto):** Validar o comportamento de falha e alerta de "transcrição manual".
- **1x Relatório com Risco:** Incluir propositalmente um CPF ou telefone fictício para testar o detector.

## Procedimento de Avaliação
Para cada arquivo importado, o revisor deve preencher os seguintes dados (diretamente no sistema ou neste log):

| Atributo | Descrição / Valor |
| :--- | :--- |
| **Membro da Equipe** | Nome do autor original |
| **Semana** | Período do relatório |
| **Formato** | DOCX ou PDF |
| **Modelo Padrão?** | Sim / Não |
| **Qualidade Extração** | Alta / Média / Baixa / Falha |
| **Seções Detectadas** | Quantidade de cabeçalhos identificados |
| **Alertas Privacidade** | Quantos e quais (CPF, Telefone, etc) |
| **Tempo de Revisão** | Minutos gastos para corrigir e aprovar |
| **Decisão Final** | Aprovado / Precisa Ajuste / Rejeitado |

## Registro de Problemas Comuns
*   [ ] Texto de rodapé sendo extraído no meio do corpo.
*   [ ] Tabelas quebrando a sequência lógica.
*   [ ] Cabeçalhos com nomes muito diferentes dos mapeados.
*   [ ] Dados sensíveis não detectados.
*   [ ] Falsos positivos no detector de privacidade.

## Próximos Passos
Após processar o lote, a coordenação deve revisar o **Painel do Piloto** em `/memoria/importacoes` para consolidar os aprendizados.
