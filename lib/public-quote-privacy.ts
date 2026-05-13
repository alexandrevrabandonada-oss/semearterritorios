export type PublicQuotePrivacyCategory =
  | "cpf"
  | "telefone"
  | "email"
  | "cep"
  | "endereco_especifico"
  | "moradia_especifica"
  | "nome_completo_provavel"
  | "local_trabalho_especifico"
  | "saude_identificavel";

export type PublicQuotePrivacyResult = {
  hasCriticalBlock: boolean;
  criticalCategories: PublicQuotePrivacyCategory[];
  warningCategories: PublicQuotePrivacyCategory[];
  riskNotes: string[];
};

const criticalChecks: Array<{ category: PublicQuotePrivacyCategory; pattern: RegExp; note: string }> = [
  { category: "cpf", pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{2}\b/, note: "CPF detectado" },
  { category: "telefone", pattern: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}\b/, note: "Telefone detectado" },
  { category: "email", pattern: /\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/, note: "E-mail detectado" },
  { category: "cep", pattern: /\b\d{5}[-\s]?\d{3}\b/, note: "CEP detectado" },
  {
    category: "endereco_especifico",
    pattern: /\b(?:rua|avenida|av\.?|travessa|alameda|beco|estrada|rodovia)\s+[^,.;\n]{2,}(?:,|\s+n[ºo]?\s*|\s+numero\s+)\d+/i,
    note: "Endereco especifico detectado"
  },
  {
    category: "moradia_especifica",
    pattern: /\b(?:moro|minha casa|minha residencia|minha residência|minha moradia)\b[^.\n]{0,80}(?:rua|avenida|av\.?|travessa|alameda|numero|n[ºo]?|cep)/i,
    note: "Referencia especifica de moradia detectada"
  }
];

const warningChecks: Array<{ category: PublicQuotePrivacyCategory; pattern: RegExp; note: string }> = [
  {
    category: "nome_completo_provavel",
    pattern: /\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,})?/,
    note: "Nome completo provavel detectado"
  },
  {
    category: "local_trabalho_especifico",
    pattern: /\b(?:trabalho|estudo|atuo|sou)\b[^.\n]{0,80}\b(?:empresa|escola|colegio|colégio|creche|hospital|clinica|clínica|posto|ubs|upa|secretaria|setor|departamento|unidade|filial)\b/i,
    note: "Referencia especifica de empresa/escola/local detectada"
  },
  {
    category: "saude_identificavel",
    pattern: /\b(?:tenho|fui|estou|meu|minha)\b[^.\n]{0,100}\b(?:hiv|cancer|câncer|diabetes|depressao|depressão|tuberculose|diagnostico|diagnóstico|laudo|tratamento)\b/i,
    note: "Possivel dado de saude identificavel detectado"
  }
];

function normalize(input: string) {
  return input.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function assessPublicQuotePrivacy(text: string): PublicQuotePrivacyResult {
  const source = normalize(text);
  if (!source) {
    return {
      hasCriticalBlock: false,
      criticalCategories: [],
      warningCategories: [],
      riskNotes: []
    };
  }

  const criticalCategories: PublicQuotePrivacyCategory[] = [];
  const warningCategories: PublicQuotePrivacyCategory[] = [];
  const riskNotes: string[] = [];

  for (const check of criticalChecks) {
    if (check.pattern.test(source)) {
      criticalCategories.push(check.category);
      riskNotes.push(check.note);
    }
  }

  for (const check of warningChecks) {
    if (check.pattern.test(source)) {
      warningCategories.push(check.category);
      riskNotes.push(check.note);
    }
  }

  return {
    hasCriticalBlock: criticalCategories.length > 0,
    criticalCategories,
    warningCategories,
    riskNotes
  };
}

export function buildPublicQuoteRiskNotes(text: string) {
  const result = assessPublicQuotePrivacy(text);
  return result.riskNotes.join("; ");
}
