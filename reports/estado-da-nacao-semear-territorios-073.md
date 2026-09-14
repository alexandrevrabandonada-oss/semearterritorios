# Estado da Nação — Tijolo 073: Oficinas

## Diagnóstico inicial
O tipo `oficina` já existia em `actions`, mas os fluxos operacionais assumiam `listening_records`, inadequados para conclusões coletivas.

## Entregas
- Modelagem isolada: `workshop_records`, com vínculo único à ação e RLS sem acesso anônimo.
- Ficha operacional e versão de impressão em Markdown.
- Formulário em `/acoes/[id]/oficina`, com participantes estimados, metodologia, diagnóstico, conclusões, propostas e privacidade.
- Ação tipo oficina passa a priorizar “Registrar oficina”, sem direcionar à digitalização de escutas.
- `buildWorkshopAnalytics` retorna leitura coletiva sem métricas de entrevistador, falas ou território individual.
- Dossiê e devolutiva usam blocos próprios de oficina; a devolutiva só é exibida para registro aprovado.
- Hub de relatórios separa oficinas e participantes estimados de escutas.
- Mapa registra oficinas somente no território da ação, sem inferir origem individual.
- Ajuda diferencia escuta, roda e oficina.

## Segurança e limites
Não há publicação automática. Participantes estimados não se convertem em escutas. O registro não inclui campos para nome, CPF, telefone ou endereço. A aprovação é reservada à coordenação/admin pela interface e RLS.

## Verificação
`npm run lint`, `npm run build` e `npm run verify` executados com sucesso. A migração deve ser aplicada antes de testar o fluxo no ambiente remoto.

## Riscos restantes e próximo tijolo
Snapshots gerados a partir de Leituras Coletivas agora incluem oficinas aprovadas apenas como ação coletiva e participantes estimados. Conclusões, propostas e materiais internos continuam fora do payload até revisão editorial explícita. Próximo tijolo recomendado: adicionar cenário Vitest completo do fluxo de oficina e uma etapa editorial específica para selecionar textos públicos.
