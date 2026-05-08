# Estado da Nação — SEMEAR Territórios 051

## Tijolo 051

**Tema:** Relatórios Semanais da Equipe e Memória do Projeto

**Objetivo:** criar um módulo interno para registro semanal da equipe, anexos privados, revisão por coordenação e consolidação de memória institucional conectada a ações e relatórios do sistema.

## Diagnóstico inicial

O diagnóstico mostrou uma lacuna operacional entre o trabalho semanal da equipe e os módulos já existentes do sistema.

Problemas identificados antes das mudanças:
- não havia módulo próprio para registrar relatórios semanais internos da equipe;
- não existia fluxo de revisão de coordenação para esse tipo de registro;
- não havia bucket privado nem padrão de anexos temporários para memória interna;
- aprendizados, problemas e encaminhamentos ficavam dispersos e sem linha do tempo institucional;
- a área de relatórios mensais não aproveitava insumos semanais internos;
- ações individuais não exibiam memória associada nem anexos relacionados;
- a ajuda operacional não orientava esse novo fluxo;
- o frontend já seguia padrão client-side com Supabase + RLS, então a solução precisava respeitar esse modelo sem `service_role`.

## Tabelas criadas

Migração criada em `supabase/migrations/20260507120000_create_project_memory_weekly_reports.sql`.

Tabelas novas:
- `weekly_team_reports`
- `weekly_team_report_actions`
- `weekly_team_report_neighborhoods`
- `weekly_team_report_attachments`
- `project_memory_entries`

Estrutura funcional criada:
- relatório semanal com semana inicial/final, responsável, conteúdo, status e revisão;
- vínculo N:N entre relatório e ações;
- vínculo N:N entre relatório e territórios;
- anexos privados por relatório;
- entradas curadas de memória, com tipo e visibilidade.

Também foram adicionadas tipagens em `lib/database.types.ts` para suportar todo o novo schema no frontend.

## Storage e bucket

Bucket privado documentado e criado na migração:
- `project-memory-documents`

Características adotadas:
- bucket não público;
- limite padrão de 10 MB por arquivo;
- MIME types explícitos para documentos, planilhas, imagens e texto;
- upload via cliente autenticado com RLS;
- download apenas por link assinado temporário gerado sob demanda.

No frontend, o fluxo foi implementado em `components/memory/project-memory-report-workspace.tsx`, com validação por extensão, MIME type, tamanho e sanitização de nome de arquivo em `lib/project-memory.ts`.

## Rotas criadas

Novas rotas do módulo:
- `app/memoria/page.tsx`
- `app/memoria/novo/page.tsx`
- `app/memoria/[id]/page.tsx`

Cobertura funcional:
- `/memoria`: dashboard com filtros, métricas, acompanhamento semanal e linha do tempo;
- `/memoria/novo`: criação de relatório semanal;
- `/memoria/[id]`: edição, revisão, anexos e geração de memória a partir do relatório.

A navegação principal também ganhou entrada para `Memória` em `lib/semear-data.ts`.

## Upload implementado

Upload implementado no workspace do relatório semanal com as seguintes regras:
- arquivo só pode subir depois de o relatório existir;
- caminho no storage segue o padrão `${reportId}/${timestamp}-${safeFileName}`;
- validação client-side antes do envio;
- registro do anexo em `weekly_team_report_attachments` após upload bem-sucedido;
- download via `createSignedUrl(..., 60)`;
- anexos não são expostos publicamente em nenhuma tela.

## Regras de RLS

A migração criou helpers e políticas para separar leitura, edição e revisão:
- `public.is_weekly_team_report_owner(report_id uuid)`
- `public.can_read_weekly_team_report(report_id uuid)`
- `public.can_edit_weekly_team_report(report_id uuid)`

Regras principais implementadas:
- equipe lê apenas os próprios relatórios;
- coordenação e admin leem todos os relatórios;
- equipe cria apenas o próprio relatório, com `profile_id` e `team_member_id` coerentes;
- equipe só edita relatório em `draft` ou `needs_changes`, sem revisão preenchida;
- coordenação e admin revisam, aprovam, pedem ajustes ou arquivam;
- anexos obedecem ao mesmo escopo do relatório;
- memória do projeto é interna por padrão;
- apenas coordenação/admin podem trabalhar com visibilidades públicas;
- políticas de `storage.objects` seguem o `report_id` extraído da pasta do arquivo.

## Integração com equipe

Integração com equipe realizada em dois níveis:
- o acesso ao módulo depende do vínculo do usuário com `team_members.profile_id` quando o papel é `equipe`;
- o dashboard mostra, para coordenação/admin, quem já enviou e quem ainda falta por semana.

Também foi reforçada a navegação da equipe:
- a entrada `/equipe` já havia sido adicionada ao menu principal;
- o card de rodapé “Equipe Semear” foi tornado clicável em `components/layout/semear-app-shell.tsx`.

## Integração com ações

A tela de detalhe da ação agora cruza o módulo de memória:
- lista relatórios semanais vinculados à ação;
- mostra anexos relacionados de forma indireta e segura;
- mostra entradas de memória associadas à ação;
- oferece atalho para abrir o módulo `/memoria`.

Essas integrações foram implementadas em `components/actions/action-detail.tsx`.

## Integração com relatórios

A central de relatórios mensais agora usa relatórios semanais como base complementar:
- total de relatórios do período;
- total aprovados;
- total pendentes;
- destaques de aprendizados;
- destaques de problemas;
- destaques de encaminhamentos.

Essas leituras foram integradas em `components/reports/monthly-reports-hub.tsx` usando `extractHighlights` de `lib/project-memory.ts`.

## Linha do tempo da memória

A linha do tempo foi implementada em `components/memory/project-memory-dashboard.tsx` e no workspace do relatório.

Capacidades entregues:
- entradas por tipo: atividade, decisão, aprendizado, problema, encaminhamento, marco e outro;
- vínculo opcional com ação;
- origem rastreável ao relatório semanal aprovado;
- filtro por tipo, semana, ação e território;
- leitura consolidada no dashboard interno.

## Garantias de privacidade

As garantias de privacidade adotadas neste tijolo foram:
- bucket privado, sem URL pública;
- link de download temporário e sob demanda;
- nenhuma exposição pública de anexos;
- memória nasce como interna;
- somente coordenação/admin podem mover conteúdo para estados públicos;
- textos de ajuda e telas reforçam que não devem ser incluídos CPF, telefone, endereço pessoal ou dado sensível desnecessário;
- nenhuma dependência de `service_role` no frontend;
- leitura e escrita dependem de autenticação e RLS.

## Validação executada

Validação concluída localmente:
- `npm run lint`: OK
- `npm run build`: OK
- `npm run verify`: OK

Durante o build surgiram dois erros locais de tipagem, ambos corrigidos antes da validação final:
- cast de join em `components/actions/action-detail.tsx`;
- tipo do payload de update em `components/memory/project-memory-report-workspace.tsx`.

## Riscos restantes

Riscos e pendências ainda abertos:
- a migração foi criada, mas ainda não foi aplicada no banco remoto neste fluxo;
- a experiência real com upload e download assinado ainda depende de validação com sessão autenticada e storage remoto ativo;
- não houve teste manual end-to-end com múltiplos perfis reais (`equipe`, `coordenacao`, `admin`) no ambiente autenticado;
- a curadoria de entradas de memória pode exigir regra editorial adicional para evitar duplicação excessiva;
- ainda não existe síntese pública automatizada a partir das entradas marcadas como candidatas ao público.

## Próximo tijolo recomendado

**Tijolo 052 — Aplicação remota da migração + validação operacional por perfil**

Objetivo sugerido:
- aplicar a migração no Supabase remoto;
- testar upload/download com perfis reais;
- validar RLS com casos positivos e negativos;
- revisar ergonomia mobile do módulo `/memoria` em uso real;
- definir fluxo posterior para transformar memória curada em insumo de transparência pública controlada.
