import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, BarChart3, CalendarDays, ClipboardList, FileText, Keyboard, MapPinned, ShieldCheck, UsersRound, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const steps = [
  "Cadastrar ação",
  "Digitar fichas",
  "Revisar escutas",
  "Gerar devolutiva",
  "Fechar dossiê",
  "Conferir relatório mensal"
];

const realDataChecklist = [
  "migrations aplicadas",
  "usuários criados",
  "papéis admin, coordenação e equipe definidos",
  "bairros carregados",
  "seed demo removido/não usado em produção",
  "teste de digitação feito",
  "teste de revisão feito",
  "teste de impressão feito",
  "decisão GO registrada"
];

const beforeNextStep = [
  "preencher relatório pós-banca",
  "conferir escutas revisadas",
  "aprovar devolutiva",
  "fechar dossiê",
  "conferir relatório mensal",
  "registrar decisão pós-banca"
];

const afterBancaSteps = [
  "digitar fichas",
  "revisar escutas",
  "gerar devolutiva",
  "aprovar devolutiva",
  "fechar dossiê",
  "revisar lugares e normalizar nomes",
  "abrir /pos-banca",
  "copiar decisão pós-banca",
  "decidir próximo tijolo"
];

const beforeMapSteps = [
  "revisar escutas",
  "revisar território",
  "estruturar lugares",
  "normalizar lugares",
  "verificar /territorios/qualidade",
  "verificar /territorios/normalizacao/qualidade",
  "preencher decisão do mapa interno",
  "só então autorizar Tijolo de mapa"
];

const mapHomologationSteps = [
  "revisar escutas",
  "revisar território",
  "normalizar lugares",
  "verificar qualidade territorial",
  "verificar qualidade da normalização",
  "validar RLS manualmente no banco aplicado",
  "preencher docs/decisao-mapa-interno.md",
  "preencher docs/homologacao-mapa-interno.md",
  "abrir /territorios/mapa/homologacao",
  "somente então autorizar o protótipo"
];

const internalMapGateSteps = [
  "abrir /mapa/interno",
  "confirmar se há homologação persistente aprovada",
  "confirmar decisão go_prototipo_interno",
  "se estiver bloqueado, voltar para /territorios/mapa/homologacao",
  "se estiver autorizado, anexar a decisão persistente ao planejamento do protótipo"
];

const unlockInternalMapSteps = [
  "finalizar escutas e revisões",
  "normalizar lugares",
  "checar qualidade territorial",
  "checar qualidade da normalização",
  "rodar teste manual de RLS",
  "preencher evidências",
  "criar/atualizar homologação persistente",
  "aprovar apenas se todos os critérios forem cumpridos",
  "voltar a /mapa/interno",
  "só pedir Tijolo de mapa se aparecer Autorizado para protótipo"
];

const firstRealActionReady = [
  "banco remoto estabilizado",
  "usuários criados",
  "papéis testados",
  "lista de territórios validada ou provisória aprovada",
  "primeira ação cadastrada",
  "fichas impressas/preparadas",
  "equipe orientada sobre privacidade",
  "fluxo de digitação em lote revisado"
];

const officialNeighborhoodChecklist = [
  "lista oficial aplicada no banco remoto/homologação",
  "52 bairros oficiais validados",
  "setores preservados em campo próprio",
  "códigos oficiais de 1 a 52 preservados",
  "bairros usados como agregação territorial",
  "sem endereço pessoal",
  "Jardim Suiça e Santa Inez seguem com grafia pendente registrada"
];

const firstRealActionChecklist = [
  "ação cadastrada com tipo banca_escuta",
  "bairro oficial selecionado",
  "local coletivo informado (não residência)",
  "fichas de papel numeradas",
  "equipe orientada sobre privacidade",
  "fichas digitadas em /escutas/lote como rascunho",
  "escutas revisadas em /escutas/revisao-territorial",
  "devolutiva gerada e aprovada",
  "dossiê fechado",
  "relatório mensal conferido em /relatorios",
  "relatório pós-banca preenchido",
  "decisão pós-banca registrada"
];

const googleLoginChecklist = [
  "Entrar com Google confirma identidade, mas não libera acesso automático.",
  "A coordenação precisa definir seu papel em profiles: admin, coordenacao ou equipe.",
  "Sem perfil autorizado, a tela exibida será aguardando liberação.",
  "Não é necessário criar senha para usar o login com Google."
];

export default function AjudaPage() {
  return (
    <AppShell activeHref="/ajuda">
      <section className="pb-10">
        <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Operação interna</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Ajuda e operação</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
            Guia rápido para rodar a primeira Banca de Escuta no SEMEAR Territórios sem expor dados pessoais e mantendo revisão humana.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <QuickLink href="/escutas/lote" icon={<Keyboard className="h-5 w-5" />} title="Digitar fichas" text="Modo lote para cadastrar fichas da banca como rascunho." />
          <QuickLink href="/acoes" icon={<ClipboardList className="h-5 w-5" />} title="Ações" text="Cadastrar ação, abrir piloto, devolutiva e dossiê." />
          <QuickLink href="/agenda" icon={<CalendarDays className="h-5 w-5" />} title="Agenda da Equipe" text="Organizar ações de campo, reuniões, prazos e presença interna." />
          <QuickLink href="/equipe" icon={<UsersRound className="h-5 w-5" />} title="Equipe" text="Cadastrar membros operacionais, entrevistadores e participantes." />
          <QuickLink href="/memoria" icon={<FileText className="h-5 w-5" />} title="Memória do Projeto" text="Enviar relatórios semanais, anexar documentos e consolidar memória interna." />
          <QuickLink href="/pos-banca" icon={<FileText className="h-5 w-5" />} title="Pós-banca" text="Consolidar resultados, ver decisão e copiar relatório pós-banca." />
          <QuickLink href="/relatorios" icon={<FileText className="h-5 w-5" />} title="Relatórios" text="Conferir leitura mensal e alertas de dossiê." />
          <QuickLink href="/avisos?onboarding=true" icon={<AlertTriangle className="h-5 w-5" />} title="Central de Avisos" text="Acompanhar pendências internas, lembretes e onboarding operacional." />
          <QuickLink href="/territorios/lugares" icon={<MapPinned className="h-5 w-5" />} title="Normalizar lugares" text="Padronizar lugares citados e marcar visibilidade antes do mapa." />
          <QuickLink href="/territorios/qualidade" icon={<ShieldCheck className="h-5 w-5" />} title="Qualidade territorial" text="Conferir bairros prontos, em revisão ou bloqueados por sensível." />
          <QuickLink href="/escutas/revisao-territorial" icon={<MapPinned className="h-5 w-5" />} title="Revisão territorial" text="Revisar lugares livres, estruturados e status territorial por escuta." />
          <QuickLink href="/territorios/normalizacao/qualidade" icon={<ShieldCheck className="h-5 w-5" />} title="Qualidade da normalização" text="Detectar duplicidades, ambiguidade e sensíveis antes do mapa." />
          <QuickLink href="/mapa/interno" icon={<MapPinned className="h-5 w-5" />} title="Portão do mapa" text="Verificar se o protótipo interno está liberado pela homologação persistente." />
          <QuickLink href="/transparencia/snapshots" icon={<ShieldCheck className="h-5 w-5" />} title="Transparência Viva" text="Gerar snapshots agregados para futura camada pública." />
          <QuickLink href="/transparencia/homologacao" icon={<ShieldCheck className="h-5 w-5" />} title="Homologação institucional" text="Congelar versão, assinar internamente e preparar integração pública segura." />
        </div>

        <Panel className="mt-6" icon={<Sparkles className="h-5 w-5" />} title="Primeiros passos no SEMEAR">
          <div className="space-y-4 text-sm leading-6 text-stone-700">
            <p>Se você acabou de chegar na equipe operacional, siga este roteiro básico para se orientar no sistema:</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OnboardingStep 
                title="1. Completar Perfil" 
                text="Acesse o sistema com seu e-mail Google e aguarde a coordenação definir seu papel (equipe, coordenação ou admin)." 
              />
              <OnboardingStep 
                title="2. Conhecer a Equipe" 
                text="Verifique se você está cadastrado em /equipe para que suas atividades sejam rastreadas corretamente." 
              />
              <OnboardingStep 
                title="3. Abrir a Agenda" 
                text="Veja as ações de campo e reuniões previstas em /agenda. Você pode ser convidado para eventos específicos." 
              />
              <OnboardingStep 
                title="4. Entender Avisos" 
                text="A Central de Avisos (/avisos) é sua rotina diária. Ela mostra o que você precisa fazer hoje e o que está atrasado." 
              />
              <OnboardingStep 
                title="5. Privacidade Primeiro" 
                text="Leia as orientações de privacidade. Nunca colete dados pessoais como CPF, telefone ou endereço nas escutas." 
              />
              <OnboardingStep 
                title="6. Registro de Atividade" 
                text="Ao fim da semana, envie seu relatório em /memoria para manter a história do projeto viva e transparente." 
              />
            </div>
            <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900 text-xs italic">
              <strong>Dica:</strong> No Dashboard, novos membros visualizam um checklist interativo. Você pode reabri-lo a qualquer momento em /avisos?onboarding=true.
            </p>
          </div>
        </Panel>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <Panel icon={<ClipboardList className="h-5 w-5" />} title="Checklist resumido da primeira banca">
            <ol className="space-y-3 text-sm leading-6 text-stone-700">
              {steps.map((step, index) => (
                <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3" key={step}>
                  <strong className="text-semear-green">{index + 1}. </strong>{step}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel icon={<AlertTriangle className="h-5 w-5" />} title="Privacidade">
            <div className="space-y-3 text-sm leading-6 text-stone-700">
              <p>Não registre CPF, telefone, endereço pessoal, e-mail ou nome completo de pessoa escutada.</p>
              <p>Fala original completa é material interno de revisão. Devolutiva e dossiê impresso usam sínteses agregadas.</p>
              <p>Se aparecer alerta de possível dado sensível, revise antes de aprovar devolutiva ou fechar dossiê.</p>
            </div>
          </Panel>

          <Panel icon={<ClipboardList className="h-5 w-5" />} title="Ocupação / atividade principal">
            <div className="space-y-3 text-sm leading-6 text-stone-700">
              <p>Campo opcional para entender a diversidade das pessoas escutadas por perfil ocupacional.</p>
              <p>Registre de forma geral: estudante, aposentado(a), autônomo(a), comerciante, trabalhador(a) da indústria, trabalho doméstico/cuidados, etc.</p>
              <p>Não registre nome da empresa, escola, setor específico, local de trabalho ou qualquer dado que identifique a pessoa.</p>
              <p>Ocupações raras ou muito específicas devem ser revisadas antes de entrar em devolutiva pública.</p>
            </div>
          </Panel>

          <Panel icon={<UsersRound className="h-5 w-5" />} title="Equipe, entrevistadores e participantes">
            <div className="space-y-3 text-sm leading-6 text-stone-700">
              <p><strong>Cadastro operacional ≠ acesso ao sistema.</strong> O módulo Equipe (<code>/equipe</code>) registra quem participa de ações e escutas — mas não concede login. Acesso é controlado por <em>profiles</em> e pelo fluxo de liberação de usuário Google.</p>
              <p>Uma pessoa pode ter cadastro operacional (<em>team_members</em>) sem nunca fazer login, e vice-versa. Os dois cadastros são independentes.</p>
              <p>Em escutas, selecione o entrevistador no cadastro da equipe para padronizar nomes nos relatórios internos. O campo de texto livre (<em>interviewer_name</em>) permanece como fallback para registros legados.</p>
              <p>Em ações, vincule os participantes e informe a responsabilidade de cada pessoa para melhorar a rastreabilidade do dossiê.</p>
              <p>Para devolutiva pública, nunca exponha nomes individuais, e-mails ou responsabilidades. Use linguagem agregada como &quot;Equipe SEMEAR&quot;.</p>
            </div>
          </Panel>
        </div>

        <Panel className="mt-6" icon={<MapPinned className="h-5 w-5" />} title="Território da ação × território de referência do entrevistado">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>Território da ação</strong> é onde a banca aconteceu — o bairro onde a equipe esteve. Sempre obrigatório ao cadastrar uma escuta.</p>
            <p><strong>Território de referência do entrevistado</strong> é de onde a pessoa fala, ou seja, onde ela mora, trabalha, estuda ou circula. É um campo opcional, preenchido apenas se a pessoa mencionar ou aceitar compartilhar.</p>
            <p>Esses dois campos podem ser iguais ou diferentes. Uma pessoa que mora em outro bairro pode participar de uma banca no centro, por exemplo.</p>
            <p>O campo de referência serve para entender a diversidade territorial das pessoas escutadas, sem restringir a análise ao local da banca.</p>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"><strong>Atenção:</strong> nunca registre rua, número, CEP ou coordenada geográfica. Use sempre o bairro oficial — o menor nível de agregação permitido.</p>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<UsersRound className="h-5 w-5" />} title="Papéis no sistema">
          <div className="grid gap-3 md:grid-cols-3">
            <Role title="Admin" text="Administra cadastros, aprova devolutivas, fecha e reabre dossiês." />
            <Role title="Coordenação" text="Revisa decisões institucionais, aprova devolutivas e pode marcar suficiência." />
            <Role title="Equipe" text="Cadastra ações e escutas, revisa dados e prepara rascunhos." />
          </div>
        </Panel>

        <Panel className="mt-6" icon={<FileText className="h-5 w-5" />} title="Relatórios semanais e memória do projeto">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>Quem deve enviar:</strong> membros da equipe com perfil vinculado em <em>team_members</em>. A coordenação também pode registrar relatório em nome de alguém quando necessário.</p>
            <p><strong>Quando enviar:</strong> ao fim de cada semana de trabalho territorial, preferencialmente antes da revisão da coordenação e do fechamento do mês.</p>
            <p><strong>O que escrever:</strong> resumo da semana, atividades realizadas, territórios envolvidos, problemas, aprendizados, pendências e próximos passos.</p>
            <p><strong>O que não escrever:</strong> CPF, telefone, endereço pessoal, nome completo de entrevistado, dado sensível desnecessário ou conteúdo que não deva circular internamente.</p>
            <p><strong>Como anexar:</strong> use apenas documentos úteis para memória e prestação de contas. Os arquivos sobem para bucket privado e só geram link temporário dentro do sistema.</p>
            <p><strong>Como a coordenação revisa:</strong> em <strong>/memoria</strong> e <strong>/memoria/[id]</strong>, mudando status para revisão, aprovação, pedido de ajustes ou arquivamento.</p>
            <p><strong>Como vira memória do projeto:</strong> relatórios aprovados podem gerar entradas internas de atividade, decisão, aprendizado, problema, encaminhamento ou marco. Só coordenação/admin pode marcar algo como candidato ao público.</p>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<CalendarDays className="h-5 w-5" />} title="Agenda da Equipe">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>O que é:</strong> a agenda interna organiza ações de campo, bancas de escuta, reuniões, prazos, devolutivas, dossiês e tarefas de memória da equipe.</p>
            <p><strong>Horários estruturados:</strong> ações agora podem registrar `starts_at`, `ends_at` e `all_day`. Se a atividade ainda não tiver horário fechado, mantenha como dia inteiro ou pendente.</p>
            <p><strong>Ação x evento:</strong> a ação é o registro territorial principal; o evento da agenda é a camada operacional de organização, presença e lembretes.</p>
            <p><strong>O que ainda não é:</strong> não é página pública, não envia push, não manda e-mail próprio e não publica nada externamente.</p>
            <p><strong>Presença:</strong> marcar presença ajuda a memória do projeto e a prestação interna. Não é folha de ponto.</p>
            <p><strong>Privacidade:</strong> não incluir dados pessoais de entrevistados, endereços pessoais, telefones, CPF ou qualquer identificador sensível.</p>
            <p><strong>Memória:</strong> eventos concluídos podem virar relatório semanal vinculado e entrada de memória do projeto, sempre com confirmação humana.</p>
            <p><strong>Geração assistida:</strong> em `/acoes/[id]` é possível sugerir agenda para devolutiva, fechamento do dossiê e revisão das escutas. Em `/memoria` e `/relatorios`, também é possível sugerir prazo para entrega dos relatórios semanais.</p>
            <p><strong>Google Calendar:</strong> nesta versão a sincronização é manual, auditável e restrita a coordenação/admin. O SEMEAR segue como fonte principal e o Google funciona apenas como espelho operacional.</p>
            <p><strong>Autenticação:</strong> o evento pode ser sincronizado por service account institucional ou por conexão OAuth manual da coordenação/admin, sempre sem expor token no frontend.</p>
            <p><strong>Drift:</strong> se alguém alterar o evento direto no Google, essa mudança não volta automaticamente para o SEMEAR nesta versão.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/agenda">Abrir agenda</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/agenda/novo">Novo evento</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<CalendarDays className="h-5 w-5" />} title="Google Calendar">
          <div id="google-calendar-manual" />
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>Fonte principal:</strong> o SEMEAR continua sendo a referência oficial do evento. Google Calendar é apenas espelho operacional.</p>
            <p><strong>Quem sincroniza:</strong> apenas perfis `admin` e `coordenacao`, a partir de `/agenda/[id]`.</p>
            <p><strong>Quando usar sync:</strong> depois de revisar o evento no SEMEAR e confirmar que ele está pronto para virar lembrete operacional externo.</p>
            <p><strong>O que vai:</strong> resumo operacional, data, horário, território agregado e equipe quando houver e-mail cadastrado.</p>
            <p><strong>O que não vai:</strong> escutas, relatórios completos, anexos, fala original e qualquer dado sensível.</p>
            <p><strong>Status possíveis:</strong> Não sincronizado, Sincronizado, Erro de sincronização, Cancelado no Google e Desvinculado.</p>
            <p><strong>Convites:</strong> são opcionais, começam desativados e só podem ser ativados por `admin` ou `coordenacao` em um evento específico.</p>
            <p><strong>Quem pode ser convidado:</strong> apenas membros da equipe vinculados ao evento, ativos e com e-mail cadastrado. Entrevistados nunca entram em attendees.</p>
            <p><strong>Reconexão:</strong> se a conexão expirar ou for revogada, use `Reconectar Google Calendar` no próprio evento.</p>
            <p><strong>Em caso de sync_error:</strong> confira calendário institucional, conexão Google ativa, envs, API Google Calendar e permissões de compartilhamento; depois use `Tentar novamente`, `Reconectar` ou `Desvincular`, conforme a orientação da tela.</p>
            <p><strong>Permissão:</strong> a conta conectada precisa ter permissão de edição no calendário institucional compartilhado.</p>
            <p><strong>Importante:</strong> se alguém alterar o evento diretamente no Google, essa mudança não volta automaticamente para o SEMEAR nesta versão.</p>
            <p><strong>Painel de saúde:</strong> `/agenda/google/status` concentra conexão ativa, últimos erros, eventos com sync_error e itens com alterações locais pendentes.</p>
            <p><strong>Política atual:</strong> mesmo com `google_send_invites = true`, o SEMEAR mantém `sendUpdates=none`, sem envio de e-mail próprio.</p>
            <p><strong>Privacidade:</strong> nunca colocar dados sensíveis no evento interno pensando que eles serão filtrados depois. O cuidado começa no cadastro do evento.</p>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<AlertTriangle className="h-5 w-5" />} title="Central de Avisos">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>O que é:</strong> painel interno em <strong>/avisos</strong> para priorizar pendências operacionais sem usar push, e-mail ou webhook externo.</p>
            <p><strong>O que aparece:</strong> agenda hoje/amanhã/atrasada, sync_error e drift do Google, relatórios pendentes, devolutiva/dossiê pendentes, revisão de escutas e pendências de transparência.</p>
            <p><strong>Ações:</strong> marcar como lido, dispensar, arquivar e abrir origem da pendência.</p>
            <p><strong>Atualização manual:</strong> use o botão <strong>Atualizar avisos</strong> para recalcular sob demanda no servidor, sem cron externo.</p>
            <p><strong>Preferências:</strong> em <strong>/avisos/preferencias</strong> cada pessoa pode ligar/desligar categorias e ativar modo silencioso.</p>
            <p><strong>Modo silencioso:</strong> badges globais mostram só urgentes, mas os avisos continuam visíveis na central.</p>
            <p><strong>Privacidade:</strong> avisos nunca exibem fala original, CPF, telefone, endereço, anexos ou tokens.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/avisos">Abrir Central de Avisos</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/avisos/preferencias">Abrir preferências</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Curadoria da memória pública">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p><strong>Objetivo:</strong> transformar registros internos em conteúdo seguro para a Transparência Viva.</p>
            <p><strong>Onde fazer:</strong> no painel de <strong>/memoria/curadoria</strong>, exclusivo para coordenação e admin.</p>
            <p><strong>Detector de Riscos:</strong> o sistema analisa automaticamente o texto em busca de CPF, telefones e endereços. Riscos bloqueantes impedem a aprovação pública.</p>
            <p><strong>Checklist Obrigatório:</strong> toda memória pública deve passar por uma revisão humana manual confirmando a ausência de dados sensíveis e a adequação da linguagem.</p>
            <p><strong>Visibilidade:</strong> apenas entradas com status <strong>Aprovada Pública</strong> podem ser incluídas em snapshots de transparência e comunicações externas oficiais.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/memoria/curadoria">Abrir curadoria</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/docs/curadoria-memoria-publica.md">Ver governança completa</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<UsersRound className="h-5 w-5" />} title="Login com Google">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>O login com Google confirma a identidade, mas <strong>não libera acesso automático</strong>. Após autenticar, o sistema verifica se existe um papel (role) autorizado no perfil.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {googleLoginChecklist.map((item) => (
                <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <strong>Aguardando liberação?</strong> Um admin ou coordenador precisa definir seu papel na tabela <code className="rounded bg-amber-100 px-1 text-xs">profiles</code> com um dos valores: <code className="rounded bg-amber-100 px-1 text-xs">admin</code>, <code className="rounded bg-amber-100 px-1 text-xs">coordenacao</code> ou <code className="rounded bg-amber-100 px-1 text-xs">equipe</code>. Consulte o documento <strong>docs/liberacao-usuarios-google.md</strong> para o passo a passo.
            </div>
            <p className="text-xs text-stone-500">Para revogar acesso: basta apagar o valor do campo role (definir como null). O usuário será redirecionado para a tela de aguardando liberação na próxima sessão.</p>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<Keyboard className="h-5 w-5" />} title="Uso no celular">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>Use <strong>Digitar fichas</strong> como rota principal em campo. Antes de começar, selecione a ação e o entrevistador da sessão.</p>
            <p>Durante a banca, salve cada registro como rascunho e siga para a próxima ficha. A revisão pode ser feita depois, com mais calma, em <strong>/escutas</strong>.</p>
            <p>Se a conexão ou a tela estiverem ruins, priorize digitação, revisão rápida e pendências. Relatórios grandes, homologações e análises extensas funcionam melhor no desktop.</p>
            <p>Mesmo no celular, não registre CPF, telefone, endereço, e-mail, nome completo de pessoa escutada ou outro identificador pessoal.</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/escutas/lote">Abrir Digitar</Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/escutas?status=draft">Revisar rascunhos</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Antes de usar com dados reais">
          <div className="grid gap-3 md:grid-cols-3">
            {realDataChecklist.map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Arquivos de apoio: <strong>docs/go-no-go-primeira-banca.md</strong> e <strong>docs/registro-homologacao-primeira-banca.md</strong>.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Fluxo seguro">
          <p className="text-sm leading-6 text-stone-700">
            A versão oficial nasce de dados digitados e revisados pela equipe. A devolutiva e o dossiê são determinísticos, revisáveis e não usam IA como fonte oficial.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Transparência Viva">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>O público só pode ver snapshots aprovados e publicados. A página pública futura nunca deve ler escutas brutas diretamente.</p>
            <p>Dados brutos, fala original, entrevistadores, e-mails, CPF, telefone, endereço, rua, número, CEP e dado de saúde individual ficam internos.</p>
            <p>Devolutiva pública precisa ser revisada e aprovada antes de entrar em snapshot. O mapa público só pode ser agregado por território, sem ponto individual.</p>
            <p>Transparência não substitui cuidado com privacidade: recortes pequenos devem aparecer como dados insuficientes, e ocupações raras devem ser agrupadas.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/transparencia/snapshots">Abrir snapshots</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/preview">Preview interno</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Revisão de transparência pública">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>Snapshot nasce como rascunho. O público só vê `published`; antes disso, a peça é interna, editável e sujeita a revisão editorial.</p>
            <p>Antes de publicar, é obrigatório revisar o checklist de privacidade, conferir riscos no texto e validar a regra de amostra mínima por território.</p>
            <p>Snapshot público não substitui relatório interno, dossiê ou devolutiva operacional. Transparência Viva é devolutiva segura, não abertura do banco bruto.</p>
            <p>Se um snapshot publicado for editado, ele volta para revisão e precisa de nova validação antes de reaparecer como publicado.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/transparencia/snapshots">Lista de snapshots</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/preview">Abrir preview</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Auditoria da Transparência Viva">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>Toda publicação precisa deixar rastro. Versões editoriais registram mudanças de status, data, autor e motivo.</p>
            <p>Comentários críticos de privacidade, dados e metodologia devem ser resolvidos antes da publicação. Comentários de texto ficam sinalizados para decisão final da coordenação ou admin.</p>
            <p>O pacote de homologação serve para prestação institucional e não inclui fala original, escuta bruta, dado pessoal nem lugar sensível.</p>
            <p>O público só vê snapshot `published`. Todo o restante da auditoria permanece interno e autenticado.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/transparencia/snapshots">Abrir editorial</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/preview">Ver preview</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Pacote institucional da Transparência Viva">
          <div className="space-y-3 text-sm leading-6 text-stone-700">
            <p>Snapshot é a síntese pública; versão registra mudanças editoriais; comentários registram revisão; pacote congela uma versão para aprovação institucional.</p>
            <p>Só pacote assinado deve orientar integração pública futura. Antes disso, o material permanece interno, autenticado e revisável.</p>
            <p>O pacote institucional nunca inclui fala original, escuta bruta, entrevistador, e-mail, CPF, telefone, endereço, dado de saúde individual ou lugar sensível.</p>
            <p>Assinatura exige checklist multi-etapa completo, comentários críticos resolvidos e snapshot já aprovado ou publicado.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/transparencia/homologacao">Abrir homologação</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/snapshots">Abrir editor</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ClipboardList className="h-5 w-5" />} title="Antes de avançar">
          <div className="grid gap-3 md:grid-cols-3">
            {beforeNextStep.map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            O mapa geográfico só deve ser priorizado depois de dados revisados, devolutiva aprovada, dossiê fechado e decisão pós-banca registrada.
            Lugares citados precisam estar estruturados, normalizados e sem visibilidade sensível.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/acoes">Ações</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/escutas">Escutas</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/relatorios">Relatórios</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/lugares">Normalização</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/qualidade">Qualidade territorial</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<FileText className="h-5 w-5" />} title="Depois da banca">
          <ol className="grid gap-3 md:grid-cols-4">
            {afterBancaSteps.map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/pos-banca">
            Abrir consolidação pós-banca
          </Link>
        </Panel>

        <Panel className="mt-6" icon={<MapPinned className="h-5 w-5" />} title="Antes do mapa">
          <ol className="grid gap-3 md:grid-cols-4">
            {beforeMapSteps.map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            O primeiro mapa interno só deve ser autenticado e agregado por bairro/território, sem falas originais, sem dados pessoais e sem publicação externa. Antes de prototipar, preencha <strong>docs/decisao-mapa-interno.md</strong> e confira o desenho técnico em <strong>docs/desenho-tecnico-mapa-interno.md</strong>.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Homologação do mapa interno">
          <ol className="grid gap-3 md:grid-cols-5">
            {mapHomologationSteps.map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/territorios/mapa/homologacao">
            Abrir homologação do mapa
          </Link>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Homologação persistente do mapa">
          <ol className="grid gap-3 md:grid-cols-4">
            {[
              "abrir /territorios/mapa/homologacao",
              "conferir dados",
              "validar RLS manualmente no banco aplicado",
              "marcar checklist",
              "salvar rascunho",
              "coordenação/admin aprova ou rejeita",
              "só com GO aprovado o protótipo pode começar"
            ].map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            O registro persistente fica em <strong>internal_map_homologations</strong> e guarda snapshot, decisão, responsável e auditoria de aprovação/rejeição.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<MapPinned className="h-5 w-5" />} title="Portão do mapa interno">
          <ol className="grid gap-3 md:grid-cols-3">
            {internalMapGateSteps.map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            <strong>/mapa</strong> continua sendo o mapa-lista V0. <strong>/mapa/interno</strong> só libera o próximo protótipo se existir homologação persistente aprovada com decisão <strong>go_prototipo_interno</strong>. O mapa visual ainda não existe; dados sensíveis, fala original, lugares <strong>sensitive</strong> e <strong>sensivel_nao_publicar</strong> nunca entram no mapa.
          </p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/mapa/interno">
            Abrir portão do mapa interno
          </Link>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Como desbloquear o mapa interno">
          <ol className="grid gap-3 md:grid-cols-5">
            {unlockInternalMapSteps.map((item, index) => (
              <li className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                <strong className="text-semear-green">{index + 1}. </strong>{item}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Kit documental: <strong>docs/checklist-homologacao-real-mapa.md</strong>, <strong>docs/teste-manual-rls-mapa.md</strong>, <strong>docs/evidencias-homologacao-mapa.md</strong> e <strong>scripts/smoke-homologacao-mapa.md</strong>.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<ClipboardList className="h-5 w-5" />} title="Pronto para primeira ação real?">
          <div className="grid gap-3 md:grid-cols-4">
            {firstRealActionReady.map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Use <strong>docs/preparacao-primeira-acao-real.md</strong> para o passo a passo da primeira banca. Não registrar CPF, telefone, endereço pessoal nem dado de saúde individual identificável.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<MapPinned className="h-5 w-5" />} title="Lista oficial de bairros">
          <div className="grid gap-3 md:grid-cols-3">
            {officialNeighborhoodChecklist.map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            A lista oficial de Volta Redonda foi extraída dos PDFs, aplicada no banco remoto/homologação e mantém setor, região e código oficial em campos estruturados. Bairros/territórios servem para leitura agregada; não registre CPF, telefone, endereço pessoal nem dado de saúde individual identificável. Se houver dúvida de grafia, registre a decisão antes de alterar nomes oficiais.
          </p>
        </Panel>

        <Panel className="mt-6" icon={<ShieldCheck className="h-5 w-5" />} title="Territórios oficiais e provisórios">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
              <p className="font-semibold text-semear-green">52 bairros oficiais</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                O sistema possui 52 bairros oficiais aplicados, extraídos da lista oficial do município de Volta Redonda. Apenas esses bairros aparecem nos formulários operacionais de ações e escutas.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">21 territórios provisórios ocultos</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Os 21 territórios provisórios restantes não aparecem nos formulários operacionais. Eles estão preservados no banco e visíveis apenas em <strong>/territorios</strong> para revisão administrativa futura.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
            <p>
              <strong>A primeira ação real deve usar território com status = oficial.</strong>{" "}
              Se o território desejado não aparecer no select de ações ou escutas, acesse <strong>/territorios</strong> para verificar se está marcado como oficial.
            </p>
            <p>
              Bairros são agregações territoriais, não localização individual de pessoa. Não registre endereço pessoal, CPF ou telefone em nenhum campo relacionado a território.
            </p>
            <p className="text-stone-500">
              Documento de referência: <strong>docs/decisao-territorios-provisorios.md</strong>. Qualquer limpeza futura dos provisórios deve ser feita por migration própria com revisão humana.
            </p>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<BarChart3 className="h-5 w-5" />} title="Leituras coletivas">
          <div className="grid gap-4 md:grid-cols-2 text-sm leading-6 text-stone-600">
            <div className="space-y-3">
              <p>
                O painel de <strong>Leituras Coletivas</strong> (/leituras) oferece uma visão agregada e territorial das escutas cadastradas.
                Ele é fundamental para entender o &quot;espírito do território&quot; sem expor indivíduos.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Território da Ação:</strong> Onde a banca aconteceu.</li>
                <li><strong>Território de Referência:</strong> Bairro que o entrevistado representa ou fala sobre.</li>
                <li><strong>Temas x Território:</strong> Matriz de intensidade de demandas.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Por que não há mapa com pontos?</strong> Para proteger a privacidade dos moradores. Trabalhamos com 
                manchas de calor e intensidades agregadas por bairro oficial.
              </p>
              <p>
                <strong>Silêncios:</strong> Áreas brancas no painel indicam que precisamos de mais ações de campo nesses locais. 
                Não ignore o silêncio; ele é um guia operacional.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/leituras">Abrir Leituras Coletivas</Link>
          </div>
        </Panel>

        <Panel className="mt-6" icon={<ClipboardList className="h-5 w-5" />} title="Primeira ação real">
          <div className="grid gap-3 md:grid-cols-3">
            {firstRealActionChecklist.map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700" key={item}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 text-sm leading-6 text-stone-600">
            <p>
              Cadastre a ação em <strong>/acoes/nova</strong> com tipo <strong>banca_escuta</strong> e bairro oficial.
              Após a banca, use <strong>/escutas/lote</strong> para digitar as fichas como rascunho.
            </p>
            <p>
              Revise as escutas em <strong>/escutas/revisao-territorial</strong>, gere a devolutiva e feche o dossiê
              antes de conferir o relatório mensal.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/acoes/nova">Nova ação</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/escutas/lote">Digitar fichas</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/escutas/revisao-territorial">Revisar escutas</Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Roteiro completo: <strong>docs/operacao-primeira-acao-real.md</strong> e <strong>docs/cadastro-primeira-acao-real.md</strong>.
          </p>
        </Panel>
      </section>
    </AppShell>
  );
}

function QuickLink({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft transition hover:border-semear-green/30" href={href}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">{icon}</div>
      <h3 className="mt-4 font-semibold text-semear-green">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </Link>
  );
}

function Panel({ icon, title, children, className = "" }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft ${className}`}>
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Role({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="font-semibold text-semear-green">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

function OnboardingStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4">
      <p className="font-bold text-stone-900 text-sm">{title}</p>
      <p className="mt-2 text-xs leading-5 text-stone-600">{text}</p>
    </div>
  );
}
