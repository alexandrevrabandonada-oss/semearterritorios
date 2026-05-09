/**
 * Detecta riscos de privacidade em textos extraídos de relatórios.
 * Focado em CPFs, telefones, e-mails e termos sensíveis.
 */
export function detectImportPrivacyRisks(text: string) {
  const risks: string[] = [];
  
  // CPF: 000.000.000-00 ou 00000000000
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  if (cpfRegex.test(text)) {
    risks.push("Possível CPF detectado.");
  }

  // Telefone: (00) 00000-0000, 00 000000000, etc.
  const phoneRegex = /(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}\b/g;
  if (phoneRegex.test(text)) {
    // Filtro simples para evitar falsos positivos com anos ou números pequenos
    const matches = text.match(phoneRegex);
    if (matches && matches.some(m => m.replace(/\D/g, "").length >= 8)) {
      risks.push("Possível número de telefone detectado.");
    }
  }

  // E-mail
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailRegex.test(text)) {
    risks.push("Possível endereço de e-mail detectado.");
  }

  // Endereços (Rua + Número, CEP)
  const cepRegex = /\b\d{5}-?\d{3}\b/g;
  if (cepRegex.test(text)) {
    risks.push("Possível CEP detectado.");
  }

  const addressKeywords = ["mora em", "casa de", "residente na rua", "rua "];
  const normalizedText = text.toLowerCase();
  if (addressKeywords.some(k => normalizedText.includes(k))) {
    risks.push("Termos que sugerem menção a endereço residencial detectados.");
  }

  // Termos de saúde sensíveis (exemplos básicos)
  const healthKeywords = ["diagnostico", "cid", "paciente", "prontuario", "doenca"];
  if (healthKeywords.some(k => normalizedText.includes(k))) {
    risks.push("Termos relacionados a dados de saúde detectados.");
  }

  return {
    hasRisk: risks.length > 0,
    risks,
    hasBlockingRisk: text.match(cpfRegex) || text.match(emailRegex) || (text.match(phoneRegex) && text.match(phoneRegex)!.some(m => m.replace(/\D/g, "").length >= 8)),
  };
}
