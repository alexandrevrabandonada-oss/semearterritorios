import type { ReviewStatus, SourceType } from "@/lib/database.types";

export const sourceTypeOptions: Array<{ value: SourceType; label: string }> = [
  { value: "feira", label: "Feira" },
  { value: "cras", label: "CRAS" },
  { value: "escola", label: "Escola" },
  { value: "praca", label: "Praça" },
  { value: "roda", label: "Roda" },
  { value: "oficina", label: "Oficina" },
  { value: "caminhada", label: "Caminhada" },
  { value: "outro", label: "Outro" }
];

export const reviewStatusOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "reviewed", label: "Revisado" }
];

export function getSourceTypeLabel(value: SourceType) {
  return sourceTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function getReviewStatusLabel(value: ReviewStatus) {
  return reviewStatusOptions.find((option) => option.value === value)?.label ?? value;
}
