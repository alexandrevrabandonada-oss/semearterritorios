"use client";

import { useMemo } from "react";
import Link from "next/link";
import { 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  Clock, 
  FileCheck, 
  FileText, 
  LayoutDashboard, 
  MessageSquare, 
  ShieldAlert, 
  TrendingUp, 
  Users,
  Sparkles,
  ChevronDown
} from "lucide-react";
import type { InAppNotification, NotificationPreference, Profile } from "@/lib/database.types";
import { buildDailyBriefing, type DailyBriefing, type GroupedNotification } from "@/lib/notifications/build-daily-briefing";

type DailyBriefingPanelProps = {
  notifications: InAppNotification[];
  role: "equipe" | "coordenacao" | "admin";
  preferences: NotificationPreference | null;
  onboardingState?: any | null;
  className?: string;
};

export function DailyBriefingPanel({ notifications, role, preferences, onboardingState, className = "" }: DailyBriefingPanelProps) {
  const briefing = useMemo(() => buildDailyBriefing(notifications, role, preferences), [notifications, role, preferences]);
  const suggestedCleanup = notifications.filter(n => n.auto_resolution_suggested && ["unread", "read"].includes(n.status));

  if (notifications.length === 0 && !onboardingState) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Recommended Action */}
      <div className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-[linear-gradient(135deg,#174a37,#0d2b20)] p-8 shadow-soft text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-semear-yellow">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Resumo Diário</span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Bom trabalho, {role === "admin" ? "Admin" : role === "coordenacao" ? "Coordenação" : "Equipe"}</h2>
            <p className="mt-3 max-w-xl text-lg text-white/80 leading-relaxed">
              {briefing.recommended_next_action}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:flex">
            <StatBox label="Não lidos" value={briefing.total_unread} />
            <StatBox label="Urgentes" value={briefing.total_urgent} tone="red" />
            <StatBox label="Hoje" value={briefing.due_today} />
            <StatBox label="Atrasados" value={briefing.overdue} tone={briefing.overdue > 0 ? "red" : "default"} />
          </div>
        </div>
      </div>

      {/* Briefing Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* HOJE */}
        <Section 
          title="Hoje" 
          icon={<Clock className="h-5 w-5" />} 
          items={briefing.sections.hoje} 
          empty="Nenhum evento para hoje."
        />

        {/* URGENTE */}
        <Section 
          title="Urgente" 
          icon={<ShieldAlert className="h-5 w-5" />} 
          items={briefing.sections.urgente} 
          tone="red"
          empty="Sem pendências urgentes."
        />

        {/* ESTA SEMANA */}
        <Section 
          title="Esta Semana" 
          icon={<Calendar className="h-5 w-5" />} 
          items={briefing.sections.esta_semana} 
          empty="Nenhuma atividade próxima."
        />

        {/* COORDENAÇÃO (se aplicável) */}
        {(role === "coordenacao" || role === "admin") && (
          <Section 
            title="Coordenação" 
            icon={<Users className="h-5 w-5" />} 
            items={briefing.sections.coordenacao} 
            empty="Sem pendências de gestão."
          />
        )}

        {/* EQUIPE */}
        <Section 
          title="Equipe" 
          icon={<LayoutDashboard className="h-5 w-5" />} 
          items={briefing.sections.equipe} 
          empty="Sem ações de campo pendentes."
        />

        {/* SAÚDE OPERACIONAL (Mini métricas) */}
        <div className="rounded-[2rem] border border-semear-gray bg-white p-6 shadow-soft">
          <h3 className="flex items-center gap-2 font-semibold text-semear-green">
            <TrendingUp className="h-5 w-5" />
            Saúde Operacional
          </h3>
          <div className="mt-5 space-y-4">
            <HealthMetric label="Escutas pendentes" value={briefing.fieldwork_pending} max={10} />
            <HealthMetric label="Relatórios (Coord)" value={briefing.memory_pending} max={5} />
            <HealthMetric label="Transparência" value={briefing.transparency_pending} max={5} />
            <HealthMetric label="Erros Google" value={briefing.google_calendar_errors} max={1} tone="red" />
          </div>
        </div>

        {/* LIMPEZA SUGERIDA */}
        {suggestedCleanup.length > 0 && (
          <div className="rounded-[2rem] border border-blue-100 bg-blue-50/30 p-6 shadow-soft flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-blue-900">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Limpeza sugerida
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {suggestedCleanup.length}
              </span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Detectamos que {suggestedCleanup.length} aviso(s) parecem ter sido resolvidos na origem.
            </p>
            <Link 
              href="/avisos" 
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              Revisar limpeza
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, tone = "default" }: { label: string, value: number, tone?: "default" | "red" }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl min-w-[5rem] p-3 ${tone === "red" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white"}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function Section({ title, icon, items, empty, tone = "default" }: { title: string, icon: React.ReactNode, items: GroupedNotification[], empty: string, tone?: "default" | "red" }) {
  return (
    <div className="rounded-[2rem] border border-semear-gray bg-white p-6 shadow-soft flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className={`flex items-center gap-2 font-semibold ${tone === "red" ? "text-red-600" : "text-semear-green"}`}>
          {icon}
          {title}
        </h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tone === "red" ? "bg-red-50 text-red-600" : "bg-semear-green-soft text-semear-green"}`}>
          {items.reduce((acc, i) => acc + i.count, 0)}
        </span>
      </div>
      
      <div className="flex-1 space-y-3">
        {items.length > 0 ? (
          items.map(gn => (
            <Link 
              key={gn.id} 
              href={gn.action_url ?? "#"}
              className="group block p-4 rounded-2xl border border-semear-gray bg-semear-offwhite transition-all hover:bg-white hover:border-semear-green hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900 group-hover:text-semear-green truncate">{gn.title}</p>
                    {gn.priority === "urgent" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {gn.count > 1 ? `${gn.count} itens agrupados` : gn.items[0].body}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-semear-green transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-stone-400 italic py-4">{empty}</p>
        )}
      </div>
    </div>
  );
}

function HealthMetric({ label, value, max, tone = "default" }: { label: string, value: number, max: number, tone?: "default" | "red" }) {
  const percentage = Math.min((value / max) * 100, 100);
  const color = tone === "red" || percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-amber-500" : "bg-semear-green";
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-stone-600">{label}</span>
        <span className="text-stone-900 font-bold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-semear-gray overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}
