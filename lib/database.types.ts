export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SourceType =
  | "feira"
  | "cras"
  | "escola"
  | "praca"
  | "roda"
  | "oficina"
  | "caminhada"
  | "outro";

export type ReviewStatus = "draft" | "reviewed";
export type TerritorialReviewStatus = "pending" | "reviewed" | "needs_attention";
export type NormalizedPlaceVisibility = "internal" | "public_safe" | "sensitive";
export type DebriefStatus = "draft" | "reviewed" | "approved";
export type ClosureStatus = "open" | "in_review" | "closed" | "reopened";
export type InternalMapHomologationStatus = "draft" | "reviewed" | "approved" | "rejected";
export type InternalMapHomologationDecision =
  | "no_go_dados_insuficientes"
  | "no_go_privacidade"
  | "no_go_normalizacao"
  | "go_desenho_tecnico"
  | "go_prototipo_interno"
  | "manter_mapa_lista";

export type NeighborhoodStatus = "oficial" | "provisorio" | "revisar" | "nao_usar";
export type NeighborhoodSector = "SCN" | "SO" | "SN" | "SL" | "SS" | "SCS" | "SSO";

export type ActionType =
  | "banca_escuta"
  | "roda"
  | "oficina"
  | "caminhada"
  | "reuniao_institucional"
  | "devolutiva"
  | "outro";

export type ActionStatus = "planejada" | "realizada" | "reprogramada" | "cancelada";

type TimestampedRow = {
  created_at: string;
  updated_at: string;
};

type CreatedByRow = {
  created_by: string | null;
};

export type Profile = TimestampedRow & {
  id: string;
  full_name: string | null;
  role: "equipe" | "coordenacao" | "admin" | null;
};

export type Neighborhood = TimestampedRow &
  CreatedByRow & {
    id: string;
    name: string;
    city: string | null;
    official_code: number | null;
    sector: NeighborhoodSector | null;
    region: string | null;
    aliases: string | null;
    status: NeighborhoodStatus | null;
    notes: string | null;
  };

export type Action = TimestampedRow &
  CreatedByRow & {
    id: string;
    title: string;
    action_type: ActionType;
    action_date: string;
    neighborhood_id: string | null;
    location_reference: string | null;
    objective: string | null;
    team: string | null;
    estimated_public: number | null;
    summary: string | null;
    status: ActionStatus;
    notes: string | null;
  };

export type ListeningRecord = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string | null;
    neighborhood_id: string | null;
    date: string;
    source_type: SourceType;
    interviewer_name: string;
    approximate_age_range: string | null;
    free_speech_text: string;
    team_summary: string | null;
    words_used: string | null;
    places_mentioned_text: string | null;
    priority_mentioned: string | null;
    unexpected_notes: string | null;
    review_status: ReviewStatus;
    territorial_review_status: TerritorialReviewStatus;
    territorial_review_notes: string | null;
  };

export type Theme = TimestampedRow &
  CreatedByRow & {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  };

export type ListeningRecordTheme = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    theme_id: string;
    notes: string | null;
  };

export type PlaceMentioned = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    neighborhood_id: string | null;
    normalized_place_id: string | null;
    place_name: string;
    place_type: string | null;
    notes: string | null;
  };

export type NormalizedPlace = TimestampedRow &
  CreatedByRow & {
    id: string;
    neighborhood_id: string | null;
    normalized_name: string;
    place_type: string;
    visibility: NormalizedPlaceVisibility;
    notes: string | null;
  };

export type MonthlyReport = TimestampedRow &
  CreatedByRow & {
    id: string;
    reference_month: string;
    title: string;
    free_speech_highlights: string | null;
    team_analysis: string | null;
    recurring_themes: string | null;
    territorial_notes: string | null;
    review_status: ReviewStatus;
  };

export type ActionDebrief = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string;
    title: string;
    public_summary: string;
    methodology_note: string;
    key_findings: string;
    next_steps: string;
    generated_markdown: string;
    team_review_text: string;
    status: DebriefStatus;
    totals_snapshot: Json;
    approved_by: string | null;
    approved_at: string | null;
  };

export type ActionClosure = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string;
    status: ClosureStatus;
    coordination_sufficiency: boolean;
    sufficiency_reason: string | null;
    documentation_checklist: Json;
    evidence_notes: string | null;
    internal_notes: string | null;
    closed_by: string | null;
    closed_at: string | null;
    reopened_by: string | null;
    reopened_at: string | null;
  };

export type InternalMapHomologation = TimestampedRow &
  CreatedByRow & {
    id: string;
    status: InternalMapHomologationStatus;
    decision: InternalMapHomologationDecision;
    decision_reason: string;
    rls_validated: boolean;
    admin_tested: boolean;
    coordenacao_tested: boolean;
    equipe_tested: boolean;
    anon_blocked: boolean;
    service_role_absent_frontend: boolean;
    privacy_checked: boolean;
    no_geocoding_confirmed: boolean;
    reviewed_records_count: number;
    territories_count: number;
    ready_territories_count: number;
    blocked_territories_count: number;
    sensitive_pending_count: number;
    duplicate_warnings_count: number;
    safe_normalized_places_count: number;
    snapshot: Json;
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
  };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at" | "role"> & Partial<Pick<Profile, "role">>;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      neighborhoods: {
        Row: Neighborhood;
        Insert: Omit<Neighborhood, "id" | "created_at" | "updated_at" | "official_code" | "sector" | "region" | "aliases" | "status"> & {
          id?: string;
          official_code?: number | null;
          sector?: NeighborhoodSector | null;
          region?: string | null;
          aliases?: string | null;
          status?: NeighborhoodStatus | null;
        };
        Update: Partial<Omit<Neighborhood, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      actions: {
        Row: Action;
        Insert: Omit<Action, "id" | "created_at" | "updated_at" | "action_type" | "status"> & {
          id?: string;
          action_type?: ActionType;
          status?: ActionStatus;
        };
        Update: Partial<Omit<Action, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "actions_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_records: {
        Row: ListeningRecord;
        Insert: Omit<
          ListeningRecord,
          "id" | "created_at" | "updated_at" | "source_type" | "review_status" | "territorial_review_status" | "territorial_review_notes"
        > & {
          id?: string;
          source_type?: SourceType;
          review_status?: ReviewStatus;
          territorial_review_status?: TerritorialReviewStatus;
          territorial_review_notes?: string | null;
        };
        Update: Partial<Omit<ListeningRecord, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_records_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_records_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      themes: {
        Row: Theme;
        Insert: Omit<Theme, "id" | "created_at" | "updated_at" | "is_active"> & {
          id?: string;
          is_active?: boolean;
        };
        Update: Partial<Omit<Theme, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      listening_record_themes: {
        Row: ListeningRecordTheme;
        Insert: Omit<ListeningRecordTheme, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<ListeningRecordTheme, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_record_themes_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_record_themes_theme_id_fkey";
            columns: ["theme_id"];
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
      places_mentioned: {
        Row: PlaceMentioned;
        Insert: Omit<PlaceMentioned, "id" | "created_at" | "updated_at" | "normalized_place_id"> & {
          id?: string;
          normalized_place_id?: string | null;
        };
        Update: Partial<Omit<PlaceMentioned, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "places_mentioned_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_mentioned_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_mentioned_normalized_place_id_fkey";
            columns: ["normalized_place_id"];
            referencedRelation: "normalized_places";
            referencedColumns: ["id"];
          }
        ];
      };
      normalized_places: {
        Row: NormalizedPlace;
        Insert: Omit<NormalizedPlace, "id" | "created_at" | "updated_at" | "visibility"> & {
          id?: string;
          visibility?: NormalizedPlaceVisibility;
        };
        Update: Partial<Omit<NormalizedPlace, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "normalized_places_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      monthly_reports: {
        Row: MonthlyReport;
        Insert: Omit<MonthlyReport, "id" | "created_at" | "updated_at" | "review_status"> & {
          id?: string;
          review_status?: ReviewStatus;
        };
        Update: Partial<Omit<MonthlyReport, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      action_debriefs: {
        Row: ActionDebrief;
        Insert: Omit<ActionDebrief, "id" | "created_at" | "updated_at" | "status" | "totals_snapshot"> & {
          id?: string;
          status?: DebriefStatus;
          totals_snapshot?: Json;
        };
        Update: Partial<Omit<ActionDebrief, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "action_debriefs_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          }
        ];
      };
      action_closures: {
        Row: ActionClosure;
        Insert: Partial<Omit<ActionClosure, "id" | "created_at" | "updated_at">> & {
          id?: string;
          action_id: string;
        };
        Update: Partial<Omit<ActionClosure, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "action_closures_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          }
        ];
      };
      internal_map_homologations: {
        Row: InternalMapHomologation;
        Insert: Partial<Omit<
          InternalMapHomologation,
          "id" | "created_at" | "updated_at" | "status" | "decision" | "snapshot"
        >> & {
          id?: string;
          decision_reason: string;
          created_by: string | null;
          status?: InternalMapHomologationStatus;
          decision?: InternalMapHomologationDecision;
          snapshot?: Json;
        };
        Update: Partial<Omit<InternalMapHomologation, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "internal_map_homologations_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_map_homologations_rejected_by_fkey";
            columns: ["rejected_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      source_type: SourceType;
      review_status: ReviewStatus;
      action_type: ActionType;
      action_status: ActionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
