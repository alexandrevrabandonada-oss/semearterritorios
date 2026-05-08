import type {
  ProjectMemoryEntry,
  ProjectMemoryType,
  ProjectMemoryVisibility,
  WeeklyTeamReport,
  WeeklyTeamReportStatus,
} from "@/lib/database.types";

export const weeklyReportStatusOptions: Array<{ value: WeeklyTeamReportStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "submitted", label: "Enviado" },
  { value: "in_review", label: "Em revisão" },
  { value: "approved", label: "Aprovado" },
  { value: "needs_changes", label: "Ajustes pedidos" },
  { value: "archived", label: "Arquivado" },
];

export const projectMemoryTypeOptions: Array<{ value: ProjectMemoryType; label: string }> = [
  { value: "atividade", label: "Atividade" },
  { value: "decisao", label: "Decisão" },
  { value: "aprendizado", label: "Aprendizado" },
  { value: "problema", label: "Problema" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "marco", label: "Marco" },
  { value: "outro", label: "Outro" },
];

export const projectMemoryVisibilityOptions: Array<{ value: ProjectMemoryVisibility; label: string }> = [
  { value: "internal", label: "Interno" },
  { value: "public_candidate", label: "Candidata ao público" },
  { value: "public_approved", label: "Aprovada para síntese pública" },
];

export const projectMemoryAcceptedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "txt", "md"] as const;

export const projectMemoryAcceptedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/markdown",
] as const;

export const projectMemoryMaxFileSizeBytes = Number(process.env.NEXT_PUBLIC_PROJECT_MEMORY_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);

export function getWeeklyReportStatusLabel(status: WeeklyTeamReportStatus) {
  return weeklyReportStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getProjectMemoryTypeLabel(memoryType: ProjectMemoryType) {
  return projectMemoryTypeOptions.find((option) => option.value === memoryType)?.label ?? memoryType;
}

export function getProjectMemoryVisibilityLabel(visibility: ProjectMemoryVisibility) {
  return projectMemoryVisibilityOptions.find((option) => option.value === visibility)?.label ?? visibility;
}

export function getStartOfWeekIso(input: Date | string) {
  const date = new Date(typeof input === "string" ? `${input}T00:00:00` : input);
  const weekday = date.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + diff);
  return toIsoDate(date);
}

export function getEndOfWeekIso(input: Date | string) {
  const start = new Date(`${getStartOfWeekIso(input)}T00:00:00`);
  start.setDate(start.getDate() + 6);
  return toIsoDate(start);
}

export function formatWeekLabel(weekStart: string, weekEnd: string) {
  return `${formatDateLabel(weekStart)} a ${formatDateLabel(weekEnd)}`;
}

export function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getWeeklyReportOwnershipNote(report: WeeklyTeamReport, currentUserId: string | null) {
  if (!currentUserId) return null;
  if (report.created_by === currentUserId || report.profile_id === currentUserId) return "Seu relatório";
  return null;
}

export function extractHighlights(reports: WeeklyTeamReport[], key: "learnings" | "problems_found" | "next_steps", limit = 3) {
  const seen = new Set<string>();
  const items: string[] = [];

  reports.forEach((report) => {
    const text = report[key];
    if (!text) return;

    text
      .split(/\r?\n|[.;]+/)
      .map((piece) => piece.trim())
      .filter(Boolean)
      .forEach((piece) => {
        const normalized = piece.toLocaleLowerCase("pt-BR");
        if (seen.has(normalized) || items.length >= limit) return;
        seen.add(normalized);
        items.push(piece);
      });
  });

  return items;
}

export function sanitizeUploadFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `arquivo-${Date.now()}`;
}

export function validateProjectMemoryFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type;

  if (!projectMemoryAcceptedExtensions.includes(extension as (typeof projectMemoryAcceptedExtensions)[number])) {
    return `Arquivo ${file.name}: extensão não permitida.`;
  }

  if (mimeType && !projectMemoryAcceptedMimeTypes.includes(mimeType as (typeof projectMemoryAcceptedMimeTypes)[number])) {
    return `Arquivo ${file.name}: tipo MIME não permitido.`;
  }

  if (file.size > projectMemoryMaxFileSizeBytes) {
    return `Arquivo ${file.name}: tamanho acima do limite de ${formatFileSize(projectMemoryMaxFileSizeBytes)}.`;
  }

  return null;
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function summarizeProjectMemoryEntry(entry: ProjectMemoryEntry) {
  const text = entry.body.trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 137)}...`;
}
