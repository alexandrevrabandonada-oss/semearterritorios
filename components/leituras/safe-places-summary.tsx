"use client";

import { MapPin } from "lucide-react";

type SafePlace = {
  name: string;
  territory: string;
  count: number;
};

type SafePlacesSummaryProps = {
  places: SafePlace[];
};

export function SafePlacesSummary({ places }: SafePlacesSummaryProps) {
  if (places.length === 0) {
    return <p className="text-sm text-stone-500 italic">Nenhum lugar mencionado seguro identificado.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {places.slice(0, 15).map((place) => (
        <div key={`${place.name}-${place.territory}`} className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-premium-sm transition-all hover:bg-white/40 duration-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-semear-green-soft text-semear-green shadow-premium-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-stone-900" title={place.name}>{place.name}</h4>
            <p className="truncate text-[10px] text-stone-500 font-bold uppercase tracking-wider">{place.territory}</p>
          </div>
          <div className="ml-auto text-xs font-bold text-semear-green bg-semear-green-soft/30 px-2.5 py-1 rounded-full border border-semear-green-soft/40 shadow-premium-sm">
            {place.count}
          </div>
        </div>
      ))}
      {places.length > 15 && (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-semear-green/20 bg-white/50 p-4 shadow-premium-sm">
          <p className="text-[11px] font-bold text-stone-400">+ {places.length - 15} outros lugares mencionados</p>
        </div>
      )}
    </div>
  );
}
