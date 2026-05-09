"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  BarChart3, 
  CheckCircle2, 
  FileSearch, 
  FileText, 
  Filter, 
  History, 
  ShieldAlert, 
  ShieldCheck, 
  XCircle 
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { WeeklyTeamReport, TeamMember, WeeklyTeamReportAttachment, WeeklyReportImportReview } from "@/lib/database.types";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { 
  getExtractionQualityLabel, 
  getExtractionQualityColor 
} from "@/lib/report-extraction-quality";
import { formatDateLabel, getWeeklyReportStatusLabel } from "@/lib/project-memory";

export default function ImportQualityDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reports, setReports] = useState<WeeklyTeamReport[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reviews, setReviews] = useState<WeeklyReportImportReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!supabase) return;
      
      const [reportsResult, membersResult, reviewsResult] = await Promise.all([
        supabase
          .from("weekly_team_reports")
          .select("*")
          .not("import_source", "eq", "manual")
          .order("created_at", { ascending: false }),
        supabase.from("team_members").select("*"),
        supabase.from("weekly_report_import_reviews").select("*")
      ]);

      if (reportsResult.error || membersResult.error || reviewsResult.error) {
        setError(reportsResult.error?.message || membersResult.error?.message || reviewsResult.error?.message || "Erro ao carregar dados.");
        setLoading(false);
        return;
      }

      setReports((reportsResult.data || []) as WeeklyTeamReport[]);
      setTeamMembers((membersResult.data || []) as TeamMember[]);
      setReviews((reviewsResult.data || []) as WeeklyReportImportReview[]);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  const stats = useMemo(() => {
    const total = reports.length;
    const extracted = reports.filter(r => r.import_status === "extracted_draft" || r.import_status === "approved").length;
    const failed = reports.filter(r => r.import_status === "extraction_failed").length;
    const needsReview = reports.filter(r => r.import_status === "needs_review").length;
    const highQuality = reports.filter(r => r.extraction_quality === "high").length;
    
    // Estatísticas do Lote Piloto
    const pilotTotal = reviews.length;
    const pilotByQuality = {
      high: reviews.filter(r => r.extraction_quality === "high").length,
      medium: reviews.filter(r => r.extraction_quality === "medium").length,
      low: reviews.filter(r => r.extraction_quality === "low").length,
      fail: reviews.filter(r => r.extraction_quality === "fail").length,
    };

    const templateComparison = {
      withTemplate: reviews.filter(r => r.used_standard_template),
      withoutTemplate: reviews.filter(r => !r.used_standard_template),
    };

    const avgReviewTime = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + (r.review_time_minutes || 0), 0) / reviews.length 
      : 0;

    // Contagem por tipo de fonte
    const bySource = reports.reduce((acc: any, r) => {
      acc[r.import_source || "unknown"] = (acc[r.import_source || "unknown"] || 0) + 1;
      return acc;
    }, {});

    return { 
      total, extracted, failed, needsReview, highQuality, bySource,
      pilotTotal, pilotByQuality, templateComparison, avgReviewTime 
    };
  }, [reports, reviews]);

  // Fila de revisão (Priority Queue)
  const reviewQueue = useMemo(() => {
    return reports
      .filter(r => ["needs_review", "extracted_draft", "extraction_failed"].includes(r.import_status || ""))
      .sort((a, b) => {
        // Prioridade 1: needs_review (geralmente por privacidade)
        if (a.import_status === "needs_review" && b.import_status !== "needs_review") return -1;
        if (a.import_status !== "needs_review" && b.import_status === "needs_review") return 1;
        
        // Prioridade 2: Qualidade baixa
        const qOrder = { fail: 0, low: 1, medium: 2, high: 3 };
        const qA = qOrder[a.extraction_quality as keyof typeof qOrder] ?? 4;
        const qB = qOrder[b.extraction_quality as keyof typeof qOrder] ?? 4;
        if (qA < qB) return -1;
        if (qA > qB) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reports]);

  if (loading) return <LoadingState />;

  return (
    <AppShell activeHref="/memoria">
      <section className="pb-10">
        <PageHeader 
          eyebrow="Operações Internas"
          title="Qualidade das Importações"
          description="Monitore a saúde do processo de ingestão de documentos (Word/PDF) e gerencie a fila de revisão da coordenação."
          actions={
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/memoria">
              Voltar para Memória
            </Link>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<FileText className="h-5 w-5" />} label="Total importados" value={stats.total} note="DOCX e PDF" />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Extraídos com sucesso" value={stats.extracted} note={`${((stats.extracted / stats.total) * 100 || 0).toFixed(1)}% de sucesso`} tone="green" />
          <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Aguardando revisão" value={stats.needsReview} note="Privacidade ou dúvidas" tone="yellow" />
          <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Qualidade Alta" value={stats.highQuality} note="Extração completa" tone="earth" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Fila de Revisão */}
          <section className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-semear-green flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Fila de Revisão Prioritária
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{reviewQueue.length} pendentes</span>
              </div>
              
              <div className="space-y-3">
                {reviewQueue.map(report => {
                  const member = teamMembers.find(m => m.id === report.team_member_id);
                  return (
                    <Link 
                      key={report.id} 
                      href={`/memoria/${report.id}`}
                      className="block rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-semear-green/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getExtractionQualityColor(report.extraction_quality)}`}>
                              Qualidade: {getExtractionQualityLabel(report.extraction_quality)}
                            </span>
                            {report.import_status === "needs_review" && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase">
                                <ShieldAlert className="h-3 w-3" />
                                Risco Privacidade
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-semear-green">{report.title}</h4>
                          <p className="text-xs text-stone-500 mt-1">
                            {member?.display_name} • {formatDateLabel(report.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold uppercase text-stone-400 block mb-1">Status</span>
                           <span className="text-xs font-semibold text-semear-earth bg-semear-earth/5 px-2 py-1 rounded-lg">
                             {getWeeklyReportStatusLabel(report.status)}
                           </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {reviewQueue.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-500 text-sm italic">
                    Nenhum relatório na fila de revisão no momento.
                  </div>
                )}
              </div>
            </div>

            {/* Seção Lote Piloto */}
            <div className="rounded-[2rem] border border-white/80 bg-semear-offwhite p-6 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-semear-green">Lote Piloto Real</h3>
                  <p className="text-xs text-stone-500">Validação técnica com documentos reais da equipe.</p>
                </div>
                <div className="text-right">
                  <span className={`block text-2xl font-bold ${stats.pilotTotal < 5 ? "text-amber-500" : "text-semear-green"}`}>{stats.pilotTotal}</span>
                  <span className="text-[10px] font-bold uppercase text-stone-400">Amostras</span>
                </div>
              </div>

              {stats.pilotTotal < 5 ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Falta executar o lote piloto (Dados insuficientes)
                    </p>
                    <p className="mt-2 text-[11px] text-amber-900/70 leading-4">
                      O sistema aguarda o upload e a avaliação de pelo menos 5 relatórios reais para gerar um diagnóstico confiável. Faltam {5 - stats.pilotTotal} documentos.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-white rounded-xl p-4 border border-stone-100">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-3">Amostras Recomendadas</h4>
                      <ul className="space-y-2 text-[11px] text-stone-600">
                        <li className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stats.pilotTotal >= 2 ? "bg-semear-green" : "bg-stone-200"}`} />
                          2x DOCX (Modelo Padrão)
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stats.pilotTotal >= 4 ? "bg-semear-green" : "bg-stone-200"}`} />
                          2x DOCX (Modelo Livre)
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stats.pilotTotal >= 6 ? "bg-semear-green" : "bg-stone-200"}`} />
                          2x PDF (Texto Selecionável)
                        </li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-stone-100">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-3">Casos de Borda</h4>
                      <ul className="space-y-2 text-[11px] text-stone-600">
                        <li className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stats.pilotTotal >= 7 ? "bg-semear-green" : "bg-stone-200"}`} />
                          1x PDF Escaneado (Imagem)
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${stats.pilotTotal >= 8 ? "bg-semear-green" : "bg-stone-200"}`} />
                          1x Teste de Privacidade (CPF/Tel)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Qualidade no Piloto</h4>
                    <div className="space-y-3">
                      <DistributionItem label="Alta" count={stats.pilotByQuality.high} total={stats.pilotTotal} color="bg-semear-green" />
                      <DistributionItem label="Média" count={stats.pilotByQuality.medium} total={stats.pilotTotal} color="bg-amber-400" />
                      <DistributionItem label="Baixa" count={stats.pilotByQuality.low} total={stats.pilotTotal} color="bg-orange-400" />
                      <DistributionItem label="Falha" count={stats.pilotByQuality.fail} total={stats.pilotTotal} color="bg-red-400" />
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Conclusão Operacional</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600">Com Modelo</span>
                        <span className="text-xs font-bold text-semear-green">
                          {stats.templateComparison.withTemplate.length} docs
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600">Fora do Modelo</span>
                        <span className="text-xs font-bold text-stone-500">
                          {stats.templateComparison.withoutTemplate.length} docs
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-stone-50">
                        <p className={`text-xs font-bold uppercase ${stats.templateComparison.withTemplate.length > stats.templateComparison.withoutTemplate.length ? "text-semear-green" : "text-stone-500"}`}>
                          {stats.templateComparison.withTemplate.length > stats.templateComparison.withoutTemplate.length 
                            ? "✓ Modelo Padrão Recomendado" 
                            : "Dados em análise..."}
                        </p>
                        <p className="mt-2 text-[10px] text-stone-400">Tempo médio de revisão: {stats.avgReviewTime.toFixed(1)} min</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>

          {/* Distribuição e Detalhes */}
          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
              <h3 className="font-semibold text-semear-green mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Por tipo de arquivo
              </h3>
              <div className="space-y-4">
                <DistributionItem label="Word (DOCX)" count={stats.bySource.uploaded_doc || 0} total={stats.total} color="bg-blue-500" />
                <DistributionItem label="PDF Texto" count={stats.bySource.uploaded_pdf || 0} total={stats.total} color="bg-red-500" />
                <DistributionItem label="Outros / TXT" count={stats.bySource.manual === 0 ? 0 : 0} total={stats.total} color="bg-stone-400" />
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/80 bg-semear-offwhite p-6 shadow-soft">
              <h3 className="font-semibold text-semear-green mb-3 flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Ajuda na Homologação
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                A extração depende da estrutura do documento. Use cabeçalhos claros como &quot;Atividades&quot; e &quot;Aprendizados&quot; para garantir qualidade ALTA.
              </p>
              <Link 
                href="/docs/homologacao-importacao-relatorios-reais" 
                className="text-xs font-bold text-semear-green underline"
              >
                Ver roteiro de homologação
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function DistributionItem({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-stone-600">{label}</span>
        <span className="font-bold text-stone-900">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <AppShell activeHref="/memoria">
      <div className="p-10 text-center text-stone-500 animate-pulse">
        Carregando estatísticas de qualidade...
      </div>
    </AppShell>
  );
}
