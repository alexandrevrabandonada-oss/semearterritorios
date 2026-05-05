import type { RespondentTerritoryRelation, ReviewStatus, SourceType } from "@/lib/database.types";

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

/** Opções de vínculo do entrevistado com o território de referência (Tijolo 039). */
export const respondentTerritoryRelationOptions: Array<{ value: RespondentTerritoryRelation; label: string }> = [
  { value: "mora", label: "Mora nesse território" },
  { value: "trabalha_estuda", label: "Trabalha / estuda" },
  { value: "circula", label: "Circula por lá" },
  { value: "fala_sobre", label: "Fala sobre esse território" },
  { value: "nao_informado", label: "Não informado" }
];

export function getSourceTypeLabel(value: SourceType) {
  return sourceTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function getReviewStatusLabel(value: ReviewStatus) {
  return reviewStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function getRespondentTerritoryRelationLabel(value: RespondentTerritoryRelation | null | undefined) {
  if (!value) return "Não informado";
  return respondentTerritoryRelationOptions.find((option) => option.value === value)?.label ?? value;
}
