export const monthlyFields = [
  ["summary", "Síntese do período"],
  ["objectives", "Objetivos trabalhados"],
  ["activities", "Atividades realizadas"],
  ["methodologies", "Metodologias utilizadas"],
  ["participant_accounts", "Relatos dos participantes"],
  ["team_observations", "Observações da equipe"],
  ["research_references", "Referências de medição ou pesquisa"],
  ["learnings", "Aprendizados"],
  ["difficulties", "Dificuldades e limites"],
  ["proposals", "Propostas e encaminhamentos"],
  ["pending_items", "Pendências"],
  ["next_steps", "Planejamento do mês seguinte"],
] as const;
export type MonthlyField = typeof monthlyFields[number][0];
export type MonthlyContent = Record<MonthlyField, string>;
export const emptyMonthlyContent = Object.fromEntries(monthlyFields.map(([key]) => [key, ""])) as MonthlyContent;
export const monthlyStatuses = { draft: "Rascunho", submitted: "Enviado", in_review: "Em revisão", approved: "Aprovado", needs_changes: "Ajustes solicitados" } as const;
export type MonthlyStatus = keyof typeof monthlyStatuses;
export const deliveryTypes = { workshop_record: "Registro de oficina", social_map: "Mapa social", territorial_diagnosis: "Síntese de diagnóstico", proposals: "Propostas e encaminhamentos", educational_material: "Material formativo", monthly_report: "Relatório mensal" } as const;
export type DeliveryType = keyof typeof deliveryTypes;
export type MonthlyReport = MonthlyContent & {
  id: string; team_member_id: string; reference_month: string; title: string; status: MonthlyStatus;
  no_field_activity: boolean; no_field_justification: string; main_attachment_id: string | null;
  reviewed_attachment_id: string | null; review_note: string; review_checklist: Record<string, boolean>;
  reviewed_by: string | null; reviewed_at: string | null; created_by: string; created_at: string; updated_at: string;
};
export type MonthlyActivityLink = { id: string; report_id: string; action_id: string | null; workshop_id: string | null; period_justification: string };
export type MonthlyDelivery = { id: string; report_id: string; delivery_type: DeliveryType; title: string; description: string; activity_link_id: string | null; map_context: string; map_legend: string };
export type MonthlyAttachment = { id: string; report_id: string; delivery_id: string | null; storage_path: string; file_name: string; file_size: number; uploaded_by: string; created_at: string; extracted_text: string; extraction_status: string; extraction_quality: string; privacy_alerts: string[] };
export type MonthlyHistory = { id: string; report_id: string; actor_id: string; from_status: MonthlyStatus | null; to_status: MonthlyStatus; note: string; attachment_id: string | null; created_at: string };
export const approvalChecks = { document: "Conferi o documento principal", links: "Conferi as atividades e os territórios vinculados", deliveries: "Conferi as entregas e seus materiais", privacy: "Conferi os cuidados de privacidade" } as const;
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^\s*\d+[.)\s-]*/, "").replace(/[:\s]+$/g, "").trim(); }
export function mapMonthlyText(text: string): Partial<MonthlyContent> {
  const result: Partial<MonthlyContent> = {};
  const headings = new Map(monthlyFields.map(([key, label]) => [normalize(label), key]));
  let key: MonthlyField | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (normalize(line) === "materiais e cuidados de envio") { key = undefined; continue; }
    if (/^\s*\[preencher\]\s*$/i.test(line)) continue;
    const heading = headings.get(normalize(line));
    if (heading) { key = heading; continue; }
    if (key && line.trim()) result[key] = [result[key], line.trim()].filter(Boolean).join("\n");
  }
  return result;
}
export function monthlyExtractionQuality(text: string, mapped: Partial<MonthlyContent>) {
  const count = Object.values(mapped).filter(Boolean).length;
  return text.trim().length < 40 ? "low" : count >= 4 ? "high" : count >= 2 ? "medium" : "low";
}
export function isMonthlyEditable(status: MonthlyStatus) { return status === "draft" || status === "needs_changes"; }
export function isOutsideMonth(date: string | null, month: string) { return !date || date.slice(0, 7) !== month.slice(0, 7); }
