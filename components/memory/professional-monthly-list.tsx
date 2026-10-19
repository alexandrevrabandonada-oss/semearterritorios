"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { TeamMember } from "@/lib/database.types";
import { monthlyStatuses, type MonthlyReport } from "@/lib/professional-monthly-reports";
import { SemearButton, SemearPageHeader } from "@/components/ui/semear-primitives";
import type { MonthlySynthesis } from "@/lib/monthly-synthesis";
export function ProfessionalMonthlyList() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reports, setReports] = useState<MonthlyReport[]>([]); const [members, setMembers] = useState<TeamMember[]>([]);
  const [syntheses, setSyntheses] = useState<MonthlySynthesis[]>([]);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(""); const [member, setMember] = useState(""); const [status, setStatus] = useState("");
  useEffect(() => { let active = true; async function load() {
    if (!supabase) { setError("Conexão não configurada."); setLoading(false); return; }
    const [r, m, s] = await Promise.all([supabase.from("professional_monthly_reports").select("*").order("reference_month", { ascending: false }), supabase.from("team_members").select("*").order("display_name"),supabase.from("monthly_syntheses").select("*").neq("scope_key","project").order("reference_month",{ascending:false}).order("version",{ascending:false})]);
    if (!active) return;
    if (r.error || m.error || s.error) setError((r.error ?? m.error ?? s.error)!.message);
    else { setReports(r.data ?? []); setMembers(m.data ?? []); setSyntheses(s.data??[]); } setLoading(false);
  } void load(); return () => { active = false; }; }, [supabase]);
  const names = new Map(members.map(m => [m.id, m.display_name]));
  const visible = reports.filter(r => (!month || r.reference_month.startsWith(month)) && (!member || r.team_member_id === member) && (!status || r.status === status));
  const control = "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3";
  return <section className="space-y-6 pb-10">
    <SemearPageHeader eyebrow="Memória do Projeto" title="Fechamentos mensais dos semanais" description="O sistema reúne atividades e produtos dos semanais aprovados. O profissional não precisa redigitar um relatório mensal. A aprovação é técnica, sem autorização de pagamento." actions={<><SemearButton href="/memoria" variant="secondary">Relatórios semanais</SemearButton><SemearButton href="/memoria/mensais/novo">Consolidar mês do profissional</SemearButton></>} />
    <div className="grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-3">
      <label>Mês<input className={control} type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
      <label>Profissional<select className={control} value={member} onChange={e => setMember(e.target.value)}><option value="">Todos</option>{members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label>
      <label>Situação<select className={control} value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{Object.entries(monthlyStatuses).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    </div>
    <h2 className="text-xl font-semibold">Sínteses geradas dos semanais</h2><ul className="space-y-3">{syntheses.filter(s=>(!month||s.reference_month.startsWith(month))&&(!member||s.scope_key===member)&&(!status||s.status===status)).map(s=><li key={s.id} className="rounded-2xl border bg-white p-5"><Link className="underline" href={`/memoria/sinteses/${s.id}`}>{names.get(s.scope_key)??"Profissional"} · {s.reference_month.slice(0,7)} · versão {s.version} · {s.status==="approved"?"Aprovada":"Rascunho"}</Link></li>)}</ul>
    <h2 className="text-xl font-semibold">Mensais manuais anteriores — preservados</h2>
    {error ? <p role="alert" className="text-red-700">{error}</p> : loading ? <p>Carregando relatórios…</p> : visible.length ? <ul className="space-y-3">{visible.map(r => <li key={r.id} className="rounded-2xl border bg-white p-5"><Link className="font-semibold text-semear-green underline" href={`/memoria/mensais/${r.id}`}>{r.title}</Link><p>{names.get(r.team_member_id) ?? "Profissional"} · {r.reference_month.slice(0,7)} · {monthlyStatuses[r.status]}</p></li>)}</ul> : <p>Nenhum mensal manual anterior neste filtro.</p>}
    <p><a className="underline" href="/modelos/guia-semanais-sintese.md">Guia do registro semanal, síntese mensal e transparência</a></p>
  </section>;
}
