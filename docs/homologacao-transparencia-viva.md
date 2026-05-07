# Homologação da Transparência Viva

## Escopo

Validar fluxo editorial, RLS, API pública e trilha de auditoria do módulo de snapshots públicos.

## Pré-condições

- migrations aplicadas até `20260506223000_add_transparency_homologation_packages.sql`;
- usuário `equipe` autenticado;
- usuário `coordenacao` ou `admin` autenticado;
- pelo menos um snapshot de teste em `draft`.

## Testes manuais

1. Usuário anônimo chama `/api/public/transparencia-viva` sem snapshot `published`.
   Resultado esperado: payload vazio controlado (`snapshot: null`) ou resposta segura equivalente.

2. Usuário anônimo tenta consultar `public_transparency_snapshots`.
   Resultado esperado: nunca recebe `draft`, `reviewed` ou `approved`; somente `published`.

3. Usuário autenticado com papel `equipe` cria rascunho em `/transparencia/snapshots`.
   Resultado esperado: insert permitido com `status = draft`.

4. Usuário `equipe` tenta editar snapshot fora de `draft`.
   Resultado esperado: bloqueio por RLS.

5. Usuário `coordenacao` ou `admin` edita, marca `reviewed`, aprova e publica.
   Resultado esperado: transições permitidas.

6. Publicação com checklist incompleto.
   Resultado esperado: bloqueio.

7. Publicação com CPF, telefone ou e-mail no texto.
   Resultado esperado: bloqueio.

8. Publicação com comentário crítico pendente (`privacidade`, `dados`, `metodologia`).
   Resultado esperado: bloqueio.

9. Edição de snapshot já publicado.
   Resultado esperado: status volta para `reviewed`, `published_at` deixa de valer e nova versão é criada.

10. API pública com snapshot publicado.
    Resultado esperado: retorna apenas o último `published`.

11. Conferir payload público.
    Resultado esperado: não contém fala original, entrevistador, e-mail, CPF, telefone, endereço, dado de saúde individual, ocupação rara individualizada ou lugares sensíveis.

12. Gerar pacote institucional em `/transparencia/homologacao`.
    Resultado esperado: pacote criado com `frozen_payload`, checklist, risco e trilha editorial, sem dado bruto.

## Evidências sugeridas

- captura da lista de snapshots;
- captura da aba de auditoria;
- captura de comentário pendente e resolvido;
- captura do checklist completo;
- captura do preview interno;
- resposta JSON da API pública;
- registro de erro ao tentar publicar com risco bloqueante;
- registro de erro ao tentar publicar com comentário crítico pendente.
