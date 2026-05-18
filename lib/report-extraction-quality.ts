/**
 * Calcula a qualidade da extração de um relatório.
 * Baseado em métricas simples como volume de texto e seções detectadas.
 */
export function calculateExtractionQuality(params: {
  status: "extracted" | "failed" | "unsupported" | "needs_manual_transcription";
  text: string;
  sectionsCount: number;
  hasPrivacyAlerts: boolean;
}): "high" | "medium" | "low" | "fail" {
  const { status, text, sectionsCount } = params;

  if (status === "failed" || status === "unsupported") {
    return "fail";
  }

  if (status === "needs_manual_transcription") {
    return "low";
  }

  const textLength = (text || "").trim().length;

  // A qualidade mede a extração técnica. Alertas de privacidade seguem como revisão obrigatória separada.
  if (status === "extracted" && textLength >= 1000 && sectionsCount >= 3) {
    return "high";
  }

  if (status === "extracted" && textLength >= 400 && sectionsCount >= 4) {
    return "high";
  }

  // Critérios para MÉDIA
  // - Sucesso na extração
  // - Pelo menos 2 seções detectadas
  // - Ou sucesso mas com alertas de privacidade
  if (status === "extracted" && (sectionsCount >= 2 || (sectionsCount >= 1 && textLength > 200))) {
    return "medium";
  }

  // Caso contrário, BAIXA
  return "low";
}

/**
 * Retorna o label amigável para a qualidade da extração.
 */
export function getExtractionQualityLabel(quality: string | null | undefined): string {
  switch (quality) {
    case "high": return "Alta";
    case "medium": return "Média";
    case "low": return "Baixa";
    case "fail": return "Falhou";
    default: return "Não avaliada";
  }
}

/**
 * Retorna a cor para a qualidade da extração.
 */
export function getExtractionQualityColor(quality: string | null | undefined): string {
  switch (quality) {
    case "high": return "text-semear-green bg-semear-green-soft";
    case "medium": return "text-amber-700 bg-amber-50";
    case "low": return "text-orange-700 bg-orange-50";
    case "fail": return "text-red-700 bg-red-50";
    default: return "text-stone-500 bg-stone-50";
  }
}
