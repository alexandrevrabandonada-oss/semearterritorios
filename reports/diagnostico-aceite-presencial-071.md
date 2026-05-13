# Diagnóstico Inicial do Aceite Presencial 071

Data: 2026-05-12
Ambiente: Produção (Supabase remoto)
Escopo: perfis, papéis, vínculos operacionais em team_members e checagens técnicas de acesso

## 1. Estado inicial confirmado

Levantamento remoto executado com script técnico e consulta direta:

- profiles_total: 7
- team_members_total (antes da regularização): 6
- roles:
  - admin: 2
  - coordenacao: 2
  - equipe: 3
  - role null: 0

Confirmação solicitada pelo tijolo:

- admin = 2: confirmado
- coordenacao = 2: confirmado
- equipe = 3: confirmado
- role null = 0: confirmado

## 2. Perfis sem vínculo em team_members (antes)

Resultado do mapeamento profile_id -> team_members:

- perfis sem vínculo operacional: 1
- perfil identificado:
  - nome: Penha souza S Oliveira
  - role: equipe
  - profile_id: 7d6b9083-7f8a-4c00-ab14-b59221ade404

## 3. Regularização aplicada (Tarefa 2)

Ação executada:

- criação de team_member ativo para o perfil pendente.
- team_member criado:
  - id: 1d3d607a-6a1f-47d0-a5ed-d6a8b2b297a8
  - profile_id: 7d6b9083-7f8a-4c00-ab14-b59221ade404
  - display_name: Penha souza S Oliveira
  - role_label: Equipe
  - active: true

## 4. Estado após regularização

Nova verificação remota:

- profiles_total: 7
- team_members_total: 7
- perfis sem vínculo operacional: 0
- roles:
  - admin: 2
  - coordenacao: 2
  - equipe: 3
  - role null: 0

Conclusão da regularização:

- não há usuário operacional sem vínculo em team_members.

## 5. Rotas principais protegidas

Arquivo revisado: middleware.ts

- matcher cobre todas as rotas de aplicação, exceto assets estáticos e imagens.
- a proteção de sessão é centralizada em updateSession.
- evidências de bloqueio anon para dados internos foram validadas tecnicamente para tabelas críticas (falas/auditoria).

Observação:

- o aceite presencial em navegador com usuários reais permanece necessário para validar UX de redirecionamento por papel.

## 6. Evidências técnicas anexas na execução 071

- diagnóstico de papéis: node scripts/diagnose_069_roles.mjs
- bateria de bloqueios de falas: node scripts/test_069_bloqueios.mjs
- checagem anon para tabelas internas críticas via cliente anon

## 7. Situação de pendências após diagnóstico

- vínculo operacional pendente em team_members: resolvido
- execução presencial por papel real (admin, coordenacao, equipe): pendente de sessão humana guiada
