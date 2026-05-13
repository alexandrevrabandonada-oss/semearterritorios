# Aceite Presencial Assistido — Papéis Reais (Tijolo 070)

## Instruções de uso

- Executar presencialmente com usuário real em sessão separada por papel.
- Preencher evidência com print ou referência objetiva.
- Mascarar e-mail no formato `ab***@do***.com`.
- Não registrar dados sensíveis de fala bruta.

## Tabela padrão de evidência

| Papel | Usuário (mascarado) | Rota | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|

## Cenários — sem role

| Papel | Usuário (mascarado) | Rota | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| sem role | n/a | /login | Login Google | Login autentica sem erro | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |
| sem role | n/a | /aguardando-liberacao | Acesso após login | Redireciona para aguardando liberação | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |
| sem role | n/a | /acoes | Tentar abrir | Bloqueado/redirecionado | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |
| sem role | n/a | /escutas | Tentar abrir | Bloqueado/redirecionado | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |
| sem role | n/a | /memoria | Tentar abrir | Bloqueado/redirecionado | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |
| sem role | n/a | /escutas/falas | Tentar abrir | Bloqueado/redirecionado | Não há perfil sem role após regularização | Diagnóstico 070 | Não aplicável |

## Cenários — equipe

| Papel | Usuário (mascarado) | Rota | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| equipe | (já regularizado) | / | Abrir dashboard | Dashboard operacional disponível | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/nova | Criar escuta | Salva conforme regra | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/lote | Usar fluxo em lote | Fluxo funcional | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/[id] | Sugerir fala candidata | Consegue criar/salvar | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/falas | Enviar para revisão | Transição para needs_review | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/falas | Tentar approved_public | Bloqueado (sem botão ou sem permissão) | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /escutas/falas | Tentar rejeitar/arquivar | Bloqueado se restrito à coord/admin | Pendente presencial | Pendente | Pendente |
| equipe | (já regularizado) | /memoria | Enviar relatório semanal | Submissão funcional | Pendente presencial | Pendente | Pendente |

## Cenários — coordenação

| Papel | Usuário (mascarado) | Rota | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| coordenacao | (já regularizado) | /escutas/revisao-territorial | Revisar escutas | Fluxo de revisão disponível | Pendente presencial | Pendente | Pendente |
| coordenacao | (já regularizado) | /escutas/falas | Aprovar/rejeitar/arquivar com justificativa | Regras e bloqueios aplicados | Pendente presencial | Pendente | Pendente |
| coordenacao | (já regularizado) | /escutas/falas/[id] | Abrir histórico editorial | Histórico visível | Pendente presencial | Pendente | Pendente |
| coordenacao | (já regularizado) | /acoes/[id]/dossie | Ver governança editorial | Painel completo visível | Pendente presencial | Pendente | Pendente |
| coordenacao | (já regularizado) | /acoes/[id]/devolutiva | Revisar/aprovar devolutiva | Ação permitida conforme regra | Pendente presencial | Pendente | Pendente |
| coordenacao | (já regularizado) | /memoria | Revisar memória/relatórios | Revisão e aprovação permitidas | Pendente presencial | Pendente | Pendente |

## Cenários — admin

| Papel | Usuário (mascarado) | Rota | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| admin | al***@i*.uff.br | /escutas/falas | Executar ações de coordenação | Permitido | Pendente presencial | Pendente | Pendente |
| admin | al***@i*.uff.br | /acoes/[id]/dossie | Conferir governança | Permitido | Pendente presencial | Pendente | Pendente |
| admin | al***@i*.uff.br | /memoria | Revisar/aprovar fluxos | Permitido | Pendente presencial | Pendente | Pendente |
| admin | al***@i*.uff.br | (gestão) | Regularizar usuários | Permitido via rotina administrativa | Pendente presencial | Pendente | Pendente |

## Cenários — anon

| Papel | Usuário (mascarado) | Rota/API | Ação | Resultado esperado | Resultado obtido | Evidência | Status |
|---|---|---|---|---|---|---|---|
| anon | n/a | /acoes | Acesso sem login | Bloqueado/redirecionado para /login | Confirmado por regra de middleware | Revisão de código | Concluído técnico |
| anon | n/a | /escutas | Acesso sem login | Bloqueado/redirecionado para /login | Confirmado por regra de middleware | Revisão de código | Concluído técnico |
| anon | n/a | /memoria | Acesso sem login | Bloqueado/redirecionado para /login | Confirmado por regra de middleware | Revisão de código | Concluído técnico |
| anon | n/a | tabela de falas/auditoria | Leitura direta | Sem acesso (0 linhas/erro RLS) | Confirmado em script técnico | Teste remoto | Concluído técnico |

## Aceite integrado — fluxo de falas

1. `equipe` sugere fala.
2. `coordenacao` revisa.
3. `coordenacao` aprova pública com justificativa.
4. `admin` confere dossiê.
5. Devolutiva pública exibe apenas `sanitized_text`.
6. `anon` não acessa conteúdo interno.

**Status atual:** Pendente presencial (papéis já regularizados; falta evidência em sessão real).

## Aceite integrado — fluxo de memória

1. `equipe` envia relatório semanal.
2. `coordenacao` revisa.
3. `coordenacao` aprova.
4. `coordenacao` cria entrada de memória interna.
5. Anexo permanece privado.
6. `anon` não acessa.

**Status atual:** Pendente presencial (papéis já regularizados; falta evidência em sessão real).
