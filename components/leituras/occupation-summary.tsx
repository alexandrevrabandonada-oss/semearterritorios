"use client";

type Occupation = {
  name: string;
  count: number;
};

type OccupationSummaryProps = {
  occupations: Occupation[];
};

export function OccupationSummary({ occupations }: OccupationSummaryProps) {
  const total = occupations.reduce((sum, o) => sum + o.count, 0);

  if (occupations.length === 0) {
    return <p className="text-sm text-stone-500 italic">Nenhum dado de ocupação informado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {occupations.map((occ) => {
          const percentage = ((occ.count / total) * 100).toFixed(1);
          return (
            <div key={occ.name} className="flex flex-col rounded-2xl border border-white/60 bg-white/80 p-5 shadow-premium-sm transition-all hover:bg-white/40 duration-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-stone-900 truncate" title={occ.name}>{occ.name}</span>
                <span className="text-[10px] font-bold text-stone-400">{percentage}%</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 rounded-full bg-stone-100/50 overflow-hidden border border-stone-200/20 shadow-inner">
                  <div 
                    className="h-full bg-semear-green transition-all" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-semear-green">{occ.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-premium-sm">
        <p className="text-[10px] leading-relaxed text-blue-800 italic font-medium">
          * Para garantir a privacidade, ocupações raras (com menos de 3 ocorrências) são automaticamente agrupadas em &quot;Outras&quot; para evitar a reidentificação de indivíduos em territórios pequenos.
        </p>
      </div>
    </div>
  );
}
