# Homologação do Módulo: Memória do Projeto

Este documento descreve o fluxo de homologação operacional do módulo "Memória do Projeto" para garantir que os requisitos de segurança, RLS e privacidade sejam atendidos no ambiente remoto.

## 1. Perfis de Teste
Para validar as políticas de RLS, os seguintes perfis devem ser utilizados:
- **Equipe**: Pode criar, editar seus próprios rascunhos e enviar para revisão. Não pode aprovar.
- **Coordenação**: Pode ler todos os relatórios, revisar, pedir ajustes e aprovar.
- **Admin**: Acesso total, incluindo arquivamento e curadoria da memória.

## 2. Roteiro de Homologação

### 2.1 Fluxo da Equipe
1. Acesse `/memoria/novo`.
2. Preencha os dados básicos da semana.
3. Salve como rascunho (**Draft**).
4. Anexe um arquivo (PDF ou Imagem).
5. Tente acessar a URL de outro relatório (deve ser bloqueado por RLS).
6. Envie para revisão (**Submit**).
7. Tente alterar o status para "Aprovado" (deve ser bloqueado).

### 2.2 Fluxo da Coordenação
1. Acesse `/memoria`.
2. Visualize o relatório enviado pela equipe.
3. Baixe o anexo (o link deve ser assinado e temporário).
4. Insira notas de revisão.
5. Aprove o relatório ou solicite ajustes.

### 2.3 Curadoria da Memória
1. Após a aprovação do relatório, um Admin/Coord pode transformá-lo em uma **Entrada de Memória**.
2. Defina a visibilidade como `internal` por padrão.
3. Candidatos a `public_approved` exigem revisão editorial adicional (não automatizada).

## 3. Segurança e Privacidade
- **Anexos**: Nunca compartilhe links permanentes. Use sempre a funcionalidade de link assinado do sistema.
- **Dados Sensíveis**: Não registre CPF, telefones pessoais ou endereços nos campos de texto. O sistema exibirá alertas visuais caso detecte padrões suspeitos.
- **Acesso Anônimo**: A rota `/memoria` e o bucket de storage são protegidos. Usuários sem login serão redirecionados.

## 4. Troubleshooting
- Se o upload falhar, verifique se a extensão do arquivo é permitida (PDF, DOCX, PNG, JPG, XLS, TXT, MD).
- Limite de tamanho por arquivo: 10MB.
- Caso não consiga ver seus próprios relatórios, confirme se seu perfil está vinculado a um `team_member` ativo.

---
*Atualizado em: 08/05/2026*
