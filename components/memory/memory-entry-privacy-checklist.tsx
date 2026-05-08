"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { 
  getMemoryChecklistItems, 
  MemoryChecklistKey, 
  MemoryChecklistState 
} from "@/lib/memory-privacy";

type MemoryEntryPrivacyChecklistProps = {
  checklist: MemoryChecklistState;
  onChange?: (key: MemoryChecklistKey, value: boolean) => void;
  disabled?: boolean;
};

export function MemoryEntryPrivacyChecklist({ 
  checklist, 
  onChange, 
  disabled 
}: MemoryEntryPrivacyChecklistProps) {
  const items = getMemoryChecklistItems();
  const allChecked = items.every((item) => checklist[item.key]);

  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${allChecked ? "bg-semear-green-soft text-semear-green" : "bg-amber-50 text-amber-600"}`}>
          {allChecked ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
        <div>
          <h4 className="font-semibold text-semear-green">Checklist de Privacidade</h4>
          <p className="text-xs text-stone-500">
            Obrigatório para memórias candidatas ou aprovadas para o público.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <label 
            key={item.key} 
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checklist[item.key] ? "border-semear-green/20 bg-white" : "border-stone-200 bg-stone-50/50"} ${disabled ? "cursor-not-allowed opacity-70" : "hover:border-semear-green/30"}`}
          >
            <input 
              type="checkbox" 
              className="h-4 w-4 rounded border-stone-300 text-semear-green focus:ring-semear-green" 
              checked={checklist[item.key]} 
              onChange={(e) => onChange?.(item.key, e.target.checked)} 
              disabled={disabled}
            />
            <span className={`text-sm ${checklist[item.key] ? "font-medium text-stone-700" : "text-stone-500"}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {!allChecked && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Complete todos os itens para habilitar a aprovação pública desta entrada.</span>
        </div>
      )}
    </section>
  );
}
