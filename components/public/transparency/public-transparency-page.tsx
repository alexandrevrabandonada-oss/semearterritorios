"use client";

import { useEffect, useState } from "react";
import { PublicTransparencyHero } from "@/components/public/transparency/public-transparency-hero";
import { PublicTransparencyMetrics } from "@/components/public/transparency/public-transparency-metrics";
import { PublicTransparencyThemes } from "@/components/public/transparency/public-transparency-themes";
import { PublicTransparencyTerritories } from "@/components/public/transparency/public-transparency-territories";
import { PublicTransparencyWords } from "@/components/public/transparency/public-transparency-words";
import { PublicTransparencyTimeline } from "@/components/public/transparency/public-transparency-timeline";
import { PublicTransparencyMethodologyNote } from "@/components/public/transparency/public-transparency-methodology-note";

type PublicApiResponse = {
  snapshot: null | {
    title?: string;
    period_start?: string | null;
    period_end?: string | null;
    public_summary?: string | null;
    totals?: Record<string, number>;
    theme_summary?: Array<{ theme?: string; count?: number }>;
    territory_summary?: {
      action_territory_summary?: Array<{
        territory?: string;
        reviewed_records?: number;
        action_records?: number;
        action_count?: number;
        public_status?: string;
      }>;
      respondent_territory_summary?: Array<{
        territory?: string;
        reviewed_records?: number;
        respondent_records?: number;
        public_status?: string;
      }>;
      territorial_quality_summary?: {
        status?: "boa" | "atenção" | "crítica";
        methodology_note?: string;
      };
    };
    word_summary?: Array<{ word?: string; count?: number }>;
    action_timeline?: Array<{
      date?: string;
      title?: string;
      territory?: string;
      action_type?: string;
      debrief_status?: string;
    }>;
    debrief_links?: Array<{ title?: string; approved_at?: string | null }>;
    privacy_notes?: string | null;
    methodology_notes?: string | null;
  };
  territorial_publication_note?: {
    methodology_note?: string | null;
    institutional_justification?: string | null;
  } | null;
};

type PublicTransparencyPageProps = {
  apiPath: string;
};

export function PublicTransparencyPage({ apiPath }: PublicTransparencyPageProps) {
  const [data, setData] = useState<PublicApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(apiPath, { method: "GET" });
        const payload = (await response.json().catch(() => ({ snapshot: null }))) as PublicApiResponse;
        if (!active) return;
        if (!response.ok) {
          setData({ snapshot: null });
        } else {
          setData(payload);
        }
      } catch {
        if (!active) return;
        setData({ snapshot: null });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [apiPath]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-semear-green/10 bg-white p-8 shadow-soft">
          <p className="text-sm text-stone-600">Carregando síntese pública...</p>
        </section>
      </main>
    );
  }

  if (!data?.snapshot) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-semear-green/10 bg-white p-8 shadow-soft">
          <h1 className="text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">Transparência Viva em preparação</h1>
          <p className="mt-4 text-base leading-7 text-stone-700">
            Os dados públicos do SEMEAR serão disponibilizados após revisão, homologação e publicação institucional.
          </p>
        </section>
      </main>
    );
  }

  const snapshot = data.snapshot;
  const territorialStatus = snapshot.territory_summary?.territorial_quality_summary?.status ?? null;
  const methodologyNote = data.territorial_publication_note?.methodology_note ?? snapshot.methodology_notes ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <PublicTransparencyHero
        periodStart={snapshot.period_start ?? null}
        periodEnd={snapshot.period_end ?? null}
        publicSummary={snapshot.public_summary ?? null}
      />

      <PublicTransparencyMetrics totals={snapshot.totals ?? {}} />

      <div className="grid gap-5 lg:grid-cols-2">
        <PublicTransparencyThemes themes={snapshot.theme_summary ?? []} />
        <section className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-semear-green">Devolutivas aprovadas</h2>
          {(snapshot.debrief_links ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">Devolutivas públicas ainda não disponíveis para este recorte.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(snapshot.debrief_links ?? []).slice(0, 10).map((item, index) => (
                <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={`${item.title}-${index}`}>
                  <strong className="text-semear-green">{item.title ?? "Devolutiva"}</strong>
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      <PublicTransparencyTerritories
        actionTerritories={snapshot.territory_summary?.action_territory_summary ?? []}
        respondentTerritories={snapshot.territory_summary?.respondent_territory_summary ?? []}
      />

      <PublicTransparencyWords words={snapshot.word_summary ?? []} />

      <PublicTransparencyTimeline timeline={snapshot.action_timeline ?? []} />

      <PublicTransparencyMethodologyNote
        territorialStatus={territorialStatus}
        methodologyNote={methodologyNote}
        institutionalJustification={data.territorial_publication_note?.institutional_justification ?? null}
      />

      <section className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-semear-green">Como protegemos os dados</h2>
        <p className="mt-3 text-sm leading-7 text-stone-700">
          Esta página mostra apenas dados agregados e revisados. Não publicamos nomes de entrevistados, endereços, telefones, falas brutas, entrevistadores ou documentos internos.
        </p>
      </section>
    </main>
  );
}
