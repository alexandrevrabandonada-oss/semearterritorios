"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, FileText, MapPinned, MessageSquareText, ShieldCheck, Tag } from "lucide-react";
import type { PublicTransparencySnapshot } from "@/lib/database.types";
import { getLatestPreviewSnapshot, getSnapshotStatusLabel, MIN_PUBLIC_TERRITORY_SAMPLE } from "@/lib/transparency-snapshots";
import { buildTransparencyTextBlob, detectTransparencyPrivacyRisks } from "@/lib/transparency-privacy";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type CountItem = { count: number };
type ThemeItem = CountItem & { theme: string };
type WordItem = CountItem & { word: string };
type TerritoryItem = { territory: string; reviewed_records: number; respondent_records: number; action_records: number; public_status: string };
type TimelineItem = { date: string; title: string; territory: string; action_type: string; debrief_status: string };
type DebriefItem = { title: string; approved_at: string | null };

export function TransparencyPreviewPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [snapshot, setSnapshot] = useState<PublicTransparencySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir o preview.");
        setLoading(false);
        return;
      }
      const result = await supabase.from("public_transparency_snapshots").select("*").in("status", ["published", "approved"]).order("updated_at", { ascending: false });
      if (ignore) return;
      if (result.error) setError(result.error.message);
      else setSnapshot(getLatestPreviewSnapshot((result.data ?? []) as PublicTransparencySnapshot[]));
      setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando preview interno...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;
  if (!snapshot) return <StateBox>Nenhum snapshot aprovado ou publicado encontrado. Gere e aprove um snapshot em Transparência.</StateBox>;

  const totals = (snapshot.totals ?? {}) as Record<string, number>;
  const themes = (snapshot.theme_summary ?? []) as unknown as ThemeItem[];
  const words = (snapshot.word_summary ?? []) as unknown as WordItem[];
  const territories = (snapshot.territory_summary ?? []) as unknown as TerritoryItem[];
  const timeline = (snapshot.action_timeline ?? []) as unknown as TimelineItem[];
  const debriefs = (snapshot.debrief_links ?? []) as unknown as DebriefItem[];
  const riskReport = detectTransparencyPrivacyRisks(
    buildTransparencyTextBlob([
      snapshot.title,
      snapshot.public_summary,
      snapshot.opening_text,
      snapshot.listening_text,
      snapshot.limits_text,
      snapshot.next_steps_text,
      snapshot.privacy_notes,
      snapshot.methodology_notes
    ])
  );
  const insufficientTerritories = territories.filter((item) => item.public_status === "dados insuficientes para síntese pública");
  const isPublished = snapshot.status === "published";

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-semear-green p-6 text-white shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-yellow">Preview interno autenticado</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Transparência Viva SEMEAR</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/82">{snapshot.opening_text || snapshot.public_summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">status: {getSnapshotStatusLabel(snapshot.status)}</span>
          {!isPublished ? <span className="rounded-full bg-semear-yellow px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-green">Preview interno - não público</span> : null}
        </div>
      </div>

      {riskReport.hasBlockingRisk || riskReport.hasWarningRisk ? (
        <div className={`mt-6 rounded-[1.5rem] border p-4 text-sm ${riskReport.hasBlockingRisk ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Possível dado identificável. Revise antes de publicar.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Metric icon={<CalendarDays className="h-5 w-5" />} label="Ações" value={totals.actions_realized ?? 0} />
        <Metric icon={<MessageSquareText className="h-5 w-5" />} label="Escutas" value={totals.listening_records ?? 0} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Revisadas" value={totals.listening_records_reviewed ?? 0} />
        <Metric icon={<MapPinned className="h-5 w-5" />} label="Territórios" value={totals.territories_reached ?? 0} />
        <Metric icon={<FileText className="h-5 w-5" />} label="Devolutivas" value={totals.approved_debriefs ?? 0} />
        <Metric icon={<FileText className="h-5 w-5" />} label="Dossiês" value={totals.closed_dossiers ?? 0} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="O que estamos ouvindo" icon={<MessageSquareText className="h-5 w-5" />}>
          <p className="text-sm leading-6 text-stone-700">{snapshot.listening_text || snapshot.public_summary}</p>
        </Panel>
        <Panel title="Temas mais citados" icon={<Tag className="h-5 w-5" />}>
          <RankList items={themes.slice(0, 8).map((item) => ({ label: item.theme, count: item.count }))} />
        </Panel>
        <Panel title="Palavras recorrentes" icon={<Tag className="h-5 w-5" />}>
          <div className="flex flex-wrap gap-2">
            {words.slice(0, 20).map((item) => <span className="rounded-full bg-semear-green-soft px-3 py-1 text-sm font-semibold text-semear-green" key={item.word}>{item.word}</span>)}
          </div>
        </Panel>
        <Panel title="Territórios alcançados" icon={<MapPinned className="h-5 w-5" />}>
          <div className="space-y-3">
            {territories.slice(0, 12).map((item) => (
              <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3" key={item.territory}>
                <p className="font-semibold text-semear-green">{item.territory}</p>
                <p className="mt-1 text-xs text-stone-600">{item.reviewed_records} escuta(s) revisada(s) · {item.public_status}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6" title="Linha do tempo de ações" icon={<CalendarDays className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {timeline.map((item) => (
            <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={`${item.date}-${item.title}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}</p>
              <h3 className="mt-2 font-semibold text-semear-green">{item.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{item.territory} · {item.action_type} · {item.debrief_status}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6" title="Devolutivas aprovadas" icon={<FileText className="h-5 w-5" />}>
        <RankList items={debriefs.map((item) => ({ label: item.title, count: item.approved_at ? 1 : 0 }))} empty="Nenhuma devolutiva aprovada neste snapshot." />
      </Panel>

      <Panel className="mt-6" title="Bloco de amostra mínima" icon={<ShieldCheck className="h-5 w-5" />}>
        <p className="text-sm leading-6 text-stone-700">
          Territórios com menos de {MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas aparecem como <strong>dados insuficientes para síntese pública</strong>.
        </p>
        <div className="mt-4 space-y-2">
          {insufficientTerritories.length > 0 ? insufficientTerritories.map((item) => (
            <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={item.territory}>
              <strong className="text-semear-green">{item.territory}</strong>: {item.reviewed_records} escuta(s) revisada(s)
            </p>
          )) : <p className="text-sm text-stone-500">Nenhum território insuficiente neste snapshot.</p>}
        </div>
      </Panel>

      <Panel className="mt-6" title="Aviso metodológico" icon={<ShieldCheck className="h-5 w-5" />}>
        <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{snapshot.methodology_notes}</p>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{snapshot.limits_text}</p>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{snapshot.next_steps_text}</p>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{snapshot.privacy_notes}</p>
        <Link className="mt-4 inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/snapshots">Voltar aos snapshots</Link>
      </Panel>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">{icon}</div><p className="text-sm text-stone-600">{label}</p><strong className="mt-1 block text-3xl text-semear-green">{value}</strong></div>;
}

function Panel({ icon, title, children, className = "" }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft ${className}`}><div className="mb-4 flex items-center gap-3 text-semear-green"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">{icon}</div><h3 className="font-semibold">{title}</h3></div>{children}</section>;
}

function RankList({ items, empty = "Não há dados suficientes." }: { items: Array<{ label: string; count: number }>; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-stone-500">{empty}</p>;
  return <div className="space-y-2">{items.map((item) => <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={item.label}><strong className="text-semear-green">{item.label}</strong>{item.count > 0 ? ` (${item.count})` : ""}</p>)}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
