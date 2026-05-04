import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ClipboardList, FileText, Keyboard, MapPinned, ShieldCheck, UsersRound } from "lucide-react";
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
          <QuickLink href="/relatorios" icon={<FileText className="h-5 w-5" />} title="Relatórios" text="Conferir leitura mensal e alertas de dossiê." />
          <QuickLink href="/territorios/lugares" icon={<MapPinned className="h-5 w-5" />} title="Normalizar lugares" text="Padronizar lugares citados e marcar visibilidade antes do mapa." />
          <QuickLink href="/territorios/qualidade" icon={<ShieldCheck className="h-5 w-5" />} title="Qualidade territorial" text="Conferir bairros prontos, em revisão ou bloqueados por sensível." />
          <QuickLink href="/escutas/revisao-territorial" icon={<MapPinned className="h-5 w-5" />} title="Revisão territorial" text="Revisar lugares livres, estruturados e status territorial por escuta." />
          <QuickLink href="/territorios/normalizacao/qualidade" icon={<ShieldCheck className="h-5 w-5" />} title="Qualidade da normalização" text="Detectar duplicidades, ambiguidade e sensíveis antes do mapa." />
          <QuickLink href="/mapa/interno" icon={<MapPinned className="h-5 w-5" />} title="Portão do mapa" text="Verificar se o protótipo interno está liberado pela homologação persistente." />
        </div>

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
        </div>

        <Panel className="mt-6" icon={<UsersRound className="h-5 w-5" />} title="Papéis no sistema">
          <div className="grid gap-3 md:grid-cols-3">
            <Role title="Admin" text="Administra cadastros, aprova devolutivas, fecha e reabre dossiês." />
            <Role title="Coordenação" text="Revisa decisões institucionais, aprova devolutivas e pode marcar suficiência." />
            <Role title="Equipe" text="Cadastra ações e escutas, revisa dados e prepara rascunhos." />
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
