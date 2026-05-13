# Matriz de Papéis — SEMEAR Territórios

## Objetivo

Definir responsabilidades e limites de acesso por papel para operação segura, governança clara e princípio de menor privilégio.

## Papéis oficiais

## `admin`

- Configuração geral de ambiente e governança técnica.
- Gestão de papéis e regularização de acessos.
- Acesso amplo para diagnóstico e resolução de incidentes.
- Aprovação final em fluxos críticos quando necessário.
- Uso restrito: não deve ser o papel padrão de operação diária.

## `coordenacao`

- Revisar escutas e apoiar qualidade metodológica.
- Aprovar/rejeitar/arquivar falas públicas com justificativa.
- Aprovar devolutivas e fechar dossiê conforme regra operacional.
- Revisar memória e relatórios semanais.
- Publicar/homologar transparência quando houver autorização institucional.

## `equipe`

- Cadastrar escutas e atualizar dados de campo.
- Sugerir falas candidatas e enviar para revisão.
- Enviar relatórios semanais.
- Participar de ações e rotinas operacionais.
- Consultar o necessário para executar a operação sem privilégios de gestão.

## `sem role` (autenticado sem perfil liberado)

- Usuário autenticado via Google, porém sem autorização operacional.
- Deve permanecer em `/aguardando-liberacao` até regularização.
- Não deve acessar áreas internas de operação.

## `anon`

- Sem autenticação e sem acesso a rotas internas.
- Pode acessar somente conteúdos explicitamente públicos.

## Regras institucionais

1. Não transformar todos em `admin`.
2. Garantir separação entre operação (`equipe`) e governança (`coordenacao`).
3. Manter `admin` como exceção, não como padrão.
4. Nenhum perfil deve permanecer indefinidamente com `role = null`.
5. Revisar essa matriz sempre que houver mudança de fluxo sensível.
