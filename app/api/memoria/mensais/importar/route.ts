import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractTextFromDocx, extractTextFromPdf } from "@/lib/report-extraction";
import { mapMonthlyText, monthlyExtractionQuality, isMonthlyEditable } from "@/lib/professional-monthly-reports";
import { detectImportPrivacyRisks } from "@/lib/report-import-privacy";
import { sanitizeUploadFileName } from "@/lib/project-memory";
export const runtime = "nodejs";
export const maxDuration = 60;
const bucket = "professional-monthly-documents";
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre novamente para importar." }, { status: 401 });
  try {
    const form = await request.formData();
    const reportId = String(form.get("report_id") ?? "");
    const { data: report, error: reportError } = await supabase.from("professional_monthly_reports").select("*").eq("id", reportId).single();
    if (reportError || !report) return NextResponse.json({ error: "Relatório não encontrado ou sem acesso." }, { status: 403 });
    if (!isMonthlyEditable(report.status)) return NextResponse.json({ error: "Reabra o relatório antes de importar." }, { status: 409 });
    let attachmentId = String(form.get("attachment_id") ?? "");
    let buffer: Buffer; let name: string;
    if (attachmentId) {
      const { data: attachment, error } = await supabase.from("professional_monthly_attachments").select("*").eq("id", attachmentId).eq("report_id", reportId).single();
      if (error || !attachment) throw new Error("Anexo indisponível.");
      if (!/\.(docx|pdf)$/i.test(attachment.file_name)) throw new Error("Somente DOCX ou PDF podem ser extraídos.");
      const { data, error: downloadError } = await supabase.storage.from(bucket).download(attachment.storage_path);
      if (downloadError || !data) throw new Error("Não foi possível ler o documento.");
      buffer = Buffer.from(await data.arrayBuffer()); name = attachment.file_name;
    } else {
      const file = form.get("file");
      if (!(file instanceof File) || !/\.(docx|pdf)$/i.test(file.name)) return NextResponse.json({ error: "Envie DOCX ou PDF." }, { status: 400 });
      if (!file.size || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Envie arquivo de até 10 MB." }, { status: 413 });
      buffer = Buffer.from(await file.arrayBuffer()); name = file.name;
      attachmentId = crypto.randomUUID();
      const path = `${reportId}/${attachmentId}-${sanitizeUploadFileName(name)}`;
      const contentType = /\.pdf$/i.test(name) ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const upload = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
      if (upload.error) throw new Error(upload.error.message);
      const insert = await supabase.from("professional_monthly_attachments").insert({ id: attachmentId, report_id: reportId, storage_path: path, file_name: name, file_size: file.size, uploaded_by: user.id });
      if (insert.error) throw new Error(`Arquivo enviado, mas seu registro falhou. ${insert.error.message}`);
    }
    let text = "", extractionStatus = "extracted", extractionError: string | null = null;
    try {
      text = /\.pdf$/i.test(name) ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
      if (text.trim().length < 40) extractionStatus = "needs_manual_transcription";
    } catch { extractionStatus = "failed"; extractionError = "Extração falhou. Preencha manualmente; o documento foi preservado."; }
    const mapped = mapMonthlyText(text);
    const quality = extractionStatus === "failed" ? "fail" : monthlyExtractionQuality(text, mapped);
    const privacyAlerts = detectImportPrivacyRisks(text).risks;
    const result = await supabase.from("professional_monthly_attachments").update({ extracted_text: text, extraction_status: extractionStatus, extraction_quality: quality, privacy_alerts: privacyAlerts }).eq("id", attachmentId).eq("report_id", reportId).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ attachmentId, mapped, quality, extractionStatus, extractionError, privacyAlerts, sections: Object.keys(mapped).length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na importação." }, { status: 400 }); }
}
