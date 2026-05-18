import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

/**
 * Extrai texto de um buffer DOCX usando mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("Erro na extração DOCX:", error);
    throw new Error("Falha ao extrair texto do arquivo DOCX.");
  }
}

/**
 * Extrai texto de um buffer PDF usando pdf-parse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text || "";
  } catch (error) {
    console.error("Erro na extração PDF:", error);
    throw new Error("Falha ao extrair texto do arquivo PDF.");
  } finally {
    await parser.destroy();
  }
}

/**
 * Estrutura básica de um relatório extraído.
 */
export interface ExtractedReportData {
  title?: string;
  summary?: string;
  activities_done?: string;
  problems_found?: string;
  learnings?: string;
  pending_items?: string;
  next_steps?: string;
  raw_text: string;
}

/**
 * Mapeia o texto bruto para campos estruturados do relatório semanal.
 * Baseado em cabeçalhos comuns.
 */
export function mapRawTextToReport(text: string): ExtractedReportData {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const data: ExtractedReportData = {
    raw_text: text,
  };

  if (lines.length > 0) {
    data.title = lines[0].slice(0, 100);
  }

  // Seções comuns (regex para ignorar numeração e ser flexível com acentos/case)
  const sections = [
    { key: "activities_done", keywords: ["atividades realizadas", "o que realizei", "atividades da semana"] },
    { key: "problems_found", keywords: ["problemas encontrados", "dificuldades", "desafios"] },
    { key: "learnings", keywords: ["aprendizados", "percepcoes", "observacoes"] },
    { key: "pending_items", keywords: ["pendencias"] },
    { key: "next_steps", keywords: ["proximos passos", "encaminhamentos"] },
  ];

  let currentKey: keyof ExtractedReportData | null = null;
  const content: Record<string, string[]> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let foundSection = false;
    for (const section of sections) {
      if (section.keywords.some(k => normalizedLine.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
        currentKey = section.key as keyof ExtractedReportData;
        foundSection = true;
        break;
      }
    }

    if (!foundSection && currentKey) {
      if (!content[currentKey]) content[currentKey] = [];
      content[currentKey].push(line);
    } else if (!foundSection && !currentKey && i < 10) {
      // Se ainda não achou seção e está no começo, vai para o resumo
      if (!content["summary"]) content["summary"] = [];
      content["summary"].push(line);
    }
  }

  // Unir o conteúdo das seções
  if (content["summary"]) data.summary = content["summary"].join("\n");
  if (content["activities_done"]) data.activities_done = content["activities_done"].join("\n");
  if (content["problems_found"]) data.problems_found = content["problems_found"].join("\n");
  if (content["learnings"]) data.learnings = content["learnings"].join("\n");
  if (content["pending_items"]) data.pending_items = content["pending_items"].join("\n");
  if (content["next_steps"]) data.next_steps = content["next_steps"].join("\n");

  return data;
}
