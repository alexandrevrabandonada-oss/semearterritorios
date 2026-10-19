import { describe, expect, it } from "vitest";
import { parseFecCycleCreate, parseFecActivityCreate } from "@/lib/fec-api-input";

const user = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const attacker = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const engagementId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const neighborhoodId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const cycleId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const validActivity = {
  cycleId,
  activityDate: "2026-10-19",
  activityType: "cartography_workshop",
  objective: "Produzir representacao coletiva do territorio.",
  methodology: "Mapa coletivo e debate metodologico.",
  participationKind: "estimated",
  participantCount: 12,
  participantAccounts: "Participantes citaram percepcoes de poeira.",
  mapMethod: "Mapa-base revisado coletivamente.",
  mapLegend: "P = percepcao sobre poeira",
  finding: "Registro participante, nao medicao."
};

describe("fronteira da API FEC com autoria do JWT", () => {
  it("recebe contrato/bairro, mas owner e status sao sempre do servidor", () => {
    const result = parseFecCycleCreate({
      engagementId, neighborhoodId, title: "Leitura do territorio",
      guidingQuestion: "Como as pessoas percebem os impactos da qualidade do ar?",
      owner_id: attacker, status: "approved", reviewed_by: attacker,
    }, user);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner_id).toBe(user);
      expect(result.value.status).toBe("draft");
      expect("reviewed_by" in result.value).toBe(false);
    }
  });

  it("rejeita ciclo sem identificadores ou pergunta", () => {
    expect(parseFecCycleCreate({
      engagementId: "scope-sem-uuid", neighborhoodId, title: "abc", guidingQuestion: "Q?"
    }, user).ok).toBe(false);
  });

  it("impede forja de autoria ou aprovacao nas atividades", () => {
    const result = parseFecActivityCreate({ ...validActivity, owner_id: attacker, status: "approved" }, user);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.owner_id).toBe(user);
      expect(result.value.status).toBe("draft");
      expect("reviewed_by" in result.value).toBe(false);
      expect(result.value.participation_count).toBe(12);
    }
  });

  it("rejeita atividades com dados pessoais detectados", () => {
    const result = parseFecActivityCreate({ ...validActivity, participantAccounts: "contato@exemplo.org" }, user);
    expect(result.ok).toBe(false);
  });

  it("nao permite publico em preparacao ou zero inventado quando ausente", () => {
    expect(parseFecActivityCreate({
      ...validActivity, activityType: "preparation",
      participationKind: "estimated", participantCount: 12
    }, user).ok).toBe(false);
    const accepted = parseFecActivityCreate({
      ...validActivity, activityType: "preparation",
      participationKind: "not_recorded", participantCount: null
    }, user);
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.value.participation_count).toBeNull();
  });

  it("exige origem de um achado e legenda do mapa", () => {
    expect(parseFecActivityCreate({
      ...validActivity, participantAccounts: "", externalSources: "", teamObservations: ""
    }, user).ok).toBe(false);
    expect(parseFecActivityCreate({ ...validActivity, mapLegend: "" }, user).ok).toBe(false);
  });
});
