import type { InternalMapGoNoGoResult } from "@/lib/internal-map-scope";
import type { NormalizedPlacesQualitySummary } from "@/lib/normalized-places-quality";
import type { InternalMapReadiness } from "@/types/internal-map";

export type MapHomologationManualChecks = {
  rlsValidated: boolean;
  adminTested: boolean;
  coordenacaoTested: boolean;
  equipeTested: boolean;
  anonBlocked: boolean;
  serviceRoleAbsent: boolean;
  noOriginalSpeech: boolean;
  noPersonalData: boolean;
  sensitiveHidden: boolean;
  sensitiveTypeHidden: boolean;
  noGeocoding: boolean;
};

export type MapHomologationResult = {
  status: "Não homologado" | "Homologação pendente" | "Homologado para protótipo interno" | "Manter mapa-lista";
  recommendation: string;
  pendingItems: string[];
};

export function buildMapHomologation(input: {
  goNoGo: InternalMapGoNoGoResult;
  normalizedQuality?: NormalizedPlacesQualitySummary;
  checks: MapHomologationManualChecks;
}): MapHomologationResult {
  const pendingItems = getPendingItems(input);
  const recommendation = getHomologationRecommendation(input);

  if (recommendation === "autorizado protótipo interno autenticado") {
    return { status: "Homologado para protótipo interno", recommendation, pendingItems };
  }

  if (recommendation === "manter mapa-lista e ampliar dados") {
    return { status: "Manter mapa-lista", recommendation, pendingItems };
  }

  if (pendingItems.length > 0) {
    return { status: "Homologação pendente", recommendation, pendingItems };
  }

  return { status: "Não homologado", recommendation, pendingItems };
}

export function buildMapHomologationMarkdown(input: {
  goNoGo: InternalMapGoNoGoResult;
  homologation: MapHomologationResult;
  checks: MapHomologationManualChecks;
}) {
  const summary = input.goNoGo.summary;

  return `# Homologação do mapa interno

## Síntese

- Status: ${input.homologation.status}
- Recomendação: ${input.homologation.recommendation}
- Total de escutas: ${summary.totalRecords}
- Escutas revisadas: ${summary.reviewedRecords}
- Territórios com dados: ${summary.territoriesWithData}
- Territórios prontos: ${summary.readyTerritories}
- Territórios bloqueados: ${summary.blockedTerritories}
- Lugares normalizados seguros: ${summary.safeNormalizedPlaces}
- Sensíveis pendentes: ${summary.sensitivePlaces}
- Duplicidades pendentes: ${summary.duplicateWarnings}

## Banco e RLS

- RLS validada manualmente: ${yesNo(input.checks.rlsValidated)}
- Admin testado: ${yesNo(input.checks.adminTested)}
- Coordenação testada: ${yesNo(input.checks.coordenacaoTested)}
- Equipe testada: ${yesNo(input.checks.equipeTested)}
- Anônimo sem acesso: ${yesNo(input.checks.anonBlocked)}
- service_role ausente do frontend: ${yesNo(input.checks.serviceRoleAbsent)}

## Privacidade

- Sem fala original no mapa: ${yesNo(input.checks.noOriginalSpeech)}
- Sem CPF/telefone/e-mail/endereço: ${yesNo(input.checks.noPersonalData)}
- Lugares sensitive ocultos: ${yesNo(input.checks.sensitiveHidden)}
- sensivel_nao_publicar oculto: ${yesNo(input.checks.sensitiveTypeHidden)}
- Sem geocodificação: ${yesNo(input.checks.noGeocoding)}

## Pendências

${input.homologation.pendingItems.length > 0 ? input.homologation.pendingItems.map((item) => `- ${item}`).join("\n") : "- Nenhuma pendência registrada neste painel."}

## Decisão recomendada

${input.homologation.recommendation}
`;
}

function getHomologationRecommendation(input: {
  goNoGo: InternalMapGoNoGoResult;
  normalizedQuality?: NormalizedPlacesQualitySummary;
  checks: MapHomologationManualChecks;
}): string {
  if (!input.checks.rlsValidated || !input.checks.anonBlocked || !input.checks.serviceRoleAbsent) {
    return "não prototipar mapa ainda";
  }

  const privacyChecks = input.checks.noOriginalSpeech && input.checks.noPersonalData && input.checks.sensitiveHidden && input.checks.sensitiveTypeHidden && input.checks.noGeocoding;
  if (!privacyChecks || input.goNoGo.summary.sensitivePlaces > 0) {
    return "bloquear protótipo até resolver privacidade";
  }

  if ((input.normalizedQuality?.possibleDuplicates.length ?? input.goNoGo.summary.duplicateWarnings) > 0) {
    return "revisar normalização antes do protótipo";
  }

  if (input.goNoGo.summary.reviewedRecords < 20 || input.goNoGo.summary.territoriesWithData < 3) {
    return "manter mapa-lista e ampliar dados";
  }

  if (input.goNoGo.status !== "GO: protótipo interno") {
    return mapGoNoGoToRecommendation(input.goNoGo.status);
  }

  return "autorizado protótipo interno autenticado";
}

function getPendingItems(input: {
  goNoGo: InternalMapGoNoGoResult;
  checks: MapHomologationManualChecks;
}) {
  const pending: string[] = [];
  const labels: Array<[keyof MapHomologationManualChecks, string]> = [
    ["rlsValidated", "Validar RLS manualmente no banco aplicado."],
    ["adminTested", "Testar usuário admin."],
    ["coordenacaoTested", "Testar usuário coordenação."],
    ["equipeTested", "Testar usuário equipe."],
    ["anonBlocked", "Confirmar que usuário anônimo não acessa dados do mapa."],
    ["serviceRoleAbsent", "Confirmar ausência de service_role no frontend."],
    ["noOriginalSpeech", "Confirmar que fala original não aparece em contexto de mapa."],
    ["noPersonalData", "Confirmar ausência de CPF, telefone, e-mail e endereço."],
    ["sensitiveHidden", "Confirmar que visibility = sensitive fica oculto."],
    ["sensitiveTypeHidden", "Confirmar que sensivel_nao_publicar fica oculto."],
    ["noGeocoding", "Confirmar que não há geocodificação."]
  ];

  labels.forEach(([key, label]) => {
    if (!input.checks[key]) pending.push(label);
  });

  input.goNoGo.criteria.filter((criterion) => !criterion.ok).forEach((criterion) => {
    pending.push(`${criterion.label}: ${criterion.detail}`);
  });

  return pending;
}

function mapGoNoGoToRecommendation(status: InternalMapReadiness) {
  if (status === "NO-GO: privacidade") return "bloquear protótipo até resolver privacidade";
  if (status === "NO-GO: normalização") return "revisar normalização antes do protótipo";
  if (status === "NO-GO: dados insuficientes") return "manter mapa-lista e ampliar dados";
  if (status === "GO: desenho técnico") return "não prototipar mapa ainda";
  return "autorizado protótipo interno autenticado";
}

function yesNo(value: boolean) {
  return value ? "sim" : "não";
}
