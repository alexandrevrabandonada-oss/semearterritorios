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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    { key: "summary", keywords: ["objetivo das atividades", "objetivo", "resumo"] },
    { key: "activities_done", keywords: ["atividades realizadas", "atividades desenvolvidas", "atividade realizada", "o que realizei", "atividades da semana"] },
    { key: "problems_found", keywords: ["problemas encontrados", "dificuldades", "desafios", "entraves", "pontos de atencao"] },
    { key: "learnings", keywords: ["aprendizados", "percepcoes", "observacoes", "observacoes gerais", "avaliacao", "consideracoes"] },
    { key: "pending_items", keywords: ["pendencias", "pendencias identificadas", "itens pendentes"] },
    { key: "next_steps", keywords: ["proximos passos", "encaminhamentos", "plano de continuidade", "recomendacoes"] },
  ];

  let currentKey: keyof ExtractedReportData | null = null;
  const content: Record<string, string[]> = {};
  const normalizedSections = sections.map((section) => ({
    ...section,
    keywords: section.keywords.map(normalizeText),
  }));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line.replace(/^\d+[\s.)-]+/, ""));
    
    let foundSection = false;
    for (const section of normalizedSections) {
      if (section.keywords.some(k => normalizedLine.includes(k))) {
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
