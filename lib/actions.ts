import type { ActionStatus, ActionType } from "@/lib/database.types";

export const actionTypeOptions: Array<{ value: ActionType; label: string }> = [
  { value: "banca_escuta", label: "Banca de escuta" },
  { value: "roda", label: "Roda" },
  { value: "oficina", label: "Oficina" },
  { value: "caminhada", label: "Caminhada" },
  { value: "reuniao_institucional", label: "Reunião institucional" },
  { value: "devolutiva", label: "Devolutiva" },
  { value: "outro", label: "Outro" }
];

export const actionStatusOptions: Array<{ value: ActionStatus; label: string }> = [
  { value: "planejada", label: "Planejada" },
  { value: "realizada", label: "Realizada" },
  { value: "reprogramada", label: "Reprogramada" },
  { value: "cancelada", label: "Cancelada" }
];

export function getActionTypeLabel(value: ActionType) {
  return actionTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function getActionStatusLabel(value: ActionStatus) {
  return actionStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function getMonthValue(date: string) {
  return date.slice(0, 7);
}
