import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { 
  extractTextFromDocx, 
  extractTextFromPdf, 
  mapRawTextToReport 
} from "@/lib/report-extraction";
import { detectImportPrivacyRisks } from "@/lib/report-import-privacy";
import { calculateExtractionQuality } from "@/lib/report-extraction-quality";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const supabase = bearerToken
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        }
      )
    : createSupabaseServerClient();
  
  // Verificar autenticação
  const { data: { user }, error: authError } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { attachmentId } = await req.json();

    if (!attachmentId) {
      return NextResponse.json({ error: "ID do anexo não informado." }, { status: 400 });
    }

    // 1. Buscar metadados do anexo
    const { data: attachment, error: attachmentError } = await supabase
      .from("weekly_team_report_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
    }

    // 2. Baixar o arquivo do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("project-memory-documents")
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: `Erro ao baixar arquivo: ${downloadError?.message}` }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    let extractedText = "";
    let status: "extracted" | "failed" | "unsupported" | "needs_manual_transcription" = "extracted";
    let errorMsg = null;

    // 3. Extrair texto baseado no tipo
    const extension = attachment.file_name.split(".").pop()?.toLowerCase();

    try {
      if (extension === "docx") {
        extractedText = await extractTextFromDocx(buffer);
      } else if (extension === "pdf") {
        extractedText = await extractTextFromPdf(buffer);
        // Verificar se extraiu algo útil (se for imagem/scan, pdf-parse retorna pouco ou nada)
        if (extractedText.trim().length < 10) {
          status = "needs_manual_transcription";
        }
      } else if (extension === "txt" || extension === "md") {
        extractedText = buffer.toString("utf-8");
      } else {
        status = "unsupported";
        errorMsg = "Extensão não suportada para extração automática.";
      }
    } catch (err: any) {
      console.error("Erro no processamento:", err);
      status = "failed";
      errorMsg = err.message || "Erro desconhecido na extração.";
    }

    // 4. Se extraído, mapear campos e verificar privacidade
    let mappedData = null;
    let privacyAlerts = null;
    let sectionsCount = 0;

    if (status === "extracted" && extractedText.trim()) {
      mappedData = mapRawTextToReport(extractedText);
      privacyAlerts = detectImportPrivacyRisks(extractedText);
      
      // Contar seções detectadas
      if (mappedData) {
        if (mappedData.summary) sectionsCount++;
        if (mappedData.activities_done) sectionsCount++;
        if (mappedData.problems_found) sectionsCount++;
        if (mappedData.learnings) sectionsCount++;
        if (mappedData.pending_items) sectionsCount++;
        if (mappedData.next_steps) sectionsCount++;
      }
    }

    const quality = calculateExtractionQuality({
      status,
      text: extractedText,
      sectionsCount,
      hasPrivacyAlerts: privacyAlerts?.hasRisk || false,
    });

    // 5. Atualizar metadados do anexo
    const attachmentUpdateResult = await supabase
      .from("weekly_team_report_attachments")
      .update({
        extraction_status: status,
        extracted_text: extractedText || null,
        extraction_error: errorMsg,
        extracted_at: new Date().toISOString(),
        extraction_quality: quality,
        sections_detected_count: sectionsCount,
      })
      .eq("id", attachmentId);

    if (attachmentUpdateResult.error) {
      return NextResponse.json({ error: `Erro ao atualizar anexo: ${attachmentUpdateResult.error.message}` }, { status: 500 });
    }

    // 6. Atualizar o relatório se vinculado
    if (attachment.report_id && status === "extracted") {
      const updatePayload: any = {
        imported_raw_text: extractedText,
        import_status: "extracted_draft",
        extraction_quality: quality,
      };

      if (mappedData) {
        if (mappedData.title) updatePayload.title = mappedData.title;
        if (mappedData.summary) updatePayload.summary = mappedData.summary;
        if (mappedData.activities_done) updatePayload.activities_done = mappedData.activities_done;
        if (mappedData.problems_found) updatePayload.problems_found = mappedData.problems_found;
        if (mappedData.learnings) updatePayload.learnings = mappedData.learnings;
        if (mappedData.pending_items) updatePayload.pending_items = mappedData.pending_items;
        if (mappedData.next_steps) updatePayload.next_steps = mappedData.next_steps;
      }

      if (privacyAlerts?.hasRisk) {
        updatePayload.import_status = "needs_review";
      }

      const reportUpdateResult = await supabase
        .from("weekly_team_reports")
        .update(updatePayload)
        .eq("id", attachment.report_id);

      if (reportUpdateResult.error) {
        return NextResponse.json({ error: `Erro ao atualizar relatório: ${reportUpdateResult.error.message}` }, { status: 500 });
      }
    } else if (attachment.report_id && status !== "extracted") {
      const reportUpdateResult = await supabase
        .from("weekly_team_reports")
        .update({
          import_status: status === "needs_manual_transcription" ? "needs_review" : "extraction_failed",
          extraction_quality: quality,
        })
        .eq("id", attachment.report_id);

      if (reportUpdateResult.error) {
        return NextResponse.json({ error: `Erro ao atualizar relatório: ${reportUpdateResult.error.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      status, 
      quality,
      textLength: extractedText.trim().length,
      sectionsCount,
      privacyAlerts 
    });

  } catch (err: any) {
    console.error("Erro na rota de processamento:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
