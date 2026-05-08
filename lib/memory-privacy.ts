import { Json } from "@/lib/database.types";

export const memoryChecklistKeys = [
  "no_cpf",
  "no_phone",
  "no_address",
  "no_respondent_name",
  "no_health_data",
  "no_individual_story",
  "no_team_email",
  "no_private_attachment",
  "appropriate_language",
  "reviewed_by_coordination"
] as const;

export type MemoryChecklistKey = (typeof memoryChecklistKeys)[number];

export type MemoryChecklistState = Record<MemoryChecklistKey, boolean>;

export type MemoryRisk = {
  key: "cpf" | "phone" | "email" | "cep" | "suspicious_url" | "address_hint" | "proper_names";
  severity: "blocking" | "warning";
  message: string;
  matches: string[];
};

export type MemoryRiskReport = {
  blockers: MemoryRisk[];
  warnings: MemoryRisk[];
  hasBlockingRisk: boolean;
  hasWarningRisk: boolean;
};

const allowedProjectDomains = ["semear", "gtpitwhslqjgbuwlsaqg.supabase.co"];

const properNameStopWords = new Set([
  "Semear", "Transparência", "Viva", "Equipe", "Coordenação", "Admin", "Portal", "PWA", "Territórios",
  "Bairro", "Bairros", "Tema", "Temas", "Dados", "Leitura", "Escutas", "Ações", "Devolutiva",
  "Relatório", "Semana", "Atividade", "Decisão", "Aprendizado", "Problema", "Encaminhamento", "Marco"
]);

export function createEmptyMemoryChecklist(): MemoryChecklistState {
  return {
    no_cpf: false,
    no_phone: false,
    no_address: false,
    no_respondent_name: false,
    no_health_data: false,
    no_individual_story: false,
    no_team_email: false,
    no_private_attachment: false,
    appropriate_language: false,
    reviewed_by_coordination: false
  };
}

export function normalizeMemoryChecklist(value: unknown): MemoryChecklistState {
  const fallback = createEmptyMemoryChecklist();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const source = value as Record<string, unknown>;
  return memoryChecklistKeys.reduce((acc, key) => {
    acc[key] = Boolean(source[key]);
    return acc;
  }, fallback);
}

export function isMemoryChecklistComplete(checklist: MemoryChecklistState) {
  return memoryChecklistKeys.every((key) => checklist[key]);
}

export function getMemoryChecklistItems() {
  return [
    { key: "no_cpf", label: "não contém CPF" },
    { key: "no_phone", label: "não contém telefone" },
    { key: "no_address", label: "não contém endereço pessoal" },
    { key: "no_respondent_name", label: "não contém nome completo de entrevistado" },
    { key: "no_health_data", label: "não contém dado de saúde individual identificável" },
    { key: "no_individual_story", label: "não contém relato individual identificável" },
    { key: "no_team_email", label: "não contém e-mail da equipe" },
    { key: "no_private_attachment", label: "não contém anexo privado" },
    { key: "appropriate_language", label: "linguagem está adequada para memória pública" },
    { key: "reviewed_by_coordination", label: "texto foi revisado pela coordenação" }
  ] as const;
}

export function detectMemoryPrivacyRisks(text: string, allowedDomains = allowedProjectDomains): MemoryRiskReport {
  const risks: MemoryRisk[] = [];
  
  // CPF
  const cpfMatches = text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g) ?? [];
  if (cpfMatches.length > 0) {
    risks.push({ key: "cpf", severity: "blocking", message: "Possível CPF detectado. Revise antes de publicar.", matches: cpfMatches });
  }

  // Telefone
  const phoneMatches = text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}-?\d{4})/g) ?? [];
  if (phoneMatches.length > 0) {
    risks.push({ key: "phone", severity: "blocking", message: "Possível telefone detectado. Revise antes de publicar.", matches: phoneMatches });
  }

  // E-mail
  const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (emailMatches.length > 0) {
    risks.push({ key: "email", severity: "blocking", message: "Possível e-mail detectado. Revise antes de publicar.", matches: emailMatches });
  }

  // CEP
  const cepMatches = text.match(/\b\d{5}-?\d{3}\b/g) ?? [];
  if (cepMatches.length > 0) {
    risks.push({ key: "cep", severity: "warning", message: "Possível CEP detectado. Revise o texto público.", matches: cepMatches });
  }

  // URLs
  const suspiciousUrls = Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi))
    .map((item) => item[0])
    .filter((url) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return !allowedDomains.some((domain) => host.includes(domain));
      } catch {
        return true;
      }
    });
  if (suspiciousUrls.length > 0) {
    risks.push({ key: "suspicious_url", severity: "warning", message: "Há URL externa ao projeto. Confirme se ela deve aparecer publicamente.", matches: suspiciousUrls });
  }

  // Endereço
  const addressMatches = Array.from(
    text.matchAll(/\b(rua|r\.|nº|n°|numero|número|casa de|mora em|residente em|endereco|endereço)\b[^\n,;]{0,30}\d+/gi)
  ).map((item) => item[0]);
  if (addressMatches.length > 0) {
    risks.push({ key: "address_hint", severity: "warning", message: "Possível referência de endereço detectada. Revise antes de publicar.", matches: addressMatches });
  }

  // Nomes próprios em excesso
  const properNameMatches = Array.from(text.matchAll(/\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}\b/g))
    .map((item) => item[0])
    .filter((name) => !properNameStopWords.has(name));
  const uniqueProperNames = Array.from(new Set(properNameMatches));
  if (uniqueProperNames.length >= 5) {
    risks.push({ key: "proper_names", severity: "warning", message: "Há vários nomes próprios no texto. Revise se existe risco de identificação.", matches: uniqueProperNames.slice(0, 10) });
  }

  return {
    blockers: risks.filter((risk) => risk.severity === "blocking"),
    warnings: risks.filter((risk) => risk.severity === "warning"),
    hasBlockingRisk: risks.some((risk) => risk.severity === "blocking"),
    hasWarningRisk: risks.some((risk) => risk.severity === "warning")
  };
}
