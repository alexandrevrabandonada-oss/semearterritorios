"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import type { Database, ListeningRecord, ListeningRecordPublicQuote, Profile, PublicQuoteStatus } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { assessPublicQuotePrivacy } from "@/lib/public-quote-privacy";
import { getPublicQuoteStatusLabel } from "@/lib/public-quotes";

type Props = {
  record: Pick<ListeningRecord, "id" | "action_id" | "free_speech_text" | "team_summary">;
};

type QuoteForm = {
  quote_text: string;
  sanitized_text: string;
  theme_label: string;
  context_note: string;
};

const emptyForm: QuoteForm = {
  quote_text: "",
  sanitized_text: "",
  theme_label: "",
  context_note: ""
};

type PublicQuoteInsert = Database["public"]["Tables"]["listening_record_public_quotes"]["Insert"];
type PublicQuoteUpdate = Database["public"]["Tables"]["listening_record_public_quotes"]["Update"];

export function PublicQuoteCandidatePanel({ record }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [quotes, setQuotes] = useState<ListeningRecordPublicQuote[]>([]);
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonByQuote, setReasonByQuote] = useState<Record<string, string>>({});

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

      const [quotesResult, profileResult] = await Promise.all([
        supabase
          .from("listening_record_public_quotes")
          .select("*")
          .eq("listening_record_id", record.id)
          .order("created_at", { ascending: false }),
        userId
          ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (quotesResult.error || profileResult.error) {
        setError(quotesResult.error?.message ?? profileResult.error?.message ?? "Erro ao carregar falas candidatas.");
        setLoading(false);
        return;
      }

      setQuotes((quotesResult.data ?? []) as ListeningRecordPublicQuote[]);
      setProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [record.id, supabase]);

  function updateField<TField extends keyof QuoteForm>(field: TField, value: QuoteForm[TField]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function suggestFromSource() {
    const source = record.free_speech_text?.trim() || record.team_summary?.trim() || "";
    const excerpt = source.split(/[.!?]/).map((item) => item.trim()).filter(Boolean)[0] ?? source.slice(0, 220).trim();
    updateField("quote_text", excerpt.slice(0, 240));
    setFeedback("Trecho inicial sugerido. Revise e sanitize antes de enviar.");
  }

  async function reloadQuotes() {
    if (!supabase) return;
    const result = await supabase
      .from("listening_record_public_quotes")
      .select("*")
      .eq("listening_record_id", record.id)
      .order("created_at", { ascending: false });

    if (!result.error) {
      setQuotes((result.data ?? []) as ListeningRecordPublicQuote[]);
    }
  }

  async function createCandidate(status: PublicQuoteStatus) {
    if (!supabase) return;
    setError(null);
    setFeedback(null);

    if (!record.action_id) {
      setError("A escuta precisa estar vinculada a uma ação para criar fala candidata.");
      return;
    }

    if (!form.quote_text.trim()) {
      setError("Preencha um trecho curto antes de salvar.");
      return;
    }

    const baseText = form.sanitized_text.trim() || form.quote_text.trim();
    const privacy = assessPublicQuotePrivacy(baseText);

    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload: PublicQuoteInsert = {
      listening_record_id: record.id,
      action_id: record.action_id,
      quote_text: form.quote_text.trim(),
      sanitized_text: form.sanitized_text.trim() || null,
      theme_label: form.theme_label.trim() || null,
      context_note: form.context_note.trim() || null,
      status,
      sensitive_risk: privacy.hasCriticalBlock,
      risk_notes: privacy.riskNotes.join("; ") || null,
      created_by: user?.id ?? null,
      public_approval_reason: null,
      rejection_reason: null,
      archive_reason: null,
      last_edit_reason: null
    };

    const result = await supabase.from("listening_record_public_quotes").insert(payload);
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setForm(emptyForm);
    setFeedback(status === "needs_review" ? "Fala enviada para revisão." : "Fala candidata salva como rascunho.");
    await reloadQuotes();
  }

  async function updateCandidate(quote: ListeningRecordPublicQuote, nextStatus?: PublicQuoteStatus) {
    if (!supabase) return;
    setError(null);
    setFeedback(null);

    const baseText = (quote.sanitized_text?.trim() || quote.quote_text).trim();
    const privacy = assessPublicQuotePrivacy(baseText);

    const reason = (reasonByQuote[quote.id] ?? "").trim();

    if ((nextStatus ?? quote.status) === "approved_public") {
      if (!quote.sanitized_text?.trim()) {
        setError("Aprovação pública exige texto sanitizado preenchido.");
        return;
      }
      if (privacy.hasCriticalBlock) {
        setError("Aprovação pública bloqueada: detector encontrou risco crítico (CPF/telefone/e-mail/endereço). Revise a sanitização.");
        return;
      }
      if (!reason) {
        setError("Aprovação pública exige justificativa da aprovação pública.");
        return;
      }
    }

    if ((nextStatus ?? quote.status) === "rejected" && !reason) {
      setError("Rejeição exige motivo da rejeição.");
      return;
    }

    if ((nextStatus ?? quote.status) === "archived" && !reason) {
      setError("Arquivamento exige motivo do arquivamento.");
      return;
    }

    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload: PublicQuoteUpdate = {
      status: nextStatus ?? quote.status,
      sensitive_risk: privacy.hasCriticalBlock,
      risk_notes: privacy.riskNotes.join("; ") || null
    };

    if ((nextStatus ?? quote.status) === "approved_public") payload.public_approval_reason = reason;
    if ((nextStatus ?? quote.status) === "rejected") payload.rejection_reason = reason;
    if ((nextStatus ?? quote.status) === "archived") payload.archive_reason = reason;

    if (nextStatus === "approved_internal" || nextStatus === "approved_public") {
      payload.reviewed_by = user?.id ?? null;
      payload.reviewed_at = new Date().toISOString();
    }

    if (nextStatus === "approved_public") {
      payload.approved_by = user?.id ?? null;
      payload.approved_at = new Date().toISOString();
    }

    const result = await supabase.from("listening_record_public_quotes").update(payload).eq("id", quote.id);
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setFeedback(`Status atualizado para ${getPublicQuoteStatusLabel(nextStatus ?? quote.status)}.`);
    setReasonByQuote((current) => ({ ...current, [quote.id]: "" }));
    await reloadQuotes();
  }

  async function saveInlineEdit(quote: ListeningRecordPublicQuote, field: keyof Pick<ListeningRecordPublicQuote, "quote_text" | "sanitized_text" | "theme_label" | "context_note">, value: string) {
    if (!supabase) return;
    setError(null);

    const patch: PublicQuoteUpdate = {};
    const normalized = value.trim();

    if (field === "quote_text") {
      if (!normalized) {
        setError("Trecho original nao pode ficar vazio.");
        return;
      }
      patch.quote_text = normalized;
    }

    if (field === "sanitized_text") {
      patch.sanitized_text = normalized || null;
    }

    if (field === "theme_label") {
      patch.theme_label = normalized || null;
    }

    if (field === "context_note") {
      patch.context_note = normalized || null;
    }

    if ((field === "quote_text" || field === "sanitized_text") && quote.status === "approved_public") {
      const reason = (reasonByQuote[quote.id] ?? "").trim();
      if (!reason) {
        setError("Editar texto após aprovação pública exige justificativa da alteração.");
        return;
      }
      patch.last_edit_reason = reason;
    }

    const result = await supabase.from("listening_record_public_quotes").update(patch).eq("id", quote.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    await reloadQuotes();
    if (patch.last_edit_reason) {
      setReasonByQuote((current) => ({ ...current, [quote.id]: "" }));
    }
    setFeedback("Fala atualizada.");
  }

  return (
    <section className="rounded-[1.5rem] border border-semear-green/20 bg-semear-offwhite p-5">
      <h3 className="text-lg font-semibold text-semear-green">Fala candidata a devolutiva</h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Use trechos curtos. Remova nomes, enderecos e detalhes que identifiquem a pessoa.
      </p>

      <div className="mt-4 grid gap-3">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Trecho original <span className="font-normal text-amber-700">(interno — não publicado)</span></span>
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-semear-gray bg-white px-3 py-2 text-sm" value={form.quote_text} onChange={(event) => updateField("quote_text", event.target.value)} />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Versão pública sanitizada <span className="font-normal text-stone-500">(obrigatória para aprovar publicamente)</span></span>
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-semear-gray bg-white px-3 py-2 text-sm" value={form.sanitized_text} onChange={(event) => updateField("sanitized_text", event.target.value)} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Tema (opcional)</span>
            <input className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm" value={form.theme_label} onChange={(event) => updateField("theme_label", event.target.value)} />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Nota de contexto</span>
            <input className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm" value={form.context_note} onChange={(event) => updateField("context_note", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full border border-semear-green/20 bg-white px-4 py-2 text-sm font-semibold text-semear-green" onClick={suggestFromSource} type="button">
          Sugerir trecho inicial
        </button>
        <button className="rounded-full bg-semear-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void createCandidate("draft")} type="button">
          Salvar rascunho
        </button>
        <button className="rounded-full bg-semear-earth px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void createCandidate("needs_review")} type="button">
           Enviar para revisão
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-stone-600">Carregando falas candidatas...</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {feedback ? <p className="mt-4 text-sm font-semibold text-semear-green">{feedback}</p> : null}

      <div className="mt-5 space-y-3">
        {quotes.length === 0 ? <p className="text-sm text-stone-600">Nenhuma fala candidata registrada para esta escuta.</p> : null}
        {quotes.map((quote) => {
          const privacy = assessPublicQuotePrivacy((quote.sanitized_text?.trim() || quote.quote_text).trim());
          return (
            <article className="rounded-xl border border-white bg-white p-4" key={quote.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getPublicQuoteStatusLabel(quote.status)}</span>
                {privacy.hasCriticalBlock ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">Risco critico</span> : null}
                {!privacy.hasCriticalBlock && privacy.warningCategories.length > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Revisar alerta</span> : null}
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Trecho original <span className="font-normal text-amber-700">(interno)</span></label>
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-semear-gray bg-white px-3 py-2 text-sm"
                defaultValue={quote.quote_text}
                onBlur={(event) => {
                  if (event.target.value !== quote.quote_text) {
                    void saveInlineEdit(quote, "quote_text", event.target.value);
                  }
                }}
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Versão pública sanitizada</label>
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-semear-gray bg-white px-3 py-2 text-sm"
                defaultValue={quote.sanitized_text ?? ""}
                onBlur={(event) => {
                  if (event.target.value !== (quote.sanitized_text ?? "")) {
                    void saveInlineEdit(quote, "sanitized_text", event.target.value);
                  }
                }}
              />

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  className="min-h-10 w-full rounded-lg border border-semear-gray bg-white px-3 text-sm"
                  defaultValue={quote.theme_label ?? ""}
                  placeholder="Tema"
                  onBlur={(event) => {
                    if (event.target.value !== (quote.theme_label ?? "")) {
                      void saveInlineEdit(quote, "theme_label", event.target.value);
                    }
                  }}
                />
                <input
                  className="min-h-10 w-full rounded-lg border border-semear-gray bg-white px-3 text-sm"
                  defaultValue={quote.context_note ?? ""}
                  placeholder="Nota de contexto"
                  onBlur={(event) => {
                    if (event.target.value !== (quote.context_note ?? "")) {
                      void saveInlineEdit(quote, "context_note", event.target.value);
                    }
                  }}
                />
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Justificativa editorial</span>
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-semear-gray bg-white px-3 py-2 text-sm"
                  placeholder="Obrigatória para aprovar pública, rejeitar, arquivar e editar texto aprovado publicamente."
                  value={reasonByQuote[quote.id] ?? ""}
                  onChange={(event) => setReasonByQuote((current) => ({ ...current, [quote.id]: event.target.value }))}
                />
              </label>

              {quote.risk_notes ? <p className="mt-2 text-xs text-red-800">{quote.risk_notes}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded-full border border-semear-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-semear-green" href={`/escutas/falas/${quote.id}`}>
                  Ver historico
                </Link>
                <button className="rounded-full border border-semear-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-semear-green" onClick={() => void updateCandidate(quote, "needs_review")} type="button">
                  Enviar revisao
                </button>
                <button className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700" onClick={() => void updateCandidate(quote, "rejected")} type="button">
                  <XCircle className="mr-1 inline h-3.5 w-3.5" />Rejeitar
                </button>
                <button className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700" onClick={() => void updateCandidate(quote, "archived")} type="button">
                  Arquivar
                </button>
                {canApprove ? (
                  <>
                    <button className="rounded-full bg-semear-green px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void updateCandidate(quote, "approved_internal")} type="button">
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Aprovar interna
                    </button>
                    <button className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void updateCandidate(quote, "approved_public")} type="button">
                      <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Aprovar publica
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
