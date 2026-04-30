# Estado da Nação — SEMEAR Territórios 025

## Diagnóstico inicial

O Tijolo 024 criou a homologação do mapa interno, mas o checklist era local e não auditável. Não havia tabela para registrar decisão persistente, responsável, justificativa, snapshot de métricas ou aprovação/rejeição com data.

Foram confirmados como dados salváveis em snapshot:

- escutas revisadas;
- territórios com dados;
- territórios prontos;
- territórios bloqueados;
- sensíveis pendentes;
- duplicidades;
- lugares normalizados seguros;
- critérios GO/NO-GO;
- checklist manual de RLS e privacidade.

## Migration criada

- `supabase/migrations/20260430000000_create_internal_map_homologations.sql`

## Tabela criada

- `internal_map_homologations`

Campos principais:

- `status`: `draft`, `reviewed`, `approved`, `rejected`;
- `decision`: decisões GO/NO-GO;
- `decision_reason`;
- checklist de RLS e privacidade;
- contadores de dados e qualidade;
- `snapshot`;
- `approved_by`, `approved_at`;
- `rejected_by`, `rejected_at`;
- `created_by`, `created_at`, `updated_at`.

## RLS criada

- `authenticated` pode ler homologações.
- `equipe`, `coordenacao` e `admin` podem criar rascunhos.
- `equipe` pode editar próprios rascunhos/revisões.
- `coordenacao` e `admin` podem revisar, aprovar e rejeitar.
- `anon` segue sem acesso.

## Biblioteca criada

- `lib/internal-map-homologation-records.ts`

Funções:

- `getLatestMapHomologation`
- `createDraftMapHomologation`
- `updateMapHomologation`
- `approveMapHomologation`
- `rejectMapHomologation`
- `buildHomologationSnapshot`

## Rotas alteradas

- `/territorios/mapa/homologacao`: agora carrega última homologação, salva rascunho, marca revisada, aprova e rejeita.
- `/mapa`: agora mostra status e decisão da homologação persistente.
- `/ajuda`: adicionada orientação de homologação persistente.

## Documentação atualizada

Atualizados:

- `docs/homologacao-mapa-interno.md`
- `docs/decisao-mapa-interno.md`
- `docs/tijolo-025-prototipo-mapa-interno-condicionado.md`

Criado:

- `docs/homologacao-persistente-mapa.md`

## Como criar homologação

1. Abrir `/territorios/mapa/homologacao`.
2. Conferir métricas e matriz GO/NO-GO.
3. Marcar checklist manual apenas com evidência real.
4. Informar decisão e justificativa.
5. Clicar em “Salvar rascunho”.
6. Quando revisada, clicar em “Marcar como revisada”.

## Como aprovar/rejeitar

Somente coordenação/admin podem aprovar ou rejeitar.

A aprovação exige:

- RLS validada;
- admin testado;
- coordenação testada;
- equipe testada;
- anônimo bloqueado;
- `service_role` ausente do frontend;
- privacidade confirmada;
- sem geocodificação;
- sensíveis pendentes = 0;
- duplicidades = 0;
- 20+ escutas revisadas;
- 3+ territórios com dados.

Se qualquer critério falhar, a tela mostra pendências e impede aprovação.

## Como `/mapa` exibe status

O topo do mapa-lista V0 mostra:

- sem homologação;
- rascunho;
- revisada;
- aprovada;
- rejeitada;
- decisão persistida.

Também mantém o alerta: mapa geográfico só pode ser prototipado se houver homologação aprovada com decisão `go_prototipo_interno`.

## Critérios que bloqueiam approval

- Papel diferente de coordenação/admin.
- RLS manual não validada.
- Usuários/papéis não testados.
- Anônimo não confirmado como bloqueado.
- `service_role` não confirmado como ausente do frontend.
- Checklist de privacidade incompleto.
- Sensível pendente.
- Duplicidade relevante.
- Menos de 20 escutas revisadas.
- Menos de 3 territórios com dados.

## Tijolo 026 pode ser protótipo visual?

Não automaticamente.

O Tijolo 026 só pode ser protótipo visual se existir registro em `internal_map_homologations` com:

- `status = approved`;
- `decision = go_prototipo_interno`.

Sem isso, o próximo tijolo deve continuar em homologação, correção de dados ou validação de RLS.

## Riscos restantes

- A validação de RLS continua manual e depende de evidência externa.
- O snapshot registra métricas do momento; não é versionamento completo de todos os dados.
- Duplicidades seguem heurísticas.
- O futuro mapa visual ainda deve evitar precisão falsa.
