# Homologação de leitura coletiva para Transparência Viva

## Objetivo

Definir o fluxo seguro para transformar análises internas de Leituras Coletivas em proposta de snapshot da Transparência Viva, sempre como rascunho interno e com revisão obrigatória antes de publicação.

## Diferença entre análise interna e publicação pública

- Leituras Coletivas (`/leituras`): uso interno, operacional, para orientar campo e revisão.
- Transparência Viva (`/transparencia/snapshots`): texto público revisado, checklist de privacidade completo e aprovação de coordenação/admin.

Nada sai automaticamente de `/leituras` para o público.

## Como gerar proposta de snapshot

1. Acessar `/leituras`.
2. Clicar em `Preparar snapshot da Transparência Viva`.
3. Revisar o modal de prévia segura:
   - período;
   - total de escutas revisadas;
   - territórios alcançados;
   - temas principais;
   - palavras recorrentes sanitizadas;
   - silêncios e lacunas;
   - aviso metodológico.
4. Confirmar a frase obrigatória de rascunho interno.
5. Criar snapshot draft.
6. Sistema redireciona para `/transparencia/snapshots/[id]`.

## O que entra no snapshot

- título e período;
- resumo público agregado;
- totais de escutas revisadas;
- síntese territorial com marcação de baixa amostra;
- temas recorrentes agregados;
- palavras recorrentes sanitizadas;
- linha do tempo agregada de ações;
- notas de privacidade e metodologia.

## O que nunca entra

- fala original bruta;
- escuta individual bruta;
- entrevistador;
- CPF, telefone, e-mail;
- endereço, rua, número ou CEP;
- lugar sensível (`sensitive` ou `sensivel_nao_publicar`);
- coordenada individual;
- ocupação rara individualizada.

## Regra de amostra mínima

- Território com menos de 5 escutas revisadas: `dados insuficientes para síntese pública`.
- Território alcançado não é ocultado, mas não recebe afirmação forte.

## Regras de sanitização

### Palavras recorrentes

- remove nomes próprios suspeitos;
- remove CPF/telefone/e-mail/endereço;
- remove tokens muito raros ou inseguros;
- aplica stopwords;
- registra no `privacy_notes` que houve sanitização.

### Ocupações

- apenas agregadas;
- frequência menor que 3 vai para `Outras ocupações`;
- não cruzar ocupação rara com território pequeno.

### Lugares mencionados

- apenas `normalized_places.visibility = public_safe`;
- `internal`, `sensitive` e `sensivel_nao_publicar` ficam fora.

## Revisão e homologação

1. Snapshot nasce com status `draft`.
2. Equipe editorial revisa conteúdo e checklist.
3. Coordenação/admin resolve pendências e comentários críticos.
4. Coordenação/admin aprova.
5. Publicação só após checklist completo e sem risco bloqueante.

## Checklist específico da leitura coletiva

- dados vieram de agregados;
- não há fala original;
- territórios com baixa amostra estão marcados;
- palavras recorrentes foram sanitizadas;
- ocupações raras foram agrupadas;
- lugares sensíveis foram excluídos;
- leitura não é apresentada como pesquisa estatística censitária.

## Garantias de segurança

- sem publicação automática;
- sem nova página pública;
- sem mapa público de pontos;
- sem uso de service_role no frontend;
- sem relaxamento de RLS.
