# SEMEAR — fechamento mensal da Trilha Técnica FEC

Data: 19/10/2026. Continuação do incremento `874d9db` na [PR #2](https://github.com/alexandrevrabandonada-oss/semearterritorios/pull/2), mantida em rascunho.

## ENTREGUE

O relatório mensal individual deixou de ser apenas uma minuta recalculável. Agora possui registro persistente por aditivo, profissional, mês e versão, com texto conferido pelo executor, fontes congeladas, indicadores calculados no banco, revisão técnica independente e histórico. Não foi habilitado em produção.

### Como o trabalho entra no projeto

O profissional registra o trabalho ao longo das semanas em ciclos territoriais: atividades datadas, oficinas, evidências, mapas sociais, diagnósticos, achados e propostas. Esses registros preservam executor, aditivo, território oficial, método e fontes. O fechamento reúne os registros existentes; não cria novas ações nem presume entregas a partir de narrativas.

Na Trilha FEC, a unidade persistente é a atividade/produto do ciclo, não uma cópia do formulário semanal da APS. O fluxo semanal e a síntese existentes foram preservados. Este incremento não importa automaticamente documentos semanais FEC nem transforma relatórios semanais APS em produtos FEC.

A leitura por território permite consultar contribuições autorizadas junto das ações oficiais, mantendo suas origens. Um vínculo explícito identifica participação no mesmo evento; bairro ou tema semelhantes não fundem registros. Não se concede papel administrativo ou vínculo APS para viabilizar o acesso FEC.

### Método de produção e leitura

1. Preparar o ciclo com pergunta orientadora, objetivos e metodologia.
2. Registrar oficinas e atividades com data, objetivo pedagógico, método efetivamente utilizado e limites da participação.
3. Classificar evidências: relato participante, observação da equipe, referência documental ou medição/pesquisa. Relatos não viram medições nem conclusões causais automaticamente.
4. Construir mapas com legenda, categorias e contexto participativo; diagnósticos e achados citam atividades ou versões concretas de produtos.
5. Registrar divergências, incertezas e validação comunitária separadamente da revisão técnica.
6. Documentar propostas e respostas sem confundir formulação com providência executada.
7. Conferir o fechamento mensal e submetê-lo à supervisão designada no aditivo.

### Operação do fechamento

Em `/fec/cartografia`, a aba **Relatório mensal** abre um fechamento de todos os ciclos pertinentes do mesmo profissional/aditivo, não somente do ciclo selecionado na tela.

O fluxo é **Rascunho → Enviado → Em revisão → Aprovado ou Ajustes solicitados**. Ajustes retornam ao executor, que corrige e reenvia. Há apenas uma versão aberta por profissional/aditivo/mês. O banco exige revisão esperada para impedir sobrescrita concorrente.

Os onze blocos são síntese; territórios; ciclos; oficinas/atividades; mapas; diagnósticos; achados; propostas; dificuldades/limites; planejamento; anexos. O sistema prepara o texto a partir das fontes; o executor confere e pode editar os blocos, sem editar os indicadores ou forjar fontes pelo cliente.

Mês sem registros aprovados exige justificativa. Ausência de registros não é apresentada como prova de ausência de trabalho. Preparação e sistematização não recebem público. Participações registradas e estimadas ficam separadas; pessoas únicas permanecem não apuradas.

### Fontes, indicadores e versões

- A abertura preserva uma cópia privada das fontes e uma referência SHA-256.
- Atividades entram pela data de execução; produtos pela aprovação técnica no período, usando horário de Brasília. Revisões futuras não entram retroativamente.
- Mapas novos e versões de mapas são indicadores distintos. Produtos com origem reaberta/inválida não sustentam silenciosamente os totais.
- Contribuições para evento compartilhado não duplicam público: a participação fica pendente de conferência quando há mais de uma contribuição para a mesma identidade de evento.
- Os indicadores ficam armazenados com versão do cálculo. Uma mudança futura no código não recalcula os totais de uma versão aprovada.
- Mudanças nas fontes são sinalizadas e bloqueiam envio/aprovação. Recompor fontes exige confirmação na interface, substitui os textos do rascunho e exige nova conferência.
- Aprovação bloqueia edição inclusive pela supervisão. Atualização exige nova versão explicitamente encadeada à última aprovação; a anterior permanece consultável.
- Exportação em Markdown usa o texto salvo, fontes, indicadores e situação daquela versão. Há proteção para alterações locais ainda não salvas.

### Revisão, permissões e privacidade

Somente o executor com atribuição ativa prepara e envia o próprio fechamento. A supervisão do aditivo, distinta do autor, inicia revisão e decide. Solicitação de ajustes exige motivo; aprovação exige quatro conferências explícitas: fontes/vínculos, metodologia/indicadores, privacidade e entregas/anexos.

O banco define autoria, fontes e contagens. Não há gravação direta pelo cliente nas tabelas de fechamento ou histórico. Políticas RLS limitam leitura ao executor próprio e à supervisão do aditivo; revogação da atribuição remove o acesso. O histórico registra ator, data, situação, revisão e justificativa sem copiar o conteúdo sensível nos eventos.

Arquivos continuam privados, associados aos produtos e sujeitos às permissões e limites já implementados: 10 MB por arquivo; PDF, DOCX, PNG e JPEG; acesso temporário autorizado. Este incremento não exige um PDF/DOCX mensal principal nem gera DOCX/PDF final: o fechamento persistente é o registro estruturado e sua exportação Markdown.

### Integração e transparência

O relatório individual FEC não é a síntese integrada do SEMEAR. Aprovação técnica não constitui aceite financeiro, validação comunitária ou autorização para publicar.

A próxima camada é a seleção explícita pela coordenação de contribuições aprovadas para uma síntese integrada rastreável. A publicação no `semearsf.org` deve usar conteúdo editorial revisado, não snapshots privados ou relatos brutos. Essa seleção/publicação FEC ainda não foi implementada nem ativada. Não existe sincronização pública automática deste fechamento.

### Principais arquivos

- `supabase/migrations/20261019190720_fec_monthly_report_versions.sql`: tabelas próprias, RLS, RPCs autorizadas, locks de fontes, cálculo SQL, histórico e imutabilidade.
- `app/api/fec/monthly/reports/route.ts`: abertura, consulta, edição, recomposição e revisão, sempre com sessão e flag.
- `components/fec/monthly-workspace.tsx`: formulário, versões, conferências, histórico e exportação.
- `components/fec/technical-workspace.tsx`: integração na navegação FEC, sem alterar o formulário APS.
- `lib/fec-monthly-versions.ts`: comandos estritos e apresentação da versão armazenada.
- `lib/fec-technical-report.ts`: leitura das fontes, aditivo e nomes territoriais preservados e período de Brasília.
- `tests/fec-monthly-rls.mjs`, `tests/fec-monthly-metrics.test.ts`, `tests/fec-monthly-versions.test.ts`: segurança real no PostgreSQL isolado, paridade de cálculo e contratos.

## VERIFICADO

- `npm test`: **146 testes em 23 arquivos**, incluindo fluxos existentes.
- `npm run test:fec:db`: **66 verificações base + 43 mensais** em PostgreSQL/PGlite real isolado, não apenas análise textual de SQL.
- Regressão SQL semanal/síntese: **36 verificações**. Mensal manual legado: **41 verificações**.
- Oito cenários comparam o cálculo SQL dos indicadores ao cálculo da aplicação: eventos compartilhados, revisões de mapas, dependências inválidas, meses diferentes e fronteira UTC/Brasília.
- Lint sem erros/avisos de código; TypeScript aprovado. O comando legado `next lint` emite aviso de depreciação da ferramenta.
- `npm run build`: aprovado em Next.js 15.5.25, incluindo a nova API `/api/fec/monthly/reports` e 68 páginas estáticas. Build sem credenciais produtivas ou flag FEC remota.

### QA da interface

Ambiente: `http://127.0.0.1:3018`, Edge via Playwright, desktop 1440×1000 e móvel 390×844. Browser plugin não disponível; utilizado o runtime Playwright já instalado, sem instalar dependências de navegador.

| Verificação | Resultado |
|---|---|
| Identidade e conteúdo | Rota FEC e título SEMEAR Territórios, interface preenchida |
| Overlay de framework | Não observado |
| Console/página | Nenhum erro relevante na execução validada |
| Interação | Criação, edição, fontes desatualizadas, recomposição, envio, revisão, ajustes, reenvio, aprovação e versão seguinte passaram |
| Preservação | Versão aprovada manteve fontes, hash, texto e indicadores após novas atividades e abertura da versão 2 |
| Exportação | Markdown baixado com aditivo, texto conferido, versão, anexos e ressalva não financeira |
| Responsividade | Sem overflow horizontal no viewport móvel validado |

As APIs Next reais foram ligadas a adaptador HTTP local de Auth/PostgREST/Storage e PGlite, com dados fictícios. Não houve interceptação das APIs FEC no navegador. Isso não valida assinatura real de JWT, infraestrutura Supabase hospedada ou distribuição remota de arquivos. Capturas estão fora do repositório, no diretório temporário `semear-fec-evidence`.

## PENDENTE

1. Homologação em Supabase hospedado autorizado, com sessões e Storage reais. As duas migrações FEC continuam propostas, não aplicadas em produção.
2. Piloto com um mês real revisado, conferindo aditivo, atribuições e privacidade. Nenhum acesso de pessoa real foi concedido.
3. Seleção editorial para síntese integrada e transparência pública. O bloqueio anterior de implantação do site público não foi alterado.
4. Paginação para acervos maiores. O sistema recusa consolidações acima dos limites previstos em vez de apresentar dados truncados.

Persistência remota continua desativada por padrão por `SEMEAR_FEC_PERSISTENCE_ENABLED`. Build ou prévia READY não significam homologação do banco nem publicação.

## PRÓXIMO MOVIMENTO

Homologar o fechamento e o acesso a anexos no serviço Supabase real, em ambiente autorizado, e implementar a seleção editorial de contribuições aprovadas para a síntese integrada, preservando a distinção APS/FEC. Merge, migrações produtivas e publicação permanecem dependentes de autorização específica.

## Reprodução local

```sh
npm ci
npm test
npm run test:fec:db
npm run lint
npx tsc --noEmit
npm run build
node scripts/test-weekly-synthesis-db.mjs CAMINHO_ABSOLUTO_PGLITE/dist/index.js
node scripts/test-professional-monthly-db.mjs CAMINHO_ABSOLUTO_PGLITE/dist/index.js
```

Não usar credenciais produtivas nos testes. Não reaplicar as migrações semanais/mensais legadas já existentes no banco interno. As propostas FEC devem ser avaliadas na ordem `20261019190000` e `20261019190720`, somente em base autorizada.
