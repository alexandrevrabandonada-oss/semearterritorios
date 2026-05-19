# Estado Atual do Projeto — SEMEAR Territórios

Data: 18/05/2026  
Base analisada: código local em `main`, relatórios até o Tijolo 072, validações técnicas recentes e estado atual do workspace

## 1. Resumo executivo

O projeto está em estado funcional avançado. A aplicação já cobre o núcleo operacional do SEMEAR Territórios com autenticação, papéis (`admin`, `coordenacao`, `equipe`), módulos de escutas, ações, memória do projeto, agenda interna, territorialização e transparência pública controlada. A base técnica principal está montada: App Router com Next.js, Supabase com RLS e storage privado, trilhas editoriais, snapshots de transparência e fluxo de governança.

No momento, o sistema está tecnicamente estável para desenvolvimento contínuo e validação operacional. Os principais ganhos recentes foram:

- fechamento técnico do ciclo 072 de aceite presencial assistido;
- segunda passada de redesign visual nas rotas mais críticas;
- correção do processamento de PDF no módulo `/memoria`, que deixou de falhar por integração incorreta com `pdf-parse`.

O projeto ainda não está “encerrado”: há pendências operacionais e de acabamento. O código local também está com uma frente visual em andamento não commitada, o que exige cuidado para não misturar redesign com correções funcionais futuras.

## 2. Estado geral por dimensão

### Produto

- Escopo interno já é amplo e coerente com a operação real.
- O app não é mais um protótipo de formulário isolado; já funciona como plataforma interna com múltiplos fluxos conectados.
- A parte pública continua controlada e separada da parte interna, com filtros de publicação e governança.

### Técnica

- Stack principal consolidada: `Next.js 14`, `React 18`, `TypeScript`, `Tailwind`, `Supabase`.
- Estrutura de permissões e autenticação existe e está aplicada em rotas, queries e storage.
- Há base de testes automatizados, build limpo e convenções de relatório técnico por tijolo.

### Operação

- O projeto já documentou cenários reais de `admin`, `coordenacao`, `equipe` e `anon`.
- O maior gargalo restante não é ausência de módulo, e sim validação operacional contínua com uso real e refinamento de experiência.

### Visual / UX

- O shell, dashboard, mapa, memória, lote de escutas, dossiê e devolutiva já receberam uma passada de modernização.
- Ainda existem telas herdadas ou parcialmente atualizadas que merecem mais uma rodada para uniformidade.

## 3. Panorama funcional do sistema

### 3.1 Autenticação e acesso

Estado: implementado

- Login por e-mail/senha em [app/login/page.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/app/login/page.tsx:1)
- Login com Google disponível na mesma tela
- Middleware protege rotas internas e redireciona usuários não autenticados
- Perfis suportados:
  - `admin`
  - `coordenacao`
  - `equipe`
- Fluxo de “aguardando liberação” existe para perfis sem papel válido

### 3.2 Escutas

Estado: implementado

- Cadastro individual
- Digitação em lote
- Revisão territorial
- Sugestão e governança de falas candidatas ao público
- Bloqueios de privacidade e de aprovação por papel
- Separação entre fala original, resumo de equipe, temas e priorização

Rotas relevantes:

- `/escutas`
- `/escutas/nova`
- `/escutas/lote`
- `/escutas/[id]`
- `/escutas/falas`
- `/escutas/falas/[id]`
- `/escutas/revisao-territorial`

### 3.3 Ações

Estado: implementado

- Listagem e cadastro de ações
- Detalhe de ação com vínculos com memória e agenda
- Dossiê técnico
- Devolutiva pública/técnica
- Modo piloto vinculado à ação

Rotas relevantes:

- `/acoes`
- `/acoes/nova`
- `/acoes/[id]`
- `/acoes/[id]/dossie`
- `/acoes/[id]/devolutiva`
- `/acoes/[id]/piloto`

### 3.4 Memória do projeto

Estado: implementado, com correção funcional recente em PDFs

- Dashboard de relatórios semanais
- Criação manual de relatório
- Importação de DOCX/PDF
- Revisão por coordenação/admin
- Geração de entradas de memória a partir de relatório aprovado
- Curadoria e painel de importações

Rotas relevantes:

- `/memoria`
- `/memoria/novo`
- `/memoria/[id]`
- `/memoria/entradas/[id]`
- `/memoria/importacoes`
- `/memoria/curadoria`

Situação recente:

- A extração de PDF estava quebrando por uso antigo da lib `pdf-parse`
- Isso foi corrigido em [lib/report-extraction.ts](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/lib/report-extraction.ts:1)
- Teste adicionado em [tests/report-extraction.test.ts](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/tests/report-extraction.test.ts:1)
- PDFs textuais agora entram como rascunho extraído, em vez de falha técnica

### 3.5 Agenda interna

Estado: implementado

- Agenda da equipe
- Eventos por tipo operacional
- Participantes e presença
- Base de sincronização com Google Calendar
- Regras de permissão para coordenação/admin

Rotas relevantes:

- `/agenda`
- `/agenda/novo`
- `/agenda/[id]`
- `/agenda/google/status`

### 3.6 Territórios, mapa e lugares

Estado: implementado

- Lista territorial
- Mapa/listagem interna
- Painéis de qualidade e homologação
- Normalização e gestão de lugares mencionados
- Base de bairros oficiais aplicada por seed/migrations

Rotas relevantes:

- `/mapa`
- `/mapa/interno`
- `/territorios`
- `/territorios/qualidade`
- `/territorios/normalizacao/qualidade`
- `/territorios/lugares`
- `/territorios/mapa/homologacao`

### 3.7 Transparência e leitura coletiva

Estado: implementado

- Snapshots públicos
- Preview de transparência
- Homologação editorial
- API pública para Transparência Viva
- Regras de sanitização e auditoria

Rotas relevantes:

- `/transparencia/snapshots`
- `/transparencia/snapshots/[id]`
- `/transparencia/preview`
- `/transparencia/homologacao`
- `/transparencia/homologacao/[id]`
- `/transparencia/homologacao/[id]/preview`
- `/publico/transparencia-viva`

### 3.8 Outras áreas já existentes

- `/relatorios`
- `/relatorios/novo`
- `/relatorios/[mes]`
- `/leituras`
- `/pos-banca`
- `/avisos`
- `/avisos/preferencias`
- `/equipe`
- `/ajuda`

## 4. Dimensão técnica da base

### 4.1 Estrutura de rotas e APIs

O projeto possui atualmente `61` entradas em `app/` entre páginas e rotas de API.

APIs relevantes já presentes:

- `/api/memoria/process-report`
- `/api/public/transparencia-viva`
- `/api/transparencia/snapshots/from-leituras`
- `/api/gerar-sintese`
- `/api/google-calendar/connection`
- `/api/google-calendar/sync-event`
- `/api/google-calendar/event-invite-policy`
- `/api/avisos/atualizar`

### 4.2 Banco e migrations

A base local contém `40` migrations versionadas em `supabase/migrations`, cobrindo:

- schema core;
- evolução de ações e escutas;
- normalização territorial;
- snapshots de transparência;
- auditoria editorial;
- memória do projeto;
- agenda e Google Calendar;
- notificações internas;
- qualidade de extração de relatórios.

Isso indica que o projeto já possui histórico de evolução consistente, e não apenas tabelas ad hoc.

### 4.3 Dependências e stack

Dependências principais em [package.json](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/package.json:1):

- `next`
- `react`
- `@supabase/ssr`
- `@supabase/supabase-js`
- `ai`
- `@ai-sdk/openai`
- `mammoth`
- `pdf-parse`

Leitura:

- o projeto combina CRUD operacional tradicional com recursos editoriais e assistidos por IA;
- a parte de extração documental já está incorporada como capacidade nativa do módulo de memória.

## 5. Segurança e governança

Estado: estruturalmente forte para o estágio atual

Pontos positivos:

- RLS faz parte do desenho, não um adendo posterior
- storage privado existe para anexos sensíveis
- módulos públicos e internos estão separados
- há trilha de auditoria em partes sensíveis
- governança editorial aparece em falas, dossiês, homologações e memória

Limites atuais:

- a governança depende de disciplina operacional para revisão humana;
- parte do aceite por papel real ainda é documentado como checklist e precisa de uso recorrente para consolidar confiança plena;
- alguns relatórios antigos ainda registram pendências operacionais, mesmo com base técnica aprovada.

## 6. Qualidade e validação técnica

### 6.1 Build e checks

Validações recentes executadas neste workspace:

- `npm run build`: passou
- `npx vitest run tests/report-extraction.test.ts`: passou
- `npx vitest run tests/transparencia`: passou

### 6.2 Suite de testes

Hoje há `5` arquivos de teste versionados:

- `tests/report-extraction.test.ts`
- `tests/transparencia/comments-and-signature-rules.test.ts`
- `tests/transparencia/privacy-detector.test.ts`
- `tests/transparencia/public-api-route.test.ts`
- `tests/transparencia/public-page-privacy.test.ts`

Leitura:

- a suíte cobre bem regras de transparência e privacidade pública;
- a cobertura automatizada ainda é pequena frente ao tamanho do sistema;
- áreas como memória, agenda, ações e escutas ainda dependem mais de validação funcional/manual do que de testes automatizados robustos.

### 6.3 Aceite operacional

O ciclo 072 deixou documentação forte para fechamento presencial assistido:

- [reports/sumario-tijolo-072.md](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/reports/sumario-tijolo-072.md:1)
- [reports/estado-da-nacao-semear-territorios-072.md](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/reports/estado-da-nacao-semear-territorios-072.md:1)

Leitura objetiva:

- a base técnica foi tratada como pronta para execução assistida;
- o projeto já saiu da fase de “construir módulo” para “validar uso real por papel”.

## 7. Estado visual e UX

Estado: melhorando, ainda em consolidação

O relatório anterior focava quase só nessa dimensão. O retrato mais completo é:

- o redesign recente melhorou muito a aparência do shell e das telas centrais;
- o projeto deixou de parecer apenas um formulário administrativo cru;
- ainda existe heterogeneidade entre telas novas, telas redesenhadas e telas herdadas.

Arquivos atualmente modificados no workspace indicam que essa frente continua em andamento:

- [app/globals.css](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/app/globals.css:1)
- [components/dashboard.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/dashboard.tsx:1)
- [components/layout/semear-app-shell.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/layout/semear-app-shell.tsx:1)
- [components/ui/semear-primitives.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/ui/semear-primitives.tsx:1)
- [components/mapa/territorial-listening-map.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/mapa/territorial-listening-map.tsx:1)
- [components/listening-records/listening-record-batch-form.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/listening-records/listening-record-batch-form.tsx:1)
- [components/memory/project-memory-dashboard.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/memory/project-memory-dashboard.tsx:1)
- [components/actions/action-dossier-page.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/actions/action-dossier-page.tsx:1)
- [components/actions/action-debrief-page.tsx](/abs/path/C:/Projetos/SEMEAR%20TERRITORIOS/components/actions/action-debrief-page.tsx:1)

Isso é positivo como direção, mas hoje significa que o visual ainda não deve ser considerado “congelado”.

## 8. Estado do workspace local

Estado: funcional, porém sujo

No momento desta análise, o worktree local tem mudanças não commitadas relacionadas principalmente à frente visual e documentação do redesign.

Isso significa:

- a base principal em `main` está utilizável;
- há trabalho em andamento localmente que ainda não foi fechado em commit;
- qualquer novo trabalho deve tomar cuidado para não misturar:
  - correções funcionais urgentes;
  - redesign visual parcial;
  - documentação de estado.

## 9. Principais avanços recentes

### 9.1 Fechamento técnico do tijolo 072

- base de perfis, vínculos e cenários documentada;
- projeto preparado para execução presencial assistida;
- build e testes técnicos aprovados à época e compatíveis com o estado atual da base.

### 9.2 Redesign visual 070

- melhoria perceptível nas rotas críticas;
- base de primitives e shell mais coerente;
- redução de peso visual em memória, dashboard, mapa e telas de ação.

### 9.3 Correção da extração de PDFs

- integração atualizada da lib `pdf-parse`;
- PDFs textuais deixam de cair em falha técnica;
- teste automatizado adicionado;
- validação funcional recente com usuário real confirmou `extracted_draft` em vez de `extraction_failed`.

## 10. Riscos e fragilidades atuais

### Risco 1 — Cobertura de testes ainda pequena

Impacto:

- regressões em fluxos operacionais podem escapar sem cobertura automática.

### Risco 2 — Redesign em andamento no mesmo workspace

Impacto:

- chance de misturar mudanças de visual com correções funcionais e gerar commits pouco cirúrgicos.

### Risco 3 — Dependência de revisão humana em conteúdo sensível

Impacto:

- a segurança editorial do produto depende tanto das regras quanto da disciplina de uso.

### Risco 4 — Algumas áreas ainda parecem “segunda passada”

Impacto:

- inconsistência de UX entre módulos pode aumentar atrito de adoção.

### Risco 5 — Teste operacional recorrente ainda precisa amadurecer

Impacto:

- o projeto está tecnicamente pronto, mas confiança operacional plena só vem com repetição de uso real.

## 11. O que está pronto, o que está maduro e o que ainda está em aberto

### Pronto

- autenticação e perfis;
- escutas;
- ações;
- memória com upload e extração;
- agenda base;
- territorialização;
- transparência pública controlada;
- build e suíte principal atual passando.

### Maduro

- estrutura de banco e migrations;
- separação entre módulos internos e públicos;
- base de RLS e storage privado;
- documentação técnica por entregas/tijolos;
- fluxo técnico de transparência.

### Em aberto

- consolidação visual final;
- ampliação de testes automatizados fora de transparência;
- validação operacional recorrente com uso real;
- acabamento de módulos ainda heterogêneos como `/relatorios` e `/pos-banca`.

## 12. Recomendações objetivas

### Curto prazo

- fechar e commitar a frente visual em andamento separadamente;
- ampliar cobertura automatizada para memória e permissões críticas;
- executar mais uma rodada de validação funcional autenticada em rotas protegidas.

### Médio prazo

- consolidar a UX das telas herdadas;
- transformar parte dos checklists operacionais em smoke tests reproduzíveis;
- reduzir dependência de validação manual para comportamentos básicos de permissão e importação.

### Gestão

- manter relatórios de estado como este focados em “estado do código + estado operacional”, e não apenas em uma frente visual específica.

## 13. Conclusão

O SEMEAR Territórios já é uma aplicação interna multifluxo relativamente robusta, com base técnica séria e modelagem coerente para operação social sensível. O sistema não está mais no estágio de MVP cru. Ele já possui:

- governança;
- rastreabilidade;
- módulos conectados;
- controles de privacidade;
- trilha clara de evolução.

O estado atual é de **projeto funcional e tecnicamente consistente, em fase de consolidação operacional e refinamento de experiência**. O próximo salto de qualidade não depende de inventar novos módulos centrais, e sim de:

- consolidar visual;
- ampliar testes;
- validar uso real de forma contínua;
- manter disciplina de separação entre mudanças de UX, regra de negócio e documentação.
