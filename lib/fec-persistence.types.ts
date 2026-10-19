/**
 * Schema antecipado da migração FEC — NÃO confirma sua aplicação.
 * Isolado dos tipos existentes para evitar tocar nos módulos APS.
 * Revisar contra os tipos gerados do Supabase após identificar a base correta.
 */
import type { Database } from "@/lib/database.types";
import type { TechnicalActivityType } from "@/lib/fec-technical-cycles";
import type { FecKnowledgeRow, FecKnowledgeInsert } from "@/lib/fec-knowledge";
import type {
  FecMonthlyRow,
  FecMonthlyHistory,
} from "@/lib/fec-monthly-versions";

export type FecApprovalState =
  | "draft"
  | "submitted"
  | "needs_changes"
  | "approved";
export type FecParticipationKind = "recorded" | "estimated" | "not_recorded";

export type FecCycleRow = {
  id: string;
  engagement_id: string;
  owner_id: string;
  neighborhood_id: string;
  title: string;
  guiding_question: string;
  objectives: string;
  methodology: string;
  stage:
    | "preparation"
    | "fieldwork"
    | "systematization"
    | "feedback"
    | "closed";
  status: FecApprovalState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FecActivityRow = {
  id: string;
  cycle_id: string;
  owner_id: string;
  activity_date: string;
  activity_type: TechnicalActivityType;
  objective: string;
  methodology: string;
  participation_kind: FecParticipationKind;
  participation_count: number | null;
  themes: string;
  field_notes: string;
  preliminary_results: string;
  canonical_action_id: string | null;
  participant_accounts: string | null;
  team_observations: string | null;
  external_sources: string | null;
  map_method: string | null;
  map_legend: string | null;
  finding_draft: string | null;
  proposal_draft: string | null;
  limitations: string | null;
  next_steps: string | null;
  status: FecApprovalState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

type NewTable<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type FecCycleInsert = Pick<
  FecCycleRow,
  | "engagement_id"
  | "owner_id"
  | "neighborhood_id"
  | "title"
  | "guiding_question"
> & {
  id?: string;
  status?: FecApprovalState;
  objectives?: string;
  methodology?: string;
  stage?: FecCycleRow["stage"];
};
export type FecActivityInsert = Pick<
  FecActivityRow,
  | "cycle_id"
  | "owner_id"
  | "activity_date"
  | "activity_type"
  | "objective"
  | "methodology"
  | "participation_kind"
  | "participation_count"
> &
  Partial<
    Pick<
      FecActivityRow,
      | "participant_accounts"
      | "team_observations"
      | "external_sources"
      | "map_method"
      | "map_legend"
      | "finding_draft"
      | "proposal_draft"
      | "limitations"
      | "next_steps"
      | "themes"
      | "field_notes"
      | "preliminary_results"
      | "canonical_action_id"
    >
  > & { id?: string; status?: FecApprovalState };

export type FecDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      fec_monthly_reports: NewTable<FecMonthlyRow, never>;
      fec_monthly_history: NewTable<FecMonthlyHistory, never>;
      fec_knowledge_records: NewTable<FecKnowledgeRow, FecKnowledgeInsert>;
      fec_knowledge_files: NewTable<
        {
          id: string;
          record_id: string;
          object_name: string;
          title: string;
          created_by: string;
          created_at: string;
        },
        {
          record_id: string;
          object_name: string;
          title: string;
          created_by: string;
        }
      >;
      fec_engagements: NewTable<
        {
          id: string;
          contract_reference: string;
          title: string;
          status: "planned" | "active" | "closed";
          created_at: string;
        },
        {
          id?: string;
          contract_reference: string;
          title: string;
          status?: "planned" | "active" | "closed";
        }
      >;
      fec_access_grants: NewTable<
        {
          id: string;
          engagement_id: string;
          user_id: string;
          role: "executor" | "supervisor";
          active: boolean;
          granted_at: string;
        },
        {
          engagement_id: string;
          user_id: string;
          role: "executor" | "supervisor";
          active?: boolean;
        }
      >;
      fec_cycles: NewTable<FecCycleRow, FecCycleInsert>;
      fec_activities: NewTable<FecActivityRow, FecActivityInsert>;
      fec_review_log: NewTable<
        {
          id: string;
          engagement_id: string;
          record_kind: "cycle" | "activity" | "knowledge";
          record_id: string;
          decision:
            | "created"
            | "edited"
            | "submitted"
            | "approved"
            | "needs_changes";
          reason: string | null;
          reviewer_id: string;
          decided_at: string;
        },
        never
      >;
    };
    Functions: Database["public"]["Functions"] & {
      fec_monthly_open: {
        Args: {
          p_engagement_id: string;
          p_month: string;
          p_previous_id?: string | null;
        };
        Returns: FecMonthlyRow;
      };
      fec_monthly_save: {
        Args: {
          p_id: string;
          p_revision: number;
          p_blocks: import("@/lib/database.types").Json;
          p_no_activity_reason: string;
        };
        Returns: FecMonthlyRow;
      };
      fec_monthly_refresh: {
        Args: { p_id: string; p_revision: number };
        Returns: FecMonthlyRow;
      };
      fec_monthly_transition: {
        Args: {
          p_id: string;
          p_revision: number;
          p_decision: string;
          p_reason: string;
          p_checklist: import("@/lib/database.types").Json;
        };
        Returns: FecMonthlyRow;
      };
      fec_monthly_check: {
        Args: { p_id: string };
        Returns: { stale: boolean; source_hash: string; current_hash: string };
      };
      fec_review_record: {
        Args: {
          p_record_kind: "cycle" | "activity" | "knowledge";
          p_record_id: string;
          p_decision: "approved" | "needs_changes";
          p_reason?: string | null;
        };
        Returns: undefined;
      };
    };
  };
};
