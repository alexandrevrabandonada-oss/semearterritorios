# Tijolo 024 — Protótipo do Mapa Interno Autenticado

Este tijolo só deve ser executado se a homologação do mapa interno registrar GO formal para protótipo interno autenticado.

Este documento descreve o escopo futuro do protótipo do mapa interno. Ele só deve ser executado se a decisão formal em `docs/decisao-mapa-interno.md` autorizar.

## Riscos de implementar sem GO

- Expor lugares sensíveis em visualização territorial.
- Sugerir precisão geográfica falsa.
- Criar mapa sem RLS validada no banco aplicado.
- Usar dados com duplicidades ou normalização inconsistente.
- Transformar material interno em interpretação pública sem revisão.

## Checklist obrigatório antes de iniciar

- `docs/decisao-mapa-interno.md` preenchido.
- `docs/homologacao-mapa-interno.md` preenchido.
- `/territorios/mapa/homologacao` com recomendação GO.
- RLS validada manualmente no banco aplicado.
- Usuários admin, coordenação e equipe testados.
- Anônimo sem acesso confirmado.
- `service_role` ausente do frontend confirmado.
- Sem sensíveis pendentes.
- Sem duplicidades relevantes.
- Base territorial suficiente.

## Escopo máximo do protótipo

- Mapa interno autenticado.
- Agregação por bairro/território.
- Filtros por mês, tema e tipo de ação.
- Lugares normalizados seguros.
- Sem fala original.
- Sem dado pessoal.
- Sem página pública.
- Sem geocodificação de endereço pessoal.

## Escopo futuro

- Mapa interno autenticado.
- Agregação por bairro/território.
- Filtros por mês, tema e tipo de ação.
- Lugares normalizados seguros.
- Temas por bairro.
- Intensidade de escutas.
- Painel lateral por território.
- Alternância entre mapa-lista e visualização territorial, se fizer sentido.

## Biblioteca de mapa

Usar biblioteca de mapa apenas se necessário. A escolha técnica deve considerar:

- capacidade de operar sem expor pontos individuais;
- suporte a agregação por bairro;
- controle de privacidade;
- custo de manutenção;
- acessibilidade.

Não instalar biblioteca antes da decisão GO.

## Dados permitidos

- Bairros/territórios.
- Contagem agregada de escutas.
- Temas agregados.
- Lugares normalizados com `visibility = internal` ou `public_safe`.
- Status de qualidade territorial.
- Status de normalização.

## Dados proibidos

- Falas originais.
- Dados pessoais.
- Nome completo de pessoa escutada.
- Entrevistador, salvo necessidade institucional explícita.
- Endereço pessoal.
- Lugar sensível.
- Página pública.
- Geocodificação de endereço pessoal.

## Condições para executar este tijolo

- 20+ escutas revisadas.
- 3+ territórios com dados.
- Relatório de qualidade territorial copiado.
- Relatório de qualidade da normalização copiado.
- `docs/decisao-mapa-interno.md` preenchido.
- RLS validada no banco aplicado.
- `visibility = sensitive` oculto em `/mapa`.
- `place_type = sensivel_nao_publicar` oculto em `/mapa`.
- Decisão GO para protótipo interno registrada pela coordenação.

## Fora do escopo

- Página pública.
- Mapa público sanitizado.
- PWA/offline.
- IA.
- Geocodificação de endereço pessoal.
- Exibição de fala original.
