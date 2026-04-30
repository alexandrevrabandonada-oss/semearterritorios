# Teste Manual de RLS — Mapa Interno

Este roteiro orienta a validação manual de RLS antes de aprovar `internal_map_homologations` com decisão `go_prototipo_interno`.

## 1. Usuário admin

Passos:

- [ ] Entrar como admin.
- [ ] Acessar `/territorios/mapa/homologacao`.
- [ ] Criar rascunho.
- [ ] Marcar checklist apenas com evidências reais.
- [ ] Aprovar quando todos os critérios estiverem atendidos.

Resultado esperado:

- Admin consegue ler, criar, editar e aprovar homologação.

Resultado obtido:

Evidência/anotação:

## 2. Usuário coordenação

Passos:

- [ ] Entrar como coordenação.
- [ ] Acessar `/territorios/mapa/homologacao`.
- [ ] Editar homologação.
- [ ] Aprovar ou rejeitar quando aplicável.

Resultado esperado:

- Coordenação consegue ler, editar, aprovar e rejeitar homologação.

Resultado obtido:

Evidência/anotação:

## 3. Usuário equipe

Passos:

- [ ] Entrar como equipe.
- [ ] Acessar leitura da homologação.
- [ ] Tentar aprovar homologação.
- [ ] Tentar rejeitar homologação.

Resultado esperado:

- Equipe consegue acompanhar, mas não consegue aprovar nem rejeitar.

Resultado obtido:

Evidência/anotação:

## 4. Usuário anônimo

Passos:

- [ ] Sair do sistema.
- [ ] Tentar acessar `/mapa`.
- [ ] Tentar acessar `/mapa/interno`.
- [ ] Tentar acessar `/territorios/mapa/homologacao`.

Resultado esperado:

- Usuário anônimo é redirecionado para login ou bloqueado pelas regras de autenticação/RLS.

Resultado obtido:

Evidência/anotação:

## Fechamento

- Data do teste:
- Ambiente testado:
- Responsável técnico:
- Responsável de coordenação:
- Decisão: [ ] aprovado [ ] bloqueado [ ] repetir teste
