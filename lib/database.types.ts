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
  role: "equipe" | "coordenacao" | "admin";
};

export type Neighborhood = TimestampedRow &
  CreatedByRow & {
    id: string;
    name: string;
    city: string | null;
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
    place_name: string;
    place_type: string | null;
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
        Insert: Omit<Neighborhood, "id" | "created_at" | "updated_at"> & { id?: string };
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
          "id" | "created_at" | "updated_at" | "source_type" | "review_status"
        > & {
          id?: string;
          source_type?: SourceType;
          review_status?: ReviewStatus;
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
        Insert: Omit<PlaceMentioned, "id" | "created_at" | "updated_at"> & { id?: string };
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
