import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractTextFromDocx,
  extractTextFromPdf,
  mapRawTextToReport,
} from "@/lib/report-extraction";
import { calculateExtractionQuality } from "@/lib/report-extraction-quality";
import { detectImportPrivacyRisks } from "@/lib/report-import-privacy";
import { sanitizeUploadFileName } from "@/lib/project-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExtractionStatus = "extracted" | "failed" | "unsupported" | "needs_manual_transcription";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function countMappedSections(mappedData: ReturnType<typeof mapRawTextToReport> | null) {
  if (!mappedData) return 0;
  return [
    mappedData.summary,
    mappedData.activities_done,
    mappedData.problems_found,
    mappedData.learnings,
    mappedData.pending_items,
    mappedData.next_steps,
  ].filter(Boolean).length;
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bearerToken) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente e tente importar o relatório." }, { status: 401 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." }, { status: 500 });
  }

  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await userSupabase.auth.getUser(bearerToken);
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não informado." }, { status: 400 });
    }

    const weekStart = getRequiredString(formData, "week_start");
    const weekEnd = getRequiredString(formData, "week_end");
    const teamMemberId = getRequiredString(formData, "team_member_id");
    const linkedEventId = getRequiredString(formData, "team_calendar_event_id") || null;
    const selectedActionIds = JSON.parse(getRequiredString(formData, "action_ids") || "[]") as string[];
    const selectedNeighborhoodIds = JSON.parse(getRequiredString(formData, "neighborhood_ids") || "[]") as string[];

    if (!weekStart || !weekEnd || !teamMemberId) {
      return NextResponse.json({ error: "Semana e membro da equipe são obrigatórios." }, { status: 400 });
    }

    const [profileResult, selectedMemberResult] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", user.id).single(),
      supabase.from("team_members").select("id, profile_id").eq("id", teamMemberId).single(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: "Perfil do usuário não encontrado." }, { status: 403 });
    }

    if (selectedMemberResult.error || !selectedMemberResult.data) {
      return NextResponse.json({ error: "Membro da equipe não encontrado." }, { status: 400 });
    }

    const currentProfile = profileResult.data;
    const profileId = currentProfile.role === "equipe" ? user.id : selectedMemberResult.data.profile_id ?? null;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const source: "uploaded_doc" | "uploaded_pdf" = extension === "pdf" ? "uploaded_pdf" : "uploaded_doc";

    const reportResult = await supabase
      .from("weekly_team_reports")
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        team_member_id: teamMemberId,
        profile_id: profileId,
        title: `Relatório importado: ${file.name}`,
        status: "draft",
        import_source: source,
        import_status: "pending_extraction",
        extraction_quality: "low",
        created_by: user.id,
        team_calendar_event_id: linkedEventId,
      } as any)
      .select("*")
      .single();

    if (reportResult.error || !reportResult.data) {
      return NextResponse.json({ error: reportResult.error?.message ?? "Erro ao criar relatório." }, { status: 500 });
    }

    const report = reportResult.data;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}-${sanitizeUploadFileName(file.name)}`;
    const storagePath = `${report.id}/${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("project-memory-documents")
      .upload(storagePath, fileBuffer, { upsert: false, contentType: file.type || undefined });

    if (uploadResult.error) {
      await supabase.from("weekly_team_reports").update({ import_status: "extraction_failed", extraction_quality: "fail" }).eq("id", report.id);
      return NextResponse.json({ error: `Erro no upload: ${uploadResult.error.message}`, reportId: report.id }, { status: 500 });
    }

    const attachmentResult = await supabase
      .from("weekly_team_report_attachments")
      .insert({
        report_id: report.id,
        storage_path: storagePath,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: user.id,
        extraction_status: "pending",
      } as any)
      .select("*")
      .single();

    if (attachmentResult.error || !attachmentResult.data) {
      await supabase.from("weekly_team_reports").update({ import_status: "extraction_failed", extraction_quality: "fail" }).eq("id", report.id);
      return NextResponse.json({ error: attachmentResult.error?.message ?? "Erro ao registrar anexo.", reportId: report.id }, { status: 500 });
    }

    const attachment = attachmentResult.data;
    await supabase.from("weekly_team_reports").update({ imported_attachment_id: attachment.id }).eq("id", report.id);

    await Promise.all([
      selectedActionIds.length > 0
        ? supabase.from("weekly_team_report_actions").insert(selectedActionIds.map((actionId) => ({ report_id: report.id, action_id: actionId, created_by: user.id })))
        : Promise.resolve({ error: null }),
      selectedNeighborhoodIds.length > 0
        ? supabase.from("weekly_team_report_neighborhoods").insert(selectedNeighborhoodIds.map((neighborhoodId) => ({ report_id: report.id, neighborhood_id: neighborhoodId, created_by: user.id })))
        : Promise.resolve({ error: null }),
    ]);

    let extractedText = "";
    let status: ExtractionStatus = "extracted";
    let errorMsg: string | null = null;

    try {
      if (extension === "docx") {
        extractedText = await extractTextFromDocx(fileBuffer);
      } else if (extension === "pdf") {
        extractedText = await extractTextFromPdf(fileBuffer);
        if (extractedText.trim().length < 10) status = "needs_manual_transcription";
      } else if (extension === "txt" || extension === "md") {
        extractedText = fileBuffer.toString("utf-8");
      } else {
        status = "unsupported";
        errorMsg = "Extensão não suportada para extração automática.";
      }
    } catch (err: any) {
      status = "failed";
      errorMsg = err.message || "Erro desconhecido na extração.";
    }

    const mappedData = status === "extracted" && extractedText.trim() ? mapRawTextToReport(extractedText) : null;
    const privacyAlerts = status === "extracted" && extractedText.trim() ? detectImportPrivacyRisks(extractedText) : null;
    const sectionsCount = countMappedSections(mappedData);
    const quality = calculateExtractionQuality({
      status,
      text: extractedText,
      sectionsCount,
      hasPrivacyAlerts: privacyAlerts?.hasRisk || false,
    });

    await supabase
      .from("weekly_team_report_attachments")
      .update({
        extraction_status: status,
        extracted_text: extractedText || null,
        extraction_error: errorMsg,
        extracted_at: new Date().toISOString(),
        extraction_quality: quality,
        sections_detected_count: sectionsCount,
      })
      .eq("id", attachment.id);

    const reportUpdatePayload: Record<string, unknown> = {
      import_status: status === "extracted" ? (privacyAlerts?.hasRisk ? "needs_review" : "extracted_draft") : status === "needs_manual_transcription" ? "needs_review" : "extraction_failed",
      extraction_quality: quality,
      imported_raw_text: extractedText || null,
    };

    if (mappedData) {
      if (mappedData.title) reportUpdatePayload.title = mappedData.title;
      if (mappedData.summary) reportUpdatePayload.summary = mappedData.summary;
      if (mappedData.activities_done) reportUpdatePayload.activities_done = mappedData.activities_done;
      if (mappedData.problems_found) reportUpdatePayload.problems_found = mappedData.problems_found;
      if (mappedData.learnings) reportUpdatePayload.learnings = mappedData.learnings;
      if (mappedData.pending_items) reportUpdatePayload.pending_items = mappedData.pending_items;
      if (mappedData.next_steps) reportUpdatePayload.next_steps = mappedData.next_steps;
    }

    await supabase.from("weekly_team_reports").update(reportUpdatePayload).eq("id", report.id);

    return NextResponse.json({
      success: true,
      reportId: report.id,
      attachmentId: attachment.id,
      status,
      quality,
      sectionsCount,
      textLength: extractedText.trim().length,
      privacyAlerts,
    });
  } catch (err: any) {
    console.error("Erro na importação do relatório:", err);
    return NextResponse.json({ error: err.message || "Erro interno no servidor." }, { status: 500 });
  }
}
