"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Filter, ShieldCheck, XCircle } from "lucide-react";
import type {
  Action,
  Database,
  ListeningRecord,
  ListeningRecordPublicQuote,
  ListeningRecordPublicQuoteAudit,
  Profile,
  PublicQuoteStatus
} from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { assessPublicQuotePrivacy } from "@/lib/public-quote-privacy";
import { getPublicQuoteAuditEventLabel, getPublicQuoteStatusLabel, publicQuoteStatusOptions } from "@/lib/public-quotes";

type QuoteWithRelations = ListeningRecordPublicQuote & {
  actions: Pick<Action, "id" | "title"> | null;
  listening_records: Pick<ListeningRecord, "id" | "date" | "review_status"> | null;
};

type Filters = {
  actionId: string;
  status: string;
  theme: string;
  risk: "" | "critical" | "warning" | "safe";
};

const initialFilters: Filters = {
  actionId: "",
  status: "",
  theme: "",
  risk: ""
};

type PublicQuoteUpdate = Database["public"]["Tables"]["listening_record_public_quotes"]["Update"];

export function PublicQuotesQueue() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([]);
  const [audits, setAudits] = useState<ListeningRecordPublicQuoteAudit[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [reasonByQuote, setReasonByQuote] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canApprove = profile?.role === "admin" || profile?.role === "coordenacao";

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [quotesResult, actionsResult, auditsResult, peopleResult, profileResult] = await Promise.all([
        supabase
          .from("listening_record_public_quotes")
          .select("*, actions:action_id(id, title), listening_records:listening_record_id(id, date, review_status)")
          .order("updated_at", { ascending: false }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase
          .from("listening_record_public_quote_audits")
          .select("*")
          .order("changed_at", { ascending: false })
          .limit(2000),
        supabase.from("profiles").select("id, full_name"),
        userId
          ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (quotesResult.error || actionsResult.error || auditsResult.error || peopleResult.error || profileResult.error) {
        setError(
          quotesResult.error?.message ??
            actionsResult.error?.message ??
            auditsResult.error?.message ??
            peopleResult.error?.message ??
            profileResult.error?.message ??
            "Erro ao carregar fila de falas."
        );
        setLoading(false);
        return;
      }

      setQuotes((quotesResult.data ?? []) as QuoteWithRelations[]);
      setActions(actionsResult.data ?? []);
      setAudits((auditsResult.data ?? []) as ListeningRecordPublicQuoteAudit[]);
      setPeople(
        (peopleResult.data ?? []).reduce<Record<string, string>>((acc, person) => {
          acc[person.id] = person.full_name?.trim() || person.id;
          return acc;
        }, {})
      );
      setProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);

      const params = new URLSearchParams(window.location.search);
      const actionId = params.get("actionId") ?? "";
      if (actionId) {
        setFilters((current) => ({ ...current, actionId }));
      }

      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredQuotes = quotes.filter((quote) => {
    if (filters.actionId && quote.action_id !== filters.actionId) return false;
    if (filters.status && quote.status !== filters.status) return false;
    if (filters.theme && !(quote.theme_label ?? "").toLowerCase().includes(filters.theme.toLowerCase())) return false;

    const privacy = assessPublicQuotePrivacy((quote.sanitized_text?.trim() || quote.quote_text).trim());
    if (filters.risk === "critical" && !privacy.hasCriticalBlock) return false;
    if (filters.risk === "warning" && (privacy.hasCriticalBlock || privacy.warningCategories.length === 0)) return false;
    if (filters.risk === "safe" && (privacy.hasCriticalBlock || privacy.warningCategories.length > 0)) return false;

    return true;
  });

  const grouped = {
    needsReview: filteredQuotes.filter((q) => q.status === "needs_review"),
    approvedInternal: filteredQuotes.filter((q) => q.status === "approved_internal"),
    approvedPublic: filteredQuotes.filter((q) => q.status === "approved_public"),
    rejected: filteredQuotes.filter((q) => q.status === "rejected")
  };

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function updateReason(quoteId: string, value: string) {
    setReasonByQuote((current) => ({ ...current, [quoteId]: value }));
  }

  function getLatestEvent(quoteId: string) {
    return audits.find((audit) => audit.quote_id === quoteId) ?? null;
  }

  async function applyStatus(quote: QuoteWithRelations, nextStatus: PublicQuoteStatus) {
    if (!supabase) return;
    setError(null);
    setFeedback(null);

    const baseText = (quote.sanitized_text?.trim() || quote.quote_text).trim();
    const privacy = assessPublicQuotePrivacy(baseText);

    const reason = (reasonByQuote[quote.id] ?? "").trim();

    if (nextStatus === "approved_public") {
      if (!quote.sanitized_text?.trim()) {
        setError("Aprovação pública exige texto sanitizado.");
        return;
      }
      if (privacy.hasCriticalBlock) {
        setError("Aprovação pública bloqueada por risco crítico de privacidade.");
        return;
      }
      if (!canApprove) {
        setError("Apenas coordenação/admin podem aprovar para público.");
        return;
      }
      if (!reason) {
        setError("Aprovação pública exige justificativa da aprovação pública.");
        return;
      }
    }

    if (nextStatus === "rejected" && !reason) {
      setError("Rejeição exige motivo da rejeição.");
      return;
    }

    if (nextStatus === "archived" && !reason) {
      setError("Arquivamento exige motivo do arquivamento.");
      return;
    }

    setSavingId(quote.id);
    const user = (await supabase.auth.getUser()).data.user;

    const patch: PublicQuoteUpdate = {
      status: nextStatus,
      sensitive_risk: privacy.hasCriticalBlock,
      risk_notes: privacy.riskNotes.join("; ") || null
    };

    if (nextStatus === "approved_public") patch.public_approval_reason = reason;
    if (nextStatus === "rejected") patch.rejection_reason = reason;
    if (nextStatus === "archived") patch.archive_reason = reason;

    if (nextStatus === "approved_internal" || nextStatus === "approved_public") {
      patch.reviewed_by = user?.id ?? null;
      patch.reviewed_at = new Date().toISOString();
    }

    if (nextStatus === "approved_public") {
      patch.approved_by = user?.id ?? null;
      patch.approved_at = new Date().toISOString();
    }

    const result = await supabase.from("listening_record_public_quotes").update(patch).eq("id", quote.id);
    setSavingId(null);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setQuotes((current) =>
      current.map((item) => (item.id === quote.id ? { ...item, ...patch } as QuoteWithRelations : item))
    );
    setReasonByQuote((current) => ({ ...current, [quote.id]: "" }));
    setFeedback(`Fala atualizada para ${getPublicQuoteStatusLabel(nextStatus)}.`);
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Escutas</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Fila de falas candidatas</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Fluxo editorial interno para seleção, sanitização, revisão e aprovação de trechos representativos.</p>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-semear-green"><Filter className="h-4 w-4" />Filtros</div>
        <div className="grid gap-3 md:grid-cols-4">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Ação</span>
            <select className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray px-3 text-sm" value={filters.actionId} onChange={(event) => updateFilter("actionId", event.target.value)}>
              <option value="">Todas</option>
              {actions.map((action) => <option key={action.id} value={action.id}>{action.title}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Status</span>
            <select className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray px-3 text-sm" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Todos</option>
              {publicQuoteStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Tema</span>
            <input className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray px-3 text-sm" value={filters.theme} onChange={(event) => updateFilter("theme", event.target.value)} />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Risco</span>
            <select className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray px-3 text-sm" value={filters.risk} onChange={(event) => updateFilter("risk", event.target.value as Filters["risk"])}>
              <option value="">Todos</option>
              <option value="critical">Critico</option>
              <option value="warning">Alerta</option>
              <option value="safe">Sem alerta</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? <p className="mt-4 rounded-xl bg-white p-4 text-sm text-stone-600">Carregando fila...</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {feedback ? <p className="mt-4 text-sm font-semibold text-semear-green">{feedback}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Em revisão" value={grouped.needsReview.length} tone="amber" />
        <StatCard label="Aprovadas internas" value={grouped.approvedInternal.length} tone="green" />
        <StatCard label="Aprovadas públicas" value={grouped.approvedPublic.length} tone="blue" />
        <StatCard label="Rejeitadas" value={grouped.rejected.length} tone="red" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {filteredQuotes.map((quote) => {
          const privacy = assessPublicQuotePrivacy((quote.sanitized_text?.trim() || quote.quote_text).trim());
          const latestEvent = getLatestEvent(quote.id);
          const changedByLabel = latestEvent?.changed_by ? (people[latestEvent.changed_by] ?? latestEvent.changed_by) : "Sem registro";
          return (
            <article className="rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-soft" key={quote.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getPublicQuoteStatusLabel(quote.status)}</span>
                <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700">{quote.actions?.title ?? "Sem ação"}</span>
                {quote.theme_label ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{quote.theme_label}</span> : null}
                {privacy.hasCriticalBlock ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">Risco critico</span> : null}
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Trecho original <span className="font-normal text-amber-700">(interno — não aparece na devolutiva pública)</span></p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{quote.quote_text}</p>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Versão pública sanitizada</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{quote.sanitized_text?.trim() || "Ainda não preenchida. Preencha antes de aprovar para publicação."}</p>

              {quote.context_note ? <p className="mt-2 text-sm text-stone-600">Contexto: {quote.context_note}</p> : null}
              {quote.risk_notes ? <p className="mt-2 text-xs text-red-800">{quote.risk_notes}</p> : null}

              <div className="mt-3 rounded-xl border border-semear-gray bg-semear-offwhite p-3 text-xs text-stone-700">
                <p className="font-semibold text-semear-green">Último evento editorial</p>
                <p className="mt-1">{latestEvent ? getPublicQuoteAuditEventLabel(latestEvent.event_type) : "Sem eventos registrados"}</p>
                <p className="mt-1">Por: {changedByLabel}</p>
                <p className="mt-1">Data: {latestEvent ? new Date(latestEvent.changed_at).toLocaleString("pt-BR") : "-"}</p>
                <p className="mt-2 text-stone-500">Histórico editorial é interno e não aparece na devolutiva pública.</p>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Justificativa editorial</span>
                <textarea
                  className="mt-1 min-h-20 w-full rounded-xl border border-semear-gray bg-white px-3 py-2 text-sm"
                  placeholder="Obrigatória para aprovação pública, rejeição e arquivamento. Registrada na trilha de auditoria."
                  value={reasonByQuote[quote.id] ?? ""}
                  onChange={(event) => updateReason(quote.id, event.target.value)}
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-semear-green" href={`/escutas/${quote.listening_record_id}`}>
                  Abrir escuta
                </Link>
                <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-semear-green" href={`/escutas/falas/${quote.id}`}>
                  <Clock3 className="mr-1 h-3.5 w-3.5" />Ver histórico
                </Link>
                <button className="inline-flex min-h-10 items-center rounded-full border border-semear-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-semear-green" disabled={savingId === quote.id} onClick={() => void applyStatus(quote, "needs_review")} type="button">
                  Enviar revisão
                </button>
                <button className="inline-flex min-h-10 items-center rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700" disabled={savingId === quote.id} onClick={() => void applyStatus(quote, "rejected")} type="button">
                  <XCircle className="mr-1 inline h-3.5 w-3.5" />Rejeitar
                </button>
                <button className="inline-flex min-h-10 items-center rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700" disabled={savingId === quote.id} onClick={() => void applyStatus(quote, "archived")} type="button">
                  Arquivar
                </button>
                {canApprove ? (
                  <>
                    <button className="inline-flex min-h-10 items-center rounded-full bg-semear-green px-3 py-1.5 text-xs font-semibold text-white" disabled={savingId === quote.id} onClick={() => void applyStatus(quote, "approved_internal")} type="button">
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Aprovar interna
                    </button>
                    <button className="inline-flex min-h-10 items-center rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white" disabled={savingId === quote.id} onClick={() => void applyStatus(quote, "approved_public")} type="button">
                      <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Aprovar pública
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "green" | "blue" | "red" }) {
  const toneClass = tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : tone === "green"
      ? "border-green-200 bg-green-50 text-green-900"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-900"
        : "border-red-200 bg-red-50 text-red-900";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <strong className="mt-1 block text-3xl font-semibold">{value}</strong>
    </div>
  );
}
