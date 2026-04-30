# Estado da Nação — SEMEAR Territórios 028

## Diagnóstico inicial

O Tijolo 027 bloqueou corretamente o protótipo visual do mapa interno porque não havia confirmação persistente de homologação aprovada com:

- `status = approved`;
- `decision = go_prototipo_interno`.

Foram verificados `/mapa/interno`, `/territorios/mapa/homologacao`, `internal_map_homologations`, qualidade territorial, qualidade da normalização e os documentos de homologação já existentes.

O sistema permanece bloqueado sem homologação persistente aprovada.

## Documentos criados

- `docs/checklist-homologacao-real-mapa.md`
- `docs/teste-manual-rls-mapa.md`
- `docs/evidencias-homologacao-mapa.md`
- `scripts/smoke-homologacao-mapa.md`

## Ajustes em `/territorios/mapa/homologacao`

Foi adicionado o bloco “Evidências necessárias antes de aprovar”, com orientação para registrar RLS por papel, anônimo bloqueado, ausência de `service_role` no frontend, relatórios copiados e decisão formal preenchida.

A tela continua deixando claro que esses testes são manuais.

## Ajustes em `/mapa/interno`

Quando o portão estiver bloqueado, a tela agora orienta: “Para liberar o protótipo, siga o kit de homologação real.”

Também lista os documentos do kit e links para homologação, qualidade territorial e qualidade da normalização.

## Ajustes em `/ajuda`

Foi adicionada a seção “Como desbloquear o mapa interno”, com passo a passo da revisão até a confirmação final em `/mapa/interno`.

## Como usar o kit

1. Preencher `docs/checklist-homologacao-real-mapa.md`.
2. Executar `docs/teste-manual-rls-mapa.md` com admin, coordenação, equipe e anônimo.
3. Registrar evidências em `docs/evidencias-homologacao-mapa.md`.
4. Seguir `scripts/smoke-homologacao-mapa.md`.
5. Abrir `/territorios/mapa/homologacao`.
6. Marcar checklist apenas com evidência real.
7. Aprovar como coordenação/admin somente se todos os critérios forem atendidos.
8. Voltar a `/mapa/interno` e confirmar “Autorizado para protótipo”.

## Estado do mapa

O mapa continua bloqueado para protótipo visual até que o banco aplicado tenha `internal_map_homologations.status = approved` e `internal_map_homologations.decision = go_prototipo_interno`.

## O que falta para liberar

- Evidência real de RLS.
- Evidência de privacidade.
- Qualidade territorial suficiente.
- Qualidade de normalização suficiente.
- Homologação persistente aprovada.

## Próximo tijolo recomendado

Se o kit for preenchido e `/mapa/interno` indicar “Autorizado para protótipo”, o próximo tijolo pode retomar o protótipo interno. Se não houver autorização, o próximo tijolo deve corrigir as pendências documentadas.

## Privacidade

Nenhuma funcionalidade de mapa geográfico foi criada. Nenhum dado pessoal, fala original, lugar sensível, geocodificação, Leaflet ou GeoJSON foi introduzido.
