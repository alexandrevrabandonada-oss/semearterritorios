/**
 * Componentes de renderização de análises determinísticas
 * Usados no dossier e devolutiva
 * Tarefa 3-10: Sinais, matriz, coocorrência, leitura territorial, ocupação, etc.
 */

"use client";

import type {
  ActionAnalytics,
  AnalyticalSignal,
  ThemeCooccurrence,
  ThemeRanking,
  OccupationDetail,
  MethodologicalWarning
} from "@/lib/action-analytics";
import { AlertTriangle, TrendingUp, Zap, MapPin, Briefcase, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

// ============= Analytical Signals Panel (Tarefa 3) =============

export function AnalyticalSignalsPanel({ signals }: { signals: AnalyticalSignal[] }) {
  if (signals.length === 0) {
    return (
      <Panel title="Sinais fortes da escuta" icon={<Zap className="h-5 w-5" />}>
        <p className="text-sm text-stone-600">Nenhum sinal forte detectado ainda.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Sinais fortes da escuta" icon={<Zap className="h-5 w-5" />}>
      <div className="space-y-3">
        {signals.map((signal, idx) => (
          <SignalCard key={idx} signal={signal} />
        ))}
      </div>
    </Panel>
  );
}

function SignalCard({ signal }: { signal: AnalyticalSignal }) {
  const bgColor =
    signal.severity === "critical"
      ? "border-red-200 bg-red-50"
      : signal.severity === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-blue-200 bg-blue-50";

  const textColor =
    signal.severity === "critical"
      ? "text-red-900"
      : signal.severity === "warning"
        ? "text-amber-900"
        : "text-blue-900";

  const icon =
    signal.severity === "critical"
      ? <AlertCircle className="h-4 w-4" />
      : signal.severity === "warning"
        ? <AlertTriangle className="h-4 w-4" />
        : <TrendingUp className="h-4 w-4" />;

  return (
    <div className={`rounded-2xl border p-3 ${bgColor}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${textColor}`}>{icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${textColor}`}>{signal.title}</p>
          <p className={`mt-1 text-xs leading-5 ${textColor}`}>{signal.description}</p>
          {signal.actionable && <p className={`mt-2 text-xs font-medium ${textColor}`}>→ {signal.actionable}</p>}
        </div>
      </div>
    </div>
  );
}

// ============= Theme × Priority Matrix (Tarefa 4) =============

export function ThemeMatrixPanel({ analytics }: { analytics: ActionAnalytics }) {
  const topThemes = analytics.themeRanking.slice(0, analytics.themeTopCount);

  if (topThemes.length === 0) {
    return (
      <Panel title="Matriz de temas e prioridades" icon={<TrendingUp className="h-5 w-5" />}>
        <p className="text-sm text-stone-600">Nenhum tema registrado ainda.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Matriz de temas e prioridades" icon={<TrendingUp className="h-5 w-5" />}>
      <div className="space-y-2">
        {topThemes.map((theme) => (
          <div key={theme.id} className="rounded-lg bg-semear-offwhite p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-semear-green">{theme.name}</p>
                <p className="mt-1 text-xs text-stone-600">{theme.count} escuta(s) · {theme.percentage}% do total</p>
              </div>
              <div className="ml-4">
                <div className="h-2 w-24 rounded-full bg-stone-200">
                  <div
                    className="h-2 rounded-full bg-semear-green"
                    style={{ width: `${Math.min(theme.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-600">
        Temas aparecem como marcações nas fichas de escuta. Cada tema pode estar associado a múltiplas escutas e prioridades.
      </p>
    </Panel>
  );
}

// ============= Theme Cooccurrence (Tarefa 5) =============

export function ThemeCooccurrencePanel({ cooccurrences }: { cooccurrences: ThemeCooccurrence[] }) {
  if (cooccurrences.length === 0) {
    return (
      <Panel title="Temas que aparecem juntos" icon={<TrendingUp className="h-5 w-5" />}>
        <p className="text-sm text-stone-600">Nenhuma coocorrência registrada ainda.</p>
      </Panel>
    );
  }

  const topCooccurrences = cooccurrences.slice(0, 10);

  return (
    <Panel title="Temas que aparecem juntos" icon={<TrendingUp className="h-5 w-5" />}>
      <div className="space-y-2">
        {topCooccurrences.map((cooc, idx) => (
          <div key={idx} className="rounded-lg bg-semear-offwhite p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-semear-green">{cooc.theme1}</span>
              <span className="text-stone-400">+</span>
              <span className="font-semibold text-semear-green">{cooc.theme2}</span>
              <span className="ml-auto rounded-full bg-semear-yellow px-2 py-1 text-xs font-semibold text-stone-800">
                {cooc.cooccurrenceCount}x
              </span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-stone-200">
              <div
                className="h-1 rounded-full bg-semear-yellow"
                style={{ width: `${Math.min(cooc.percentage, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-stone-600">{cooc.percentage}% das escutas</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-600">
        Temas coocorrem quando ambos são mencionados na mesma escuta. Padrões de coocorrência revelam elos temáticos metodológicos.
      </p>
    </Panel>
  );
}

// ============= Territorial Reading (Tarefa 6) =============

export function TerritorialReadingPanel({ analytics }: { analytics: ActionAnalytics }) {
  const { actionTerritory, territorialQuality, respondentTerritories } = analytics;

  const alertLevel =
    territorialQuality.status === "crítica"
      ? "border-red-200 bg-red-50 text-red-900"
      : territorialQuality.status === "atenção"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-green-200 bg-green-50 text-green-900";

  return (
    <Panel title="Leitura territorial responsável" icon={<MapPin className="h-5 w-5" />}>
      <div className={`rounded-2xl border p-4 ${alertLevel}`}>
        <p className="font-semibold">Cobertura de território de referência: {territorialQuality.coveragePercent}%</p>
        <p className="mt-1 text-sm">
          {territorialQuality.recordsWithTerritory} de {territorialQuality.totalRecords} escutas com território de referência preenchido.
        </p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.05em]">Status: {territorialQuality.status}</p>
        {territorialQuality.status === "crítica" && (
          <p className="mt-2 text-sm font-semibold">
            ⚠️ Análises por bairro devem ser evitadas. Use apenas agregados territoriais.
          </p>
        )}
        {territorialQuality.status === "atenção" && (
          <p className="mt-2 text-sm font-semibold">
            ⚠️ Revisão territorial recomendada. Análises por bairro devem incluir ressalva.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-semear-offwhite p-4">
        <p className="font-semibold text-semear-green">Território da ação</p>
        <p className="mt-2 text-sm">{actionTerritory.name}</p>
        <p className="text-xs text-stone-600">{actionTerritory.recordsCollected} escuta(s) coletada(s)</p>
      </div>

      {respondentTerritories.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="font-semibold text-semear-green">Distribuição por território de referência</p>
          {respondentTerritories.slice(0, 8).map((terr) => (
            <div key={terr.neighborhoodId} className="rounded-lg bg-semear-offwhite p-3">
              <p className="font-semibold text-semear-green">{terr.neighborhoodName}</p>
              <p className="mt-1 text-xs text-stone-600">{terr.recordCount} escuta(s)</p>
              {terr.topThemes.length > 0 && (
                <p className="mt-2 text-xs text-stone-600">
                  Temas: {terr.topThemes.slice(0, 3).map((t) => `${t.name}`).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-600">
        Territorio de referência: bairro informado pelo entrevistado. Não é o endereço dele, é sua área de atuação ou referência territorial.
      </p>
    </Panel>
  );
}

// ============= Occupation Reading (Tarefa 7) =============

export function OccupationReadingPanel({ occupations, withoutCount }: { occupations: OccupationDetail[]; withoutCount: number }) {
  const safeOccupations = occupations.filter((o) => o.minFrequencyMet && !o.isSensitive);

  return (
    <Panel title="O que aparece por ocupação / atividade" icon={<Briefcase className="h-5 w-5" />}>
      {safeOccupations.length === 0 ? (
        <p className="text-sm text-stone-600">Nenhuma ocupação com frequência suficiente para agregação segura.</p>
      ) : (
        <div className="space-y-3">
          {safeOccupations.slice(0, 8).map((occ) => (
            <div key={`${occ.occupation}`} className="rounded-lg bg-semear-offwhite p-3">
              <p className="font-semibold text-semear-green">{occ.occupation}</p>
              <p className="mt-1 text-xs text-stone-600">
                {occ.count} escuta(s) · {occ.percentage}%
              </p>
              {occ.topThemes.length > 0 && (
                <p className="mt-2 text-xs text-stone-600">
                  Temas principais: {occ.topThemes.slice(0, 3).map((t) => t.name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {withoutCount > 0 && (
        <div className="mt-3 rounded-lg bg-stone-100 p-3">
          <p className="text-xs text-stone-700">{withoutCount} escuta(s) sem ocupação informada</p>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-600">
        Agregação segura: apenas ocupações com ≥2 escutas são exibidas. Ocupações raras são agrupadas para proteção de privacidade.
      </p>
    </Panel>
  );
}

// ============= Places Panel (Tarefa 8) =============

export function PlacesPanelImproved({ places }: { places: Array<{ place: string; count: number; isSensitive: boolean }> }) {
  const safePlaces = places.filter((p) => !p.isSensitive).slice(0, 12);
  const sensitiveCount = places.filter((p) => p.isSensitive).length;

  return (
    <Panel title="Lugares mencionados" icon={<MapPin className="h-5 w-5" />}>
      {safePlaces.length === 0 ? (
        <p className="text-sm text-stone-600">Nenhum lugar mencionado com segurança para exibição.</p>
      ) : (
        <div className="space-y-2">
          {safePlaces.map((place, idx) => (
            <div key={idx} className="rounded-lg bg-semear-offwhite p-3">
              <p className="font-semibold text-semear-green">{place.place}</p>
              <p className="mt-1 text-xs text-stone-600">{place.count} menção(ões)</p>
            </div>
          ))}
        </div>
      )}

      {sensitiveCount > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">{sensitiveCount} lugar(es) sensível(is) ocultado(s)</p>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-600">
        Lugar mencionado é uma referência territorial citada na fala, não o endereço do entrevistado. Dados sensíveis (endereços, CEP, números de rua) são automaticamente ocultados.
      </p>
    </Panel>
  );
}

// ============= Methodological Warnings (used in both dossier and public debrief) =============

export function MethodologicalWarningsPanel({ warnings }: { warnings: MethodologicalWarning[] }) {
  if (warnings.length === 0) return null;

  const criticalWarnings = warnings.filter((w) => w.severity === "critical");
  const regularWarnings = warnings.filter((w) => w.severity !== "critical");

  return (
    <Panel title="Ressalvas metodológicas" icon={<AlertTriangle className="h-5 w-5" />}>
      {criticalWarnings.length > 0 && (
        <div className="space-y-2 mb-4">
          {criticalWarnings.map((warning, idx) => (
            <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-900">{warning.title}</p>
              <p className="mt-1 text-xs text-red-900">{warning.description}</p>
              {warning.blocksPublish && (
                <p className="mt-2 text-xs font-semibold text-red-900">🚫 Bloqueia publicação</p>
              )}
            </div>
          ))}
        </div>
      )}

      {regularWarnings.length > 0 && (
        <div className="space-y-2">
          {regularWarnings.map((warning, idx) => (
            <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">{warning.title}</p>
              <p className="mt-1 text-xs text-amber-900">{warning.description}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ============= Suggested Next Steps (Tarefa 10) =============

export function SuggestedNextStepsPanel({ steps }: { steps: Array<{ title: string; description: string; priority: string }> }) {
  if (steps.length === 0) {
    return (
      <Panel title="Próximos encaminhamentos sugeridos" icon={<Zap className="h-5 w-5" />}>
        <p className="text-sm text-stone-600">Nenhum encaminhamento sugerido automaticamente.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Próximos encaminhamentos sugeridos" icon={<Zap className="h-5 w-5" />}>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-3 ${step.priority === "high" ? "border-semear-yellow bg-semear-yellow/10" : "border-blue-200 bg-blue-50"}`}
          >
            <p className="font-semibold text-semear-green">{step.title}</p>
            <p className="mt-1 text-sm leading-5 text-stone-700">{step.description}</p>
            {step.priority === "high" && (
              <p className="mt-2 text-xs font-semibold text-semear-earth">⭐ Prioridade: alta</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-stone-600">
        Encaminhamentos são sugestões determinísticas baseadas em dados coletados. A equipe deve revisar e adaptar conforme necessário.
      </p>
    </Panel>
  );
}

// ============= Helper: Generic Panel Component =============

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
