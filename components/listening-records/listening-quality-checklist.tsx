import { CheckCircle2, XCircle } from "lucide-react";

type EscutaForChecklist = {
  free_speech_text?: string | null;
  action_id?: string | null;
  neighborhood_id?: string | null;
  date?: string | null;
  theme_count?: number;
  unexpected_notes?: string | null;
  team_summary?: string | null;
  priority_mentioned?: string | null;
};

export function ListeningQualityChecklist({ record }: { record: EscutaForChecklist }) {
  const checks = [
    {
      label: "Fala original registrada",
      passed: Boolean(record.free_speech_text?.trim()),
    },
    {
      label: "Ação vinculada",
      passed: Boolean(record.action_id),
    },
    {
      label: "Bairro preenchido",
      passed: Boolean(record.neighborhood_id),
    },
    {
      label: "Data preenchida",
      passed: Boolean(record.date),
    },
    {
      label: "Resumo da equipe elaborado",
      passed: Boolean(record.team_summary?.trim()),
    },
    {
      label: "Tema marcado ou nota inesperada",
      passed: (record.theme_count ?? 0) > 0 || Boolean(record.unexpected_notes?.trim()),
    },
    {
      label: "Prioridade apontada",
      passed: Boolean(record.priority_mentioned?.trim()),
    },
  ];

  const allPassed = checks.every((c) => c.passed);

  return (
    <div className="rounded-2xl border border-semear-green/15 bg-white/78 p-5 shadow-soft">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth mb-4">
        Qualidade do Dado
      </h4>
      <ul className="space-y-3">
        {checks.map((check, index) => (
          <li key={index} className="flex items-start gap-3 text-sm">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
            )}
            <span className={check.passed ? "text-stone-700" : "text-stone-500 line-through decoration-red-500/50"}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
      {allPassed ? (
        <div className="mt-4 rounded-xl bg-green-50 p-3 text-xs font-medium text-green-800 border border-green-200">
          Esta escuta atende aos critérios mínimos de revisão.
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-800 border border-red-200">
          Pendências identificadas. Escuta não pronta para relatórios oficiais.
        </div>
      )}
    </div>
  );
}
