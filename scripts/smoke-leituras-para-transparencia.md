# Smoke test: Leituras -> Transparência Viva

## Pré-condições

- usuário autenticado com papel `equipe`, `coordenacao` ou `admin`;
- existem escutas com `review_status = reviewed`;
- existem temas agregados e palavras recorrentes no painel de leituras.

## Cenário 1: abrir modal de prévia

1. Acessar `/leituras`.
2. Clicar em `Preparar snapshot da Transparência Viva`.
3. Esperado:
   - modal abre;
   - prévia mostra período, escutas revisadas, territórios e silêncios;
   - seção `Será incluído` e `Nunca será incluído` aparece;
   - aviso metodológico aparece;
   - botão `Criar snapshot draft` inicia desabilitado.

## Cenário 2: confirmação obrigatória

1. No modal, tentar criar sem marcar confirmação.
2. Esperado:
   - botão permanece desabilitado;
   - nenhuma criação ocorre.

3. Marcar confirmação.
4. Clicar em `Criar snapshot draft`.
5. Esperado:
   - API retorna `id` e `redirect_to`;
   - navegador redireciona para `/transparencia/snapshots/[id]?source=collective_reading`.

## Cenário 3: validação no editor

1. No editor do snapshot criado:
2. Esperado:
   - banner de aviso de origem coletiva;
   - bloco de origem com `source_type = collective_reading`;
   - timestamp de geração presente quando disponível;
   - status inicial do snapshot = `draft`.

## Cenário 4: segurança de conteúdo

1. Revisar `word_summary` e `privacy_notes`.
2. Esperado:
   - sem CPF, telefone, e-mail, endereço completo;
   - sem fala individual;
   - nota de sanitização presente.

3. Revisar `territory_summary`.
4. Esperado:
   - territórios abaixo do mínimo aparecem como dados insuficientes.

## Cenário 5: permissões

1. Usuário sem autenticação chama `POST /api/transparencia/snapshots/from-leituras`.
2. Esperado: `401`.

3. Usuário com papel fora de `equipe|coordenacao|admin` chama a mesma rota.
4. Esperado: `403`.

## Cenário 6: draft-only

1. Após criar snapshot por leituras, consultar status do registro.
2. Esperado:
   - `status = draft`;
   - sem publicação automática.

## Cenário 7: notificações internas

1. Criar snapshot com sucesso.
2. Esperado:
   - tentativa de registrar aviso para `coordenacao` e `admin` em `in_app_notifications`.

## Evidências recomendadas

- screenshot do modal de prévia;
- screenshot do editor com aviso de origem;
- trecho do payload sanitizado;
- status `draft` no banco;
- log de retorno da API (`mode: preview` e `mode: create`).
