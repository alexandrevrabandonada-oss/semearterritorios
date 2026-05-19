"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, LockKeyhole, MapPinned, ShieldAlert } from "lucide-react";
import type { InternalMapHomologation, Neighborhood, NormalizedPlace, PlaceMentioned, Theme } from "@/lib/database.types";
import { getHomologationDecisionLabel, getHomologationStatusLabel, getLatestMapHomologation } from "@/lib/internal-map-homologation-records";
import { buildInternalMapScope, buildInternalMapTerritories } from "@/lib/internal-map-scope";
import { buildNormalizedPlacesQuality } from "@/lib/normalized-places-quality";
import { buildTerritorialQualityByNeighborhood } from "@/lib/territorial-quality";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { InternalMapTerritory } from "@/types/internal-map";

type PlaceMentionForQuality = Pick<PlaceMentioned, "id" | "normalized_place_id" | "place_type">;

type RecordForGate = TerritorialReviewRecord & {
  listening_record_themes?: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type GateResult = "Bloqueado" | "Pendente de homologação" | "Autorizado para protótipo" | "Manter mapa-lista por enquanto";

export function InternalMapGate() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [homologation, setHomologation] = useState<InternalMapHomologation | null>(null);
  const [records, setRecords] = useState<RecordForGate[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [normalizedPlaces, setNormalizedPlaces] = useState<NormalizedPlace[]>([]);
  const [placesMentioned, setPlacesMentioned] = useState<PlaceMentionForQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir o portão do mapa interno.");
        setLoading(false);
        return;
      }

      const [homologationResult, recordsResult, neighborhoodsResult, normalizedResult, placesResult] = await Promise.all([
        getLatestMapHomologation(supabase).then((data) => ({ data, error: null })).catch((err: Error) => ({ data: null, error: err })),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))"),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("normalized_places").select("*").order("normalized_name", { ascending: true }),
        supabase.from("places_mentioned").select("id, normalized_place_id, place_type")
      ]);

      if (ignore) return;

      if (homologationResult.error || recordsResult.error || neighborhoodsResult.error || normalizedResult.error || placesResult.error) {
        setError(
          homologationResult.error?.message ??
            recordsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            normalizedResult.error?.message ??
            placesResult.error?.message ??
            "Erro ao carregar o portão do mapa interno."
        );
        setLoading(false);
        return;
      }

      setHomologation(homologationResult.data);
      setRecords((recordsResult.data ?? []) as RecordForGate[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setNormalizedPlaces((normalizedResult.data ?? []) as NormalizedPlace[]);
      setPlacesMentioned((placesResult.data ?? []) as PlaceMentionForQuality[]);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando portão técnico do mapa interno...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const territoryQuality = buildTerritorialQualityByNeighborhood(neighborhoods, records);
  const normalizedQuality = buildNormalizedPlacesQuality({ normalizedPlaces, placesMentioned, neighborhoods, territoryQuality });
  const scope = buildInternalMapScope({ neighborhoods, records, normalizedQuality });
  const territories = buildInternalMapTerritories({ neighborhoods, records });
  const mapPrototypeAuthorized = isPrototypeAuthorized(homologation);
  const result = getGateResult(homologation);
  const pending = getPendingItems(homologation, scope);

  return (
    <section className="pb-10">
      <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-6 shadow-premium-md sm:p-8 hover:shadow-premium-lg transition-all duration-200">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-semear-earth">Portão técnico</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-semear-green">Mapa Interno Autenticado</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Protótipo condicionado à homologação persistente. Esta tela não renderiza mapa geográfico, não usa coordenadas e não expõe fala original, dados pessoais ou lugares sensíveis.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ActionLink href="/territorios/mapa/homologacao">Abrir homologação</ActionLink>
          <ActionLink href="/territorios/qualidade" variant="secondary">Ver qualidade territorial</ActionLink>
          <ActionLink href="/territorios/normalizacao/qualidade" variant="secondary">Ver qualidade da normalização</ActionLink>
          <ActionLink href="/mapa" variant="secondary">Voltar ao mapa-lista</ActionLink>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className={`rounded-3xl border p-6 shadow-premium-md backdrop-blur-md ${mapPrototypeAuthorized ? "border-green-200 bg-green-50/80 text-green-950" : "border-amber-200/50 bg-amber-50/85 text-amber-950"}`}>
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${mapPrototypeAuthorized ? "bg-green-100/80 text-green-800" : "bg-amber-100/80 text-amber-900"}`}>
              {mapPrototypeAuthorized ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <LockKeyhole className="h-6 w-6" aria-hidden="true" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-semear-earth">Resultado</p>
              <h3 className={`mt-2 text-3xl font-extrabold ${mapPrototypeAuthorized ? "text-green-900" : "text-amber-950"}`}>{result}</h3>
              <p className="mt-3 text-sm leading-6 font-semibold">
                {mapPrototypeAuthorized
                  ? "Há homologação persistente aprovada com decisão go_prototipo_interno. O próximo tijolo pode iniciar o protótipo, ainda mantendo autenticação, agregação e privacidade."
                  : "O protótipo do mapa interno ainda não está liberado. Para avançar, é necessário aprovar uma homologação persistente com decisão go_prototipo_interno."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-6 shadow-premium-md hover:shadow-premium-lg transition-all duration-200">
          <h3 className="text-xl font-extrabold text-semear-green">Homologação persistente</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Status" value={getHomologationStatusLabel(homologation?.status)} />
            <Info label="Decisão" value={getHomologationDecisionLabel(homologation?.decision)} />
            <Info label="Aprovada em" value={homologation?.approved_at ? formatDateTime(homologation.approved_at) : "Sem aprovação"} />
            <Info label="Responsável" value={homologation?.approved_by ?? "Não registrado nesta tela"} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/60 bg-white/60 p-4 text-sm leading-6 text-stone-700 font-medium">
            <strong className="text-semear-green">Justificativa: </strong>
            {homologation?.decision_reason ?? "Nenhuma homologação persistente foi criada ainda."}
          </div>
        </section>
      </div>

      {!mapPrototypeAuthorized ? (
        <section className="mt-5 rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-6 shadow-premium-md hover:shadow-premium-lg transition-all duration-200">
          <div className="mb-4 flex items-center gap-3 text-semear-green">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <h3 className="text-xl font-extrabold text-semear-green">Checklist que bloqueia o protótipo</h3>
          </div>
          <div className="mb-4 rounded-2xl border border-amber-200/50 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950 font-bold shadow-premium-sm">
            <strong>Tijolo 027 bloqueado para mapa visual.</strong> Esta tela só pode avançar para protótipo quando o último registro persistente estiver aprovado e a decisão for exatamente <strong>go_prototipo_interno</strong>. Enquanto isso, mantenha o mapa-lista V0 e use a homologação para resolver as pendências abaixo.
          </div>
          <div className="mb-4 rounded-2xl border border-semear-green/20 bg-semear-green-soft/40 p-5 shadow-premium-sm">
            <p className="font-bold text-semear-green">Para liberar o protótipo, siga o kit de homologação real.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <KitItem>docs/checklist-homologacao-real-mapa.md</KitItem>
              <KitItem>docs/teste-manual-rls-mapa.md</KitItem>
              <KitItem>docs/evidencias-homologacao-mapa.md</KitItem>
              <div className="w-full mt-2 flex flex-wrap gap-2">
                <Link className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-bold text-semear-green shadow-premium-sm hover:bg-white active:scale-[0.98] transition-all duration-200" href="/territorios/mapa/homologacao">Abrir homologação persistente</Link>
                <Link className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-bold text-semear-green shadow-premium-sm hover:bg-white active:scale-[0.98] transition-all duration-200" href="/territorios/qualidade">Ver qualidade territorial</Link>
                <Link className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-bold text-semear-green shadow-premium-sm hover:bg-white active:scale-[0.98] transition-all duration-200" href="/territorios/normalizacao/qualidade">Ver qualidade da normalização</Link>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((item) => <ChecklistItem checked={item.ok} key={item.label} label={item.label} detail={item.detail} />)}
          </div>
        </section>
      ) : (
        <AggregatedPreview scope={scope} territories={territories} />
      )}
    </section>
  );
}

function AggregatedPreview({ scope, territories }: { scope: ReturnType<typeof buildInternalMapScope>; territories: InternalMapTerritory[] }) {
  const readyTerritories = territories.filter((item) => item.territorialQuality === "bom para mapa interno" && item.privacy.safeForInternalMap);
  const blockedTerritories = territories.filter((item) => item.privacy.hasSensitivePlaces || item.privacy.hasSensitivePlaceTypes);

  return (
    <section className="mt-5 rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-6 shadow-premium-md">
      <div className="flex items-start gap-3">
        <MapPinned className="mt-1 h-5 w-5 text-semear-green" aria-hidden="true" />
        <div>
          <h3 className="text-xl font-extrabold text-semear-green">Pré-visão textual dos dados agregados</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Esta prévia mostra apenas agregados seguros para orientar o futuro protótipo. Não há mapa visual, coordenadas, falas originais, entrevistadores ou lugares marcados como sensíveis.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Territórios com dados" value={scope.territoriesWithData} />
        <Metric label="Escutas revisadas" value={scope.reviewedRecords} />
        <Metric label="Territórios prontos" value={readyTerritories.length} />
        <Metric label="Lugares seguros" value={scope.safeNormalizedPlaces} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PreviewPanel title="Temas agregados por território">
          {scope.aggregatedThemesByTerritory.filter((item) => item.themes.length > 0).slice(0, 6).map((item) => (
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-premium-sm" key={item.neighborhoodId}>
              <p className="font-bold text-semear-green">{item.neighborhoodName}</p>
              <p className="mt-2 text-sm leading-6 text-stone-700 font-semibold">
                {item.themes.slice(0, 5).map((theme) => `${theme.themeName} (${theme.count})`).join("; ")}
              </p>
            </div>
          ))}
        </PreviewPanel>

        <PreviewPanel title="Lugares normalizados seguros">
          {readyTerritories.slice(0, 6).map((territory) => (
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-premium-sm" key={territory.neighborhoodId}>
              <p className="font-bold text-semear-green">{territory.neighborhoodName}</p>
              <p className="mt-2 text-sm leading-6 text-stone-700 font-semibold">
                {territory.places.length > 0 ? territory.places.slice(0, 5).map((place) => `${place.normalizedName} (${place.count})`).join("; ") : "Sem lugar normalizado seguro neste território."}
              </p>
            </div>
          ))}
        </PreviewPanel>
      </div>

      {blockedTerritories.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 shadow-premium-sm">
          <ShieldAlert className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Há {blockedTerritories.length} território(s) bloqueado(s) por privacidade. Eles não devem alimentar protótipo até revisão.
        </div>
      ) : null}
    </section>
  );
}

function getGateResult(homologation: InternalMapHomologation | null): GateResult {
  if (!homologation) return "Pendente de homologação";
  if (isPrototypeAuthorized(homologation)) return "Autorizado para protótipo";
  if (homologation.decision === "manter_mapa_lista") return "Manter mapa-lista por enquanto";
  return "Bloqueado";
}

function isPrototypeAuthorized(homologation: InternalMapHomologation | null) {
  return homologation?.status === "approved" && homologation.decision === "go_prototipo_interno";
}

function getPendingItems(homologation: InternalMapHomologation | null, scope: ReturnType<typeof buildInternalMapScope>) {
  return [
    { label: "Homologação criada", ok: Boolean(homologation), detail: homologation ? "Registro persistente encontrado." : "Crie um registro em /territorios/mapa/homologacao." },
    { label: "Homologação revisada", ok: homologation?.status === "reviewed" || homologation?.status === "approved", detail: `Status atual: ${getHomologationStatusLabel(homologation?.status)}.` },
    { label: "Homologação aprovada", ok: homologation?.status === "approved", detail: homologation?.approved_at ? `Aprovada em ${formatDateTime(homologation.approved_at)}.` : "Ainda não aprovada." },
    { label: "Decisão go_prototipo_interno", ok: homologation?.decision === "go_prototipo_interno", detail: `Decisão atual: ${getHomologationDecisionLabel(homologation?.decision)}.` },
    { label: "RLS validada", ok: Boolean(homologation?.rls_validated), detail: "Validação é manual e precisa estar marcada no registro persistente." },
    { label: "20+ escutas revisadas", ok: scope.reviewedRecords >= 20, detail: `${scope.reviewedRecords} escuta(s) revisada(s).` },
    { label: "3+ territórios", ok: scope.territoriesWithData >= 3, detail: `${scope.territoriesWithData} território(s) com dados.` },
    { label: "Sem sensíveis", ok: scope.sensitivePlaces === 0, detail: `${scope.sensitivePlaces} lugar(es) sensível(is) no recorte.` },
    { label: "Sem duplicidades relevantes", ok: scope.duplicateWarnings === 0, detail: `${scope.duplicateWarnings} possível(is) duplicidade(s).` }
  ];
}

function ActionLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const classes = variant === "primary"
    ? "bg-semear-green text-white hover:bg-semear-green/90"
    : "border border-white/60 bg-white/80 text-semear-green hover:bg-white";
  return <Link className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold shadow-premium-sm transition-all duration-200 active:scale-[0.98] ${classes}`} href={href}>{children}</Link>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/65 p-4 shadow-premium-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-semear-green">{value}</p>
    </div>
  );
}

function ChecklistItem({ checked, label, detail }: { checked: boolean; label: string; detail: string }) {
  return (
    <article className={`rounded-2xl border p-4 shadow-premium-sm ${checked ? "border-green-200 bg-green-50/80 font-bold" : "border-amber-200 bg-amber-50/80 font-bold"}`}>
      <p className={`font-extrabold ${checked ? "text-green-900" : "text-amber-950"}`}>{checked ? "OK" : "Pendente"} · {label}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700 font-semibold">{detail}</p>
    </article>
  );
}

function KitItem({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-2 font-bold text-stone-700 shadow-premium-sm">{children}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-5 shadow-premium-sm">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <strong className="mt-2 block text-3xl font-extrabold text-semear-green">{value}</strong>
    </article>
  );
}

function PreviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/85 backdrop-blur-md p-5 shadow-premium-sm">
      <h4 className="font-extrabold text-semear-green text-lg">{title}</h4>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-3xl p-5 text-sm shadow-premium-md backdrop-blur-md ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800 font-bold" : "border border-white/60 bg-white/80 text-stone-600 font-semibold"}`}>{children}</div>;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
