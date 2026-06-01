"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, ClipboardList, MessageSquareText, UserRound } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood, TeamMember, Theme } from "@/lib/database.types";
import { getReviewStatusLabel, getSourceTypeLabel } from "@/lib/listening-records";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  respondent_neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  interviewer_team_member: Pick<TeamMember, "id" | "display_name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type RecordSource = "digitada" | "entrevistador";

type RecordWithSources = RecordWithRelations & {
  sourceMatches: RecordSource[];
};

const recordSelect =
  "*, actions:action_id(id, title), neighborhoods:neighborhood_id(id, name), respondent_neighborhoods:respondent_neighborhood_id(id, name), interviewer_team_member:interviewer_team_member_id(id, display_name), listening_record_themes(themes:theme_id(id, name))";

export function MyListeningRecordsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<RecordWithSources[]>([]);
  const [linkedMembers, setLinkedMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para acessar suas escutas.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (userError || !user) {
        setError("Entre no sistema para acessar as escutas vinculadas ao seu perfil.");
        setLoading(false);
        return;
      }

      const [membersResult, digitizedResult] = await Promise.all([
        supabase.from("team_members").select("*").eq("profile_id", user.id).order("display_name", { ascending: true }),
        supabase.from("listening_records").select(recordSelect).eq("created_by", user.id).order("date", { ascending: false })
      ]);

      if (ignore) return;

      if (membersResult.error || digitizedResult.error) {
        setError(membersResult.error?.message ?? digitizedResult.error?.message ?? "Erro ao carregar suas escutas.");
        setLoading(false);
        return;
      }

      const members = (membersResult.data ?? []) as TeamMember[];
      const memberIds = members.map((member) => member.id);
      let interviewerRecords: RecordWithRelations[] = [];

      if (memberIds.length > 0) {
        const interviewerResult = await supabase
          .from("listening_records")
          .select(recordSelect)
          .in("interviewer_team_member_id", memberIds)
          .order("date", { ascending: false });

        if (ignore) return;

        if (interviewerResult.error) {
          setError(interviewerResult.error.message);
          setLoading(false);
          return;
        }

        interviewerRecords = (interviewerResult.data ?? []) as unknown as RecordWithRelations[];
      }

      const merged = new Map<string, RecordWithSources>();
      for (const record of (digitizedResult.data ?? []) as unknown as RecordWithRelations[]) {
        merged.set(record.id, { ...record, sourceMatches: ["digitada"] });
      }
      for (const record of interviewerRecords) {
        const existing = merged.get(record.id);
        if (existing) {
          existing.sourceMatches = Array.from(new Set<RecordSource>([...existing.sourceMatches, "entrevistador"]));
        } else {
          merged.set(record.id, { ...record, sourceMatches: ["entrevistador"] });
        }
      }

      setLinkedMembers(members);
      setRecords(
        Array.from(merged.values()).sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.created_at.localeCompare(a.created_at);
        })
      );
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const digitizedCount = records.filter((record) => record.sourceMatches.includes("digitada")).length;
  const interviewerCount = records.filter((record) => record.sourceMatches.includes("entrevistador")).length;
  const draftCount = records.filter((record) => record.review_status === "draft").length;
  const reviewedCount = records.filter((record) => record.review_status === "reviewed").length;

  return (
    <section className="pb-10">
      <div className="rounded-2xl border border-white/80 bg-white/72 p-4 shadow-soft sm:rounded-[2rem] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Meu perfil</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Minhas escutas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Fichas digitadas por este login e escutas ligadas ao cadastro de equipe vinculado ao seu perfil.
            </p>
          </div>
          <Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green hover:bg-semear-green/5 sm:w-auto" href="/escutas">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Todas as escutas
          </Link>
        </div>
      </div>

      {!loading && !error && linkedMembers.length === 0 ? (
        <div className="mt-5 flex gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <strong className="block">Perfil de equipe ainda não vinculado.</strong>
            As fichas digitadas por este login aparecem aqui. Para incluir também o vínculo formal de entrevistador(a), a coordenação deve associar este usuário ao cadastro da equipe em Equipe.
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total encontrado" value={records.length} />
        <MetricCard label="Digitadas por você" value={digitizedCount} />
        <MetricCard label="Como entrevistador(a)" value={interviewerCount} />
        <MetricCard label="Rascunhos" value={draftCount} />
      </div>

      {reviewedCount > 0 ? (
        <div className="mt-4 rounded-3xl border border-white/80 bg-white p-5 text-sm text-stone-600 shadow-soft">
          <strong className="text-semear-green">{reviewedCount}</strong> escuta(s) deste recorte já estão revisadas.
        </div>
      ) : null}

      {loading ? <div className="mt-5 rounded-[1.5rem] bg-white/72 p-6 text-sm font-medium text-stone-600 shadow-soft">Carregando suas escutas...</div> : null}
      {error ? <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div> : null}

      {!loading && !error && records.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-semear-earth">
            <UserRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-semear-green">Nenhuma escuta vinculada ao seu perfil</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
            Quando você digitar fichas autenticado(a), elas aparecerão aqui. Se você já entrevista em campo, peça à coordenação para vincular seu cadastro da equipe ao seu login.
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {records.map((record) => (
          <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-semear-green/25" key={record.id}>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getSourceTypeLabel(record.source_type)}</span>
              <span className="rounded-full bg-semear-yellow/35 px-3 py-1 text-xs font-semibold text-semear-green">{getReviewStatusLabel(record.review_status)}</span>
              {record.sourceMatches.map((source) => (
                <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700" key={source}>
                  {source === "digitada" ? "Digitada por você" : "Vínculo de entrevistador(a)"}
                </span>
              ))}
            </div>
            <p className="mt-4 line-clamp-3 text-base font-semibold leading-7 text-semear-green">{record.free_speech_text}</p>
            <div className="mt-4 grid gap-2 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {new Date(`${record.date}T00:00:00`).toLocaleDateString("pt-BR")}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                {record.actions?.title ?? "Sem ação vinculada"}
              </span>
              <span>Bairro da ação: {record.neighborhoods?.name ?? "Sem bairro"}</span>
              <span>Território de referência: {record.respondent_neighborhoods?.name ?? record.respondent_city ?? "Não informado"}</span>
              <span>Entrevistador(a): {record.interviewer_team_member?.display_name ?? record.interviewer_name}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {record.listening_record_themes.slice(0, 4).map((item) =>
                item.themes ? (
                  <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-600" key={item.themes.id}>
                    {item.themes.name}
                  </span>
                ) : null
              )}
            </div>
            <Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white sm:w-auto" href={`/escutas/${record.id}`}>
              Abrir ficha
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <strong className="mt-2 block text-3xl font-semibold text-semear-green">{value}</strong>
    </div>
  );
}
