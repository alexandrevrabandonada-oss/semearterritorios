export const workFronts = {
  education: "Educação ambiental popular",
  mapping: "Cartografia social",
  territorial_reading: "Leitura territorial",
  diagnosis: "Diagnóstico participativo",
  planting: "Plantio e educação ambiental",
  training: "Atividade formativa",
} as const;
export const activityFields = [
  ["objective", "Objetivo e pergunta orientadora"],
  ["role_description", "Papel desempenhado"],
  ["methodology", "Metodologia e dinâmica"],
  ["participant_profile", "Perfil coletivo da participação"],
  ["participant_accounts", "Relatos dos participantes"],
  ["team_observations", "Observações da equipe"],
  ["research_references", "Referências de medição ou pesquisa"],
  ["collective_results", "Resultados construídos na atividade"],
  ["consensus_evidence", "Consensos registrados e sua evidência"],
  ["divergences", "Divergências e dúvidas"],
  ["learnings", "Aprendizados registrados"],
  ["limitations", "Dificuldades e limites"],
  ["proposals", "Propostas apresentadas"],
  ["agreements", "Encaminhamentos pactuados"],
  ["follow_up", "Acompanhamento e próximos passos"],
] as const;
export type ActivityContent = Record<
  (typeof activityFields)[number][0],
  string
>;
export type WeeklyActivity = ActivityContent & {
  id: string;
  report_id: string;
  activity_date: string;
  action_id: string | null;
  workshop_id: string | null;
  kind: "field" | "preparation" | "systematization";
  title: string;
  fronts: string[];
  created_at: string;
  updated_at: string;
};
export const emptyActivityContent = Object.fromEntries(
  activityFields.map(([key]) => [key, ""]),
) as ActivityContent;
export type ActivityProduct = {
  id: string;
  item_id: string;
  product_key: string;
  version: number;
  title: string;
  product_type:
    | "social_map"
    | "workshop_record"
    | "diagnosis"
    | "educational_material"
    | "proposals";
  description: string;
  map_context: string;
  map_legend: string;
  created_at: string;
};
export const productTypes = {
  social_map: "Mapa social",
  workshop_record: "Registro de oficina",
  diagnosis: "Síntese de diagnóstico",
  educational_material: "Material formativo",
  proposals: "Propostas e encaminhamentos",
} as const;
