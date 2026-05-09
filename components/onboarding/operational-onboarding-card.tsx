"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ShieldCheck, HelpCircle, Calendar, MessageSquare, Info, ChevronRight, X } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type OnboardingState = Database["public"]["Tables"]["user_onboarding_state"]["Row"];

type OperationalOnboardingCardProps = {
  state: OnboardingState;
  onUpdate: (newState: OnboardingState) => void;
};

export function OperationalOnboardingCard({ state, onUpdate }: OperationalOnboardingCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  if (state.dismissed_onboarding) return null;

  async function toggleStep(field: keyof OnboardingState) {
    if (!supabase || loading) return;
    setLoading(field);
    
    const newValue = !state[field];
    const { data, error } = await supabase
      .from("user_onboarding_state")
      .update({ [field]: newValue } as any)
      .eq("profile_id", state.profile_id)
      .select()
      .single();

    if (!error && data) {
      onUpdate(data);
    }
    setLoading(null);
  }

  async function dismiss() {
    if (!supabase || loading) return;
    setLoading("dismiss");
    const { data, error } = await supabase
      .from("user_onboarding_state")
      .update({ dismissed_onboarding: true } as any)
      .eq("profile_id", state.profile_id)
      .select()
      .single();

    if (!error && data) {
      onUpdate(data);
    }
    setLoading(null);
  }

  const steps = [
    {
      id: "seen_welcome",
      label: "Completar perfil operacional",
      icon: <Info className="h-4 w-4" />,
      done: state.seen_welcome,
    },
    {
      id: "opened_agenda",
      label: "Conhecer a Agenda da Equipe",
      icon: <Calendar className="h-4 w-4" />,
      done: state.opened_agenda,
    },
    {
      id: "opened_listening_help",
      label: "Entender como digitar fichas",
      icon: <MessageSquare className="h-4 w-4" />,
      done: state.opened_listening_help,
    },
    {
      id: "opened_notifications",
      label: "Verificar seus avisos internos",
      icon: <HelpCircle className="h-4 w-4" />,
      done: state.opened_notifications,
    },
    {
      id: "completed_privacy_ack",
      label: "Orientações de Privacidade",
      icon: <ShieldCheck className="h-4 w-4" />,
      done: state.completed_privacy_ack,
      critical: true,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-semear-green/20 bg-white p-6 shadow-soft sm:p-8">
      <button 
        onClick={dismiss}
        className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-600 transition-colors"
        title="Ocultar boas-vindas"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-semear-green">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Primeiros Passos</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-semear-green">Boas-vindas operacional</h2>
          <p className="mt-2 text-stone-600 max-w-md">
            Conclua o checklist inicial para entender como funciona o sistema e sua rotina na equipe.
          </p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-bold text-semear-green">
              <span>PROGRESSO</span>
              <span>{completedCount} de {steps.length}</span>
            </div>
            <div className="h-2 w-full max-w-xs rounded-full bg-semear-gray overflow-hidden">
              <div 
                className="h-full bg-semear-green transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id as keyof OnboardingState)}
              disabled={loading !== null}
              className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                step.done 
                  ? "bg-semear-green-soft border-semear-green/20 text-semear-green" 
                  : "bg-semear-offwhite border-semear-gray text-stone-600 hover:border-semear-green/40 hover:bg-white"
              }`}
            >
              <div className="shrink-0">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 fill-semear-green text-white" />
                ) : (
                  <Circle className="h-5 w-5 text-stone-300 group-hover:text-semear-green/40" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold leading-tight ${step.done ? "line-through opacity-70" : ""}`}>
                  {step.label}
                </p>
                {step.critical && !step.done && (
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Obrigatório</span>
                )}
              </div>
            </button>
          ))}
          
          <div className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-stone-200 text-stone-400">
            <p className="text-[10px] font-medium uppercase text-center">Relatório semanal<br/>em breve</p>
          </div>
        </div>
      </div>

      {state.completed_privacy_ack === false && (
        <div className="mt-8 p-5 rounded-2xl bg-amber-50 border border-amber-200">
          <h4 className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Lembrete de Privacidade
          </h4>
          <p className="mt-2 text-xs text-amber-800 leading-relaxed">
            No SEMEAR, priorizamos a ética: <strong>nunca</strong> colete CPF, telefone ou endereço pessoal nas escutas. 
            Não registre falas brutas sem revisão e evite dados sensíveis em relatórios.
          </p>
          <button 
            onClick={() => toggleStep("completed_privacy_ack")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-900 px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
          >
            Li e compreendo
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
