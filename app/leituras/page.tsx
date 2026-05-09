import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { 
  getCollectiveOverview, 
  getRespondentTerritoryDistribution, 
  getTerritoryThemeMatrix, 
  getTerritoryWordSummary, 
  getOccupationSummary, 
  getSilenceAndCoverageGaps, 
  getActionVsRespondentTerritoryFlow, 
  getSafeMentionedPlacesSummary 
} from "@/lib/collective-readings";
import { TerritoryThemeMatrix } from "@/components/leituras/territory-theme-matrix";
import { WordPatternsPanel } from "@/components/leituras/word-patterns-panel";
import { SilenceGapsPanel } from "@/components/leituras/silence-gaps-panel";
import { OccupationSummary } from "@/components/leituras/occupation-summary";
import { ActionRespondentFlow } from "@/components/leituras/action-respondent-flow";
import { SafePlacesSummary } from "@/components/leituras/safe-places-summary";
import { LeiturasHeader } from "@/components/leituras/leituras-header";
import { BarChart3, Users, Map, MessageSquare, Briefcase, Sparkles, Info } from "lucide-react";
import Link from "next/link";

export default async function LeiturasPage() {
  const supabase = createSupabaseServerClient();
  
  const [
    overview,
    territoryDist,
    themeMatrix,
    wordSummary,
    occupationSummary,
    gaps,
    flow,
    safePlaces
  ] = await Promise.all([
    getCollectiveOverview(supabase),
    getRespondentTerritoryDistribution(supabase),
    getTerritoryThemeMatrix(supabase),
    getTerritoryWordSummary(supabase),
    getOccupationSummary(supabase),
    getSilenceAndCoverageGaps(supabase),
    getActionVsRespondentTerritoryFlow(supabase),
    getSafeMentionedPlacesSummary(supabase)
  ]);

  return (
    <AppShell activeHref="/leituras">
      <div className="pb-10">
        <LeiturasHeader 
          overview={overview} 
          territoryDist={territoryDist} 
          themeMatrix={themeMatrix} 
          wordSummary={wordSummary} 
          gaps={gaps} 
        />

        <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            <StatCard label="Escutas" value={overview.total_records} icon={<MessageSquare className="h-4 w-4" />} />
            <StatCard label="Revisadas" value={overview.reviewed_records} icon={<Sparkles className="h-4 w-4" />} tone="green" />
            <StatCard label="Bairros" value={overview.territories_reached} icon={<Map className="h-4 w-4" />} />
            <StatCard label="Temas" value={overview.total_themes} icon={<BarChart3 className="h-4 w-4" />} />
            <StatCard label="Ocupações" value={overview.total_occupations} icon={<Briefcase className="h-4 w-4" />} />
            <StatCard label="Sem Bairro" value={overview.records_without_respondent_neighborhood} icon={<Info className="h-4 w-4" />} tone="amber" />
            <StatCard label="Sem Revisão" value={overview.records_without_review} icon={<Info className="h-4 w-4" />} tone="amber" />
            <StatCard label="Lacunas" value={overview.territories_without_records} icon={<Info className="h-4 w-4" />} tone="red" />
          </div>

        <div className="mt-8 grid gap-8">
          <Section title="Temas por Território" icon={<BarChart3 className="h-5 w-5" />} description="Intensidade de temas identificados nos territórios de fala dos entrevistados.">
            <TerritoryThemeMatrix 
              matrix={themeMatrix.matrix} 
              themeMap={themeMatrix.themeMap} 
              territoryNames={themeMatrix.territoryNames} 
            />
          </Section>

          <Section title="Palavras Recorrentes" icon={<Sparkles className="h-5 w-5" />} description="Padrões de fala e termos mais citados pela população nas escutas revisadas.">
            <WordPatternsPanel 
              territoryWords={wordSummary.territoryWords} 
              territoryNames={wordSummary.territoryNames} 
            />
          </Section>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <Section title="Fluxo de Escuta" icon={<Map className="h-5 w-5" />} description="Relação entre o local da banca (Ação) e o território de referência do entrevistado.">
              <ActionRespondentFlow 
                flow={flow.flow} 
                actionTerritoryNames={flow.actionTerritoryNames} 
                respTerritoryNames={flow.respTerritoryNames} 
              />
            </Section>

            <Section title="Ocupações" icon={<Briefcase className="h-5 w-5" />} description="Perfil de atividade principal das pessoas escutadas (dados agregados).">
              <OccupationSummary occupations={occupationSummary} />
            </Section>
          </div>

          <Section title="Silêncios e Lacunas" icon={<Info className="h-5 w-5" />} description="Identificação de territórios que ainda precisam de maior cobertura operacional.">
            <SilenceGapsPanel gaps={gaps} />
          </Section>

          <Section title="Lugares Mencionados" icon={<Map className="h-5 w-5" />} description="Pontos de referência e lugares citados espontaneamente (apenas públicos e seguros).">
            <SafePlacesSummary places={safePlaces} />
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, icon, description, children }: { title: string; icon: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-semear-green-soft text-semear-green">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{title}</h2>
          <p className="text-xs text-stone-500 font-medium">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon, tone = "stone" }: { label: string; value: number; icon: React.ReactNode; tone?: "stone" | "green" | "amber" | "red" }) {
  const colors = {
    stone: "bg-stone-50 text-stone-600 border-stone-100",
    green: "bg-semear-green-soft text-semear-green border-semear-green/10",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${colors[tone]}`}>
      <div className="flex items-center gap-2 opacity-70">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
