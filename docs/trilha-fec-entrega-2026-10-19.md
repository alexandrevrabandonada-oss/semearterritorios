# Trilha técnica FEC — incremento funcional de 19/10/2026

> Continuação no mesmo dia: o fechamento mensal agora possui persistência, revisão própria, indicadores congelados e versões imutáveis após aprovação. Consulte [o relatório atualizado do fechamento mensal](trilha-fec-fechamento-mensal-2026-10-19.md). As referências abaixo a minuta recalculável e próximo incremento descrevem o estado anterior, no commit `874d9db`.

## Entregue

A Trilha FEC passou de uma minuta local e APIs iniciais para um fluxo de ciclos, atividades, acervo territorial versionado e relatório mensal individual. O código está na PR #2, em rascunho. A persistência continua desativada por padrão, aguardando homologação.

### Ciclos e atividades

`/fec/cartografia` consulta aditivos e atribuições autorizados pela sessão, utiliza o cadastro oficial de bairros e permite criar ou corrigir ciclos com pergunta orientadora, objetivos, metodologia e etapa. O executor é identificado pela sessão. A supervisão é designada no aditivo, separadamente do papel geral do usuário no sistema.

Oficinas e atividades registram data, objetivo pedagógico, método realizado, temas, registros de campo, resultados preliminares, relatos, observações, referências, limites e próximos passos. Contagens registradas e estimadas continuam distintas. Preparação e sistematização não recebem público. Pessoas únicas não são inferidas da soma de participações.

Uma ação oficial pode ser vinculada quando o registro FEC é uma contribuição para o mesmo evento. O banco exige ação visível realizada, mesma data e território; não cria uma segunda ação. O cadastro geral de ações não é automaticamente atribuído à APS.

A navegação própria da Trilha FEC não oferece a digitação de escutas APS como ação principal. O profissional com atribuição FEC pode entrar nessa área sem ser incorporado administrativamente à equipe APS. O middleware não amplia seu acesso às demais áreas do sistema.

### Acervo de conhecimento

`fec_knowledge_records` tem identidade permanente de produto, número de versão, referência à versão anterior, ciclo, autor, tipo, conteúdo específico e fontes identificadas. Os tipos têm validação própria:

| Tipo | Conteúdo específico | Origem obrigatória |
|---|---|---|
| Evidência | Classe, descrição e referência/contexto | Atividade do mesmo ciclo |
| Mapa social | Método participativo, legenda, categorias e autoria coletiva | Oficina/atividade do mesmo ciclo |
| Diagnóstico participativo | Questões, leitura preliminar, divergências, problemas/potencialidades e propostas comunitárias | Atividade ou produto aprovado do mesmo ciclo |
| Achado | Descrição e incertezas | Atividade ou produto aprovado do mesmo ciclo |
| Proposta | Formulação, responsável pelo acompanhamento e resposta/providência | Atividade do mesmo ciclo |

As fontes de produto apontam para versões concretas, não somente para títulos. A revisão final exige atividades-fonte aprovadas. Fontes inexistentes, de outro ciclo ou de outro executor são recusadas. Um relato não se converte automaticamente em medição: evidência participante, observação direta, documento e medição/estudo são classes distintas.

Os produtos têm revisão técnica e situação de validação comunitária separadas. Registrar confirmação, pendência, validação parcial ou divergência exige contexto. A aprovação técnica não altera automaticamente a situação comunitária.

Propostas começam como formuladas. Encaminhada, respondida, providência registrada como executada ou encerrada exigem resposta/providência documentada. Isso permite acompanhar o processo sem tratar a formulação como execução.

### Arquivos privados e versões

O bucket `fec-technical-private` é privado e limita arquivos a 10 MB, nos formatos PDF, DOCX, PNG ou JPEG. O navegador envia os bytes diretamente ao Storage com a sessão do usuário; a API recebe somente metadados. Isso evita transportar arquivos pelo limite de corpo das funções da hospedagem.

O banco permite anexar somente a rascunho/ajustes próprios e exige objeto existente para registrar o vínculo. Downloads recebem acesso temporário de 60 segundos, após autorização. Substituições são novos objetos; não há sobrescrita nem exclusão por clientes. Políticas restritivas impedem que uma política anterior permissiva libere esse bucket.

Após envio, o conteúdo fica protegido. O supervisor pode aprovar ou solicitar ajustes com motivo. Produtos aprovados ficam imutáveis e exigem nova versão para atualização; a versão seguinte preserva a chave do produto e não pode bifurcar uma cadeia já continuada. Ciclos e atividades aprovados podem ser reabertos por supervisor distinto do executor, com justificativa. O histórico registra criação, edição, envio, aprovação e ajustes, com responsável e data, sem copiar os textos sensíveis.

### Relatório técnico mensal e leitura territorial

O relatório mensal individual deixou de passar listas vazias de produtos para um extrato de atividades. A API consulta atividades, versões e anexos persistidos e monta onze blocos: síntese, territórios, ciclos, oficinas, mapas, diagnósticos, achados/fontes, propostas, limites, planejamento e anexos.

Atividades entram pela data da execução. Produtos entram pela revisão técnica no período, preservando a data da primeira aprovação para distinguir mapa novo de revisão. Versão futura não é usada retroativamente. Rascunhos e fontes reabertas não sustentam silenciosamente os indicadores. Quando há múltiplas contribuições para um mesmo evento, o público desse evento fica fora da soma até conferência, em vez de ser somado duas vezes. A ausência de registro não é apresentada como prova de ausência de trabalho.

O resultado é uma **minuta privada recalculável**, consultável e exportável em Markdown. Não possui aprovação própria de relatório mensal nem congelamento documental nesta etapa. A revisão dos registros de origem já é auditada, mas não equivale a aceite financeiro da FEC.

A leitura por território reúne ciclos, referências de atividades e produtos FEC e ações oficiais visíveis à sessão. Não divulga relatos brutos nem arquivos. Um evento explicitamente compartilhado é contado uma vez, preservando suas contribuições. O acesso da sessão continua limitado por RLS; esta tela não amplia permissões de leitura APS.

## Auditoria corrigida e verificação

A migração inicial tinha delimitadores `$` inválidos em uma função. A execução integral em PostgreSQL isolado detectou a necessidade de corrigir o SQL que os testes estáticos não comprovavam. A revisão também acrescentou tratamento de decisão nula, vínculo ativo durante revisão, funções privilegiadas no schema privado, bloqueio de conteúdo enviado, isolamento de fontes, proteção contra solicitação de ajustes fabricada pelo executor, revisão sem reescrita do conteúdo e histórico acionado somente pelo banco.

Verificações executadas:

- Suíte Vitest geral, incluindo importação e relatórios existentes, protocolo, API, acervo e relatório FEC.
- `npm run test:fec:db`: 66 verificações PostgreSQL/RLS sobre a migração completa, incluindo usuário anônimo, executores distintos, supervisor, APS sem atribuição, revogação de acesso, aditivo fechado, fontes, versões, revisão e Storage. Não são apenas comparações de texto SQL.
- Regressão isolada do fluxo semanal/síntese: 36 verificações PostgreSQL. Mensal manual legado: 41 verificações PostgreSQL.
- TypeScript e lint. Build Next.js local, além da prévia associada ao commit enviado à PR, registrados na evidência final da execução.
- Interface em Edge, desktop 1440×1000 e celular 390×844: criação de ciclo e oficina, alternância entre executor e supervisor, aprovação, mapa e arquivo privado, nova versão em rascunho, evidência, diagnóstico, achado, proposta, geração do relatório e leitura por território. APIs Next reais ligadas a um adaptador HTTP local e PostgreSQL PGlite; sem interceptação das APIs FEC no navegador. Nenhum erro de página/console ou overflow horizontal na execução validada.

O adaptador simula os serviços HTTP de Auth, PostgREST e Storage para os testes. Isso comprova o encadeamento local e a execução das políticas SQL, mas não homologa configuração do serviço Supabase hospedado, assinatura real de JWT ou distribuição real de arquivos.

Browser plugin não disponível na sessão; foi utilizado Playwright com Edge pelo runtime já instalado. As capturas ficam no diretório temporário `semear-fec-evidence`, fora do código versionado.

## Homologação e limites

Não foi aplicada a migração FEC no banco produtivo nem ativada a flag em ambiente remoto. Não foram criados aditivos, acessos de pessoas reais, dados de campo ou publicações. A PR permanece em rascunho. O estado produtivo e a recuperação do fluxo de outubro estão documentados em [Reconciliação dos ambientes](trilha-fec-reconciliacao-2026-10-19.md).

Antes de habilitar em ambiente institucional, conferir o documento do aditivo e os responsáveis; criar uma homologação Supabase autorizada; aplicar as migrações nessa base; provisionar somente atribuições de teste; exercitar Storage e sessões do serviço real; executar um piloto com dados revisados. A aplicação produtiva e o merge permanecem fora desta autorização.

Os limites de volume são explícitos: listagens e consolidações recusam fontes truncadas quando atingem o teto previsto. Paginação operacional e pesquisa por período precisam evoluir antes de uso em grandes acervos.

O próximo incremento material é persistir o relatório mensal FEC como documento versionado, congelar suas fontes e registrar envio/revisão/aprovação próprios. Depois disso, a coordenação poderá selecionar contribuições para a síntese integrada do SEMEAR, preservando executor e aditivo. A publicação no semearsf.org depende ainda do fluxo editorial e da resolução do bloqueio de implantação do site; não foi ativada para a FEC.

## Comandos reproduzíveis

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

PGlite está fixado em `0.5.10` no lockfile. Testes não recebem credenciais produtivas. As migrações de outubro recuperadas já existem no banco interno e não devem ser reaplicadas por este guia. A proposta FEC `20261019190000_fec_technical_cycles_staged.sql` continua não aplicada.
