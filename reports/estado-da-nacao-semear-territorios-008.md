# SEMEAR Territórios - Estado da Nação
**Sprint 008: IA Assistida para Síntese**

## Resumo Executivo
Nesta sprint focamos em trazer inteligência exploratória para o módulo de relatórios mensais, introduzindo o "Tijolo 8: IA Assistida para Síntese". O objetivo deste bloco não é substituir o papel analítico da equipe, mas atuar como um co-piloto na identificação de padrões em massa. 

Decidimos criar um sistema "opt-in" com controle total da equipe, adicionando uma camada de sanitização das escutas antes do envio à IA e exigindo revisão do texto retornado antes de qualquer consolidação.

## Entregas Principais

1. **Endpoint de IA (`/api/gerar-sintese`)**
   - Criada rota assíncrona dedicada a formatar uma sugestão textual (Markdown) via Vercel AI SDK e OpenAI.
   - Restrições rígidas impostas no System Prompt para focar exclusivamente em territorialidade e abstrações qualitativas, ignorando tentativas de personalização das falas.

2. **Sanitização de Payload e Privacidade**
   - Na camada de client-side (`monthly-report-detail.tsx`), antes de atingir o servidor, a matriz de inteligência remove proativamente a propriedade `interviewer_name` e outros marcadores explícitos que pudessem expor vulnerabilidades de LGPD. A IA recebe as falas acompanhadas do bairro e temas, garantindo anonimato forte.

3. **Painel "Assistente de Síntese (IA)"**
   - Inserido no menu de opções do relatório gerencial, ao clicar no botão "Gerar sugestão de síntese" o sistema realiza a inferência em tempo real.
   - O resultado preenche um texto-base formatado em `textarea` (campo editável) protegido pelo aviso permanente *"⚠️ Síntese gerada automaticamente, revisar antes de usar."*

## Próximos Passos
- Refinar os estilos e templates do `system prompt` se a equipe demandar mais criatividade.
- Aprofundar o cruzamento com dados demográficos indiretos na IA nas futuras expansões.
