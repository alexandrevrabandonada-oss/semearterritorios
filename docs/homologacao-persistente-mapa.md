# Homologação Persistente do Mapa

Este documento descreve o registro auditável da homologação do mapa interno em `internal_map_homologations`.

## Campos principais

- `status`: `draft`, `reviewed`, `approved`, `rejected`.
- `decision`: decisão GO/NO-GO.
- `decision_reason`: justificativa obrigatória.
- `rls_validated`: RLS validada manualmente no banco aplicado.
- `admin_tested`, `coordenacao_tested`, `equipe_tested`: papéis testados.
- `anon_blocked`: acesso anônimo bloqueado.
- `service_role_absent_frontend`: ausência de `service_role` no frontend.
- `privacy_checked`: privacidade revisada.
- `no_geocoding_confirmed`: sem geocodificação.
- contadores de escutas, territórios, sensíveis, duplicidades e lugares seguros.
- `snapshot`: cópia JSON dos critérios no momento da homologação.
- `approved_by`, `approved_at`, `rejected_by`, `rejected_at`: auditoria.

## Como preencher

1. Abrir `/territorios/mapa/homologacao`.
2. Conferir dados agregados.
3. Validar RLS manualmente no banco aplicado.
4. Marcar checklist somente com evidência.
5. Definir decisão e justificativa.
6. Salvar rascunho.
7. Marcar como revisada.
8. Coordenação/admin aprova ou rejeita.

Para a homologação real, use também:

- `docs/checklist-homologacao-real-mapa.md`;
- `docs/teste-manual-rls-mapa.md`;
- `docs/evidencias-homologacao-mapa.md`;
- `scripts/smoke-homologacao-mapa.md`.

## Critérios de aprovação

- RLS validada.
- Admin, coordenação e equipe testados.
- Anônimo bloqueado.
- `service_role` ausente do frontend.
- Privacidade confirmada.
- Sem geocodificação.
- Sensíveis pendentes igual a 0.
- Duplicidades relevantes igual a 0.
- 20+ escutas revisadas.
- 3+ territórios com dados.

## Critérios de rejeição

- RLS não validada.
- Privacidade pendente.
- Sensível pendente.
- Duplicidade relevante.
- Base territorial insuficiente.
- Justificativa institucional de não avanço.

## Evidências recomendadas

- Relatório copiado da tela de homologação.
- Relatório de qualidade territorial.
- Relatório de qualidade da normalização.
- Registro de teste dos papéis.
- Confirmação de bloqueio para anônimo.

## Regra de liberação

O protótipo visual só pode começar se:

- `internal_map_homologations.status = approved`;
- `internal_map_homologations.decision = go_prototipo_interno`.
