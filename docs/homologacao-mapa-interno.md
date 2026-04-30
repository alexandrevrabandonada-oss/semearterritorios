# Homologação do Mapa Interno

Documento preenchível para registrar a homologação formal antes de qualquer protótipo visual do mapa interno autenticado.

A homologação também deve existir no banco, na tabela `internal_map_homologations`. Este documento deve refletir o registro persistente mais recente.

Para homologação real, preencher também:

- `docs/checklist-homologacao-real-mapa.md`;
- `docs/teste-manual-rls-mapa.md`;
- `docs/evidencias-homologacao-mapa.md`.

## 1. Identificação

- Data da homologação:
- Responsável técnico:
- Responsável de coordenação:
- Ambiente testado: [ ] dev [ ] staging [ ] produção

## 2. Banco e RLS

- RLS validada manualmente: [ ] sim [ ] não
- Usuário admin testado: [ ] sim [ ] não
- Usuário coordenacao testado: [ ] sim [ ] não
- Usuário equipe testado: [ ] sim [ ] não
- Anônimo sem acesso: [ ] sim [ ] não
- `service_role` ausente do frontend: [ ] sim [ ] não

Tabelas envolvidas:

- `neighborhoods`
- `listening_records`
- `themes`
- `listening_record_themes`
- `places_mentioned`
- `normalized_places`
- `action_debriefs`
- `action_closures`

## 3. Dados mínimos

- Total de escutas revisadas:
- Total de territórios com dados:
- Territórios prontos:
- Territórios bloqueados:
- Sensíveis pendentes:
- Duplicidades pendentes:
- Lugares normalizados seguros:

## 4. Privacidade

- Mapa sem fala original: [ ] sim [ ] não
- Mapa sem CPF/telefone/e-mail/endereço: [ ] sim [ ] não
- Lugares `sensitive` ocultos: [ ] sim [ ] não
- `sensivel_nao_publicar` oculto: [ ] sim [ ] não
- Sem geocodificação: [ ] sim [ ] não

## 5. Decisão

Marcar uma opção:

- [ ] NO-GO: dados insuficientes
- [ ] NO-GO: privacidade
- [ ] NO-GO: normalização
- [ ] GO: protótipo interno autenticado
- [ ] GO: manter apenas mapa-lista por enquanto

## 6. Justificativa

Campo livre:

## 7. Próximo tijolo autorizado

Campo livre:

## Evidências

- Relatório copiado de `/territorios/mapa/homologacao`:
- Relatório de qualidade territorial:
- Relatório de qualidade da normalização:
- Evidência de RLS manual:

## Registro persistente

- ID em `internal_map_homologations`:
- Status: [ ] draft [ ] reviewed [ ] approved [ ] rejected
- Decision:
  - [ ] no_go_dados_insuficientes
  - [ ] no_go_privacidade
  - [ ] no_go_normalizacao
  - [ ] go_desenho_tecnico
  - [ ] go_prototipo_interno
  - [ ] manter_mapa_lista

O protótipo só pode começar se `internal_map_homologations.status = approved` e `internal_map_homologations.decision = go_prototipo_interno`.
