# Matriz de Priorização do Mapa

Esta matriz ajuda a decidir se o SEMEAR Territórios deve avançar para mapa geográfico real agora ou se deve fortalecer a operação antes.

## Perguntas de decisão

| Pergunta | Resposta | Evidência |
| --- | --- | --- |
| O mapa será usado para equipe interna ou apresentação pública? |  |  |
| Há bairros suficientes cadastrados? |  |  |
| Há escutas revisadas suficientes? |  |  |
| Há lugares mencionados com qualidade? |  |  |
| Há necessidade de GeoJSON agora ou mapa-lista resolve? |  |  |
| Qual o risco de expor território/pessoa? |  |  |
| O mapa deve mostrar temas por bairro ou intensidade de escuta? |  |  |

## Critérios práticos

- Menos de 20 escutas revisadas: manter foco em operação/revisão.
- 20+ escutas revisadas e 3+ bairros/territórios: considerar mapa territorial interno.
- Lugares mencionados genéricos ou inconsistentes: manter mapa-lista ou painel por território.
- Risco alto de identificação de pessoa/território sensível: não criar mapa público.
- Necessidade de apresentação comunitária: priorizar visual sanitizado e agregado.

## Classificação

Marque a decisão:

- [ ] Mapa agora.
- [ ] Mapa depois.
- [ ] Não fazer mapa neste ciclo.

## Tipo recomendado

- [ ] 1. Manter mapa-lista.
- [ ] 2. Mapa geográfico interno.
- [ ] 3. Mapa público sanitizado.
- [ ] 4. Painel por território sem mapa visual.

## Caminhos possíveis

### 1. Manter mapa-lista atual

- Quando usar: há poucos dados revisados, poucos territórios ou lugares mencionados ainda inconsistentes.
- Dados mínimos: ações e escutas revisadas suficientes para leitura textual.
- Riscos: baixa força visual para apresentação, mas menor risco de exposição.
- O que não deve aparecer: fala original completa, endereço pessoal, nome de pessoa, telefone, CPF ou e-mail.

### 2. Criar mapa interno autenticado por bairro

- Quando usar: há 20+ escutas revisadas, 3+ bairros/territórios e necessidade de leitura territorial pela equipe.
- Dados mínimos: bairros cadastrados, temas marcados, revisão concluída e dossiês fechados.
- Riscos: sugerir precisão maior que a base permite ou expor território sensível.
- O que não deve aparecer: pontos de endereço pessoal, falas originais, nomes, contatos ou dados sensíveis.

### 3. Criar painel por território sem mapa geográfico

- Quando usar: há dados por território, mas não há geometria confiável ou a equipe ainda não precisa de mapa visual.
- Dados mínimos: bairro/território preenchido nas ações e escutas.
- Riscos: menor apelo visual, mas boa segurança e clareza operacional.
- O que não deve aparecer: localização individual, fala identificável ou campo sensível.

### 4. Criar mapa público sanitizado no futuro

- Quando usar: somente após validação institucional, revisão de privacidade e decisão explícita de comunicação pública.
- Dados mínimos: dados agregados, aprovados, sem sensibilidade territorial e com revisão de coordenação.
- Riscos: exposição comunitária indevida, leitura errada de intensidade ou identificação indireta.
- O que não deve aparecer: qualquer dado individual, ponto preciso de moradia, fala original, entrevistador ou quantidade muito pequena que identifique pessoas.

## Escopo mínimo para futuro Tijolo do Mapa

- Fonte de bairros/territórios: lista oficial da APS/equipe territorial. Evitar nomes inventados.
- Procedimento recomendado:
	1. Preencher o template em supabase/seeds/neighborhoods.official.template.sql.
	2. Copiar o conteudo para uma nova migration versionada em supabase/migrations/.
	3. Aplicar no remoto com supabase db push.
	4. Validar se /acoes/nova e /escutas/nova exibem a lista oficial completa.
	5. Se necessario, limpar bairros operacionais sem uso usando supabase/seeds/neighborhoods.operational.cleanup.template.sql em migration separada.
- Campos permitidos:
- Campos proibidos:
- Agregação mínima:
- Quem pode ver:
- Como testar privacidade:

## Decisão final

- Decisão:
- Justificativa:
- Responsável:
- Data:
