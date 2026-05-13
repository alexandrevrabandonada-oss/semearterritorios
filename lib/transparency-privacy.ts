import { MIN_PUBLIC_TERRITORY_SAMPLE } from "@/lib/transparency-snapshots";

export const transparencyChecklistKeys = [
  "data_from_aggregates",
  "no_raw_quote",
  "no_interviewer_name",
  "no_team_email",
  "no_cpf",
  "no_phone",
  "no_address",
  "no_health_data",
  "rare_occupations_grouped",
  "minimum_sample_respected",
  "words_sanitized",
  "sensitive_places_hidden",
  "no_census_claim",
  "reviewed_by_coordination"
] as const;

export type TransparencyChecklistKey = (typeof transparencyChecklistKeys)[number];

export type TransparencyChecklistState = Record<TransparencyChecklistKey, boolean>;

export type TransparencyRisk = {
  key: "cpf" | "phone" | "email" | "cep" | "suspicious_url" | "address_hint" | "proper_names";
  severity: "blocking" | "warning";
  message: string;
  matches: string[];
};

export type TransparencyRiskReport = {
  blockers: TransparencyRisk[];
  warnings: TransparencyRisk[];
  hasBlockingRisk: boolean;
  hasWarningRisk: boolean;
};

const allowedProjectDomains = ["semear", "gtpitwhslqjgbuwlsaqg.supabase.co"];

const properNameStopWords = new Set([
  "Semear", "Transparência", "Viva", "Equipe", "Coordenação", "Admin", "Portal", "PWA", "Territórios",
  "Bairro", "Bairros", "Tema", "Temas", "Dados", "Leitura", "Escutas", "Ações", "Devolutiva"
]);

export function createEmptyTransparencyChecklist(): TransparencyChecklistState {
  return {
    data_from_aggregates: false,
    no_raw_quote: false,
    no_interviewer_name: false,
    no_team_email: false,
    no_cpf: false,
    no_phone: false,
    no_address: false,
    no_health_data: false,
    rare_occupations_grouped: false,
    minimum_sample_respected: false,
    words_sanitized: false,
    sensitive_places_hidden: false,
    no_census_claim: false,
    reviewed_by_coordination: false
  };
}

export function normalizeTransparencyChecklist(value: unknown): TransparencyChecklistState {
  const fallback = createEmptyTransparencyChecklist();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const source = value as Record<string, unknown>;
  return transparencyChecklistKeys.reduce((acc, key) => {
    acc[key] = Boolean(source[key]);
    return acc;
  }, fallback);
}

export function isTransparencyChecklistComplete(checklist: TransparencyChecklistState) {
  return transparencyChecklistKeys.every((key) => checklist[key]);
}

export function getTransparencyChecklistItems() {
  return [
    { key: "data_from_aggregates", label: "dados vieram de agregados de leitura coletiva" },
    { key: "no_raw_quote", label: "não contém fala original bruta" },
    { key: "no_interviewer_name", label: "não contém nome de entrevistador" },
    { key: "no_team_email", label: "não contém e-mail de equipe" },
    { key: "no_cpf", label: "não contém CPF" },
    { key: "no_phone", label: "não contém telefone" },
    { key: "no_address", label: "não contém endereço, rua, número ou CEP" },
    { key: "no_health_data", label: "não contém dado de saúde individual identificável" },
    { key: "rare_occupations_grouped", label: "ocupações raras foram agrupadas" },
    { key: "minimum_sample_respected", label: `territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas aparecem como dados insuficientes` },
    { key: "words_sanitized", label: "palavras recorrentes foram sanitizadas" },
    { key: "sensitive_places_hidden", label: "lugares sensíveis não aparecem" },
    { key: "no_census_claim", label: "leitura não é apresentada como pesquisa estatística censitária" },
    { key: "reviewed_by_coordination", label: "publicação foi revisada por coordenação ou admin" }
  ] as const;
}

export function buildTransparencyTextBlob(fields: Array<string | null | undefined>) {
  return fields.filter(Boolean).join("\n");
}

export function detectTransparencyPrivacyRisks(text: string, allowedDomains = allowedProjectDomains): TransparencyRiskReport {
  const risks: TransparencyRisk[] = [];
  const cpfMatches = text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g) ?? [];
  if (cpfMatches.length > 0) {
    risks.push({ key: "cpf", severity: "blocking", message: "Possível CPF detectado. Revise antes de publicar.", matches: cpfMatches });
  }

  const phoneMatches = text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}-?\d{4})/g) ?? [];
  if (phoneMatches.length > 0) {
    risks.push({ key: "phone", severity: "blocking", message: "Possível telefone detectado. Revise antes de publicar.", matches: phoneMatches });
  }

  const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (emailMatches.length > 0) {
    risks.push({ key: "email", severity: "blocking", message: "Possível e-mail detectado. Revise antes de publicar.", matches: emailMatches });
  }

  const cepMatches = text.match(/\b\d{5}-?\d{3}\b/g) ?? [];
  if (cepMatches.length > 0) {
    risks.push({ key: "cep", severity: "warning", message: "Possível CEP detectado. Revise o texto público.", matches: cepMatches });
  }

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
    risks.push({ key: "suspicious_url", severity: "warning", message: "Há URL externa ao projeto. Confirme se ela deve aparecer no payload público.", matches: suspiciousUrls });
  }

  const addressMatches = Array.from(
    text.matchAll(/\b(rua|r\.|nº|n°|numero|número|casa de|mora em)\b[^\n,;]{0,30}\d+/gi)
  ).map((item) => item[0]);
  if (addressMatches.length > 0) {
    risks.push({ key: "address_hint", severity: "warning", message: "Possível referência de endereço detectada. Revise antes de publicar.", matches: addressMatches });
  }

  const properNameMatches = Array.from(text.matchAll(/\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}\b/g))
    .map((item) => item[0])
    .filter((name) => !properNameStopWords.has(name));
  const uniqueProperNames = Array.from(new Set(properNameMatches));
  if (uniqueProperNames.length >= 4) {
    risks.push({ key: "proper_names", severity: "warning", message: "Há muitos nomes próprios no texto. Revise se existe risco de identificação.", matches: uniqueProperNames.slice(0, 8) });
  }

  return {
    blockers: risks.filter((risk) => risk.severity === "blocking"),
    warnings: risks.filter((risk) => risk.severity === "warning"),
    hasBlockingRisk: risks.some((risk) => risk.severity === "blocking"),
    hasWarningRisk: risks.some((risk) => risk.severity === "warning")
  };
}
