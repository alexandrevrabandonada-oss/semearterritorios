"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ListeningRecordPublicQuote, ListeningRecordPublicQuoteAudit } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getPublicQuoteAuditEventLabel, getPublicQuoteStatusLabel } from "@/lib/public-quotes";

type Props = {
  quoteId: string;
};

export function PublicQuoteAuditHistory({ quoteId }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [quote, setQuote] = useState<ListeningRecordPublicQuote | null>(null);
  const [audits, setAudits] = useState<ListeningRecordPublicQuoteAudit[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [quoteResult, auditsResult, peopleResult] = await Promise.all([
        supabase.from("listening_record_public_quotes").select("*").eq("id", quoteId).maybeSingle(),
        supabase
          .from("listening_record_public_quote_audits")
          .select("*")
          .eq("quote_id", quoteId)
          .order("changed_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name")
      ]);

      if (ignore) return;

      if (quoteResult.error || auditsResult.error || peopleResult.error) {
        setError(quoteResult.error?.message ?? auditsResult.error?.message ?? peopleResult.error?.message ?? "Erro ao carregar histórico da fala.");
        setLoading(false);
        return;
      }

      setQuote((quoteResult.data ?? null) as ListeningRecordPublicQuote | null);
      setAudits((auditsResult.data ?? []) as ListeningRecordPublicQuoteAudit[]);
      setPeople(
        (peopleResult.data ?? []).reduce<Record<string, string>>((acc, profile) => {
          acc[profile.id] = profile.full_name?.trim() || profile.id;
          return acc;
        }, {})
      );
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [quoteId, supabase]);

  if (loading) return <p className="rounded-2xl bg-white p-4 text-sm text-stone-600">Carregando histórico...</p>;
  if (error) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!quote) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Fala não encontrada.</p>;

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Escutas</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Histórico editorial da fala</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Trilha de auditoria com status, alterações de texto sanitizado e justificativas registradas. <span className="font-semibold text-amber-700">Esta tela é interna e não aparece na devolutiva pública.</span></p>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Status atual</p>
        <p className="mt-1 text-sm font-semibold text-semear-green">{getPublicQuoteStatusLabel(quote.status)}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">{(quote.sanitized_text?.trim() || quote.quote_text).trim()}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/20 bg-white px-3 text-xs font-semibold text-semear-green" href="/escutas/falas">
            Voltar para fila
          </Link>
          <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/20 bg-white px-3 text-xs font-semibold text-semear-green" href={`/escutas/${quote.listening_record_id}`}>
            Abrir escuta
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {audits.length === 0 ? <p className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm text-stone-700">Ainda não há eventos de auditoria para esta fala.</p> : null}
        {audits.map((audit) => {
          const changedBy = audit.changed_by ? (people[audit.changed_by] ?? audit.changed_by) : "Sem autor";
          return (
            <article className="rounded-2xl border border-white/80 bg-white p-4 shadow-soft" key={audit.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getPublicQuoteAuditEventLabel(audit.event_type)}</span>
                <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700">{new Date(audit.changed_at).toLocaleString("pt-BR")}</span>
              </div>
              <p className="mt-2 text-sm text-stone-700">Por: {changedBy}</p>
              <p className="mt-1 text-sm text-stone-700">Status: {audit.old_status ?? "-"} → {audit.new_status ?? "-"}</p>
              {audit.reason ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Justificativa: {audit.reason}</p> : null}
              {audit.old_sanitized_text || audit.new_sanitized_text ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-3 text-xs text-stone-700">
                    <p className="font-semibold text-stone-500">Sanitizado anterior</p>
                    <p className="mt-1 whitespace-pre-wrap">{audit.old_sanitized_text?.trim() || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-3 text-xs text-stone-700">
                    <p className="font-semibold text-stone-500">Sanitizado novo</p>
                    <p className="mt-1 whitespace-pre-wrap">{audit.new_sanitized_text?.trim() || "-"}</p>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
