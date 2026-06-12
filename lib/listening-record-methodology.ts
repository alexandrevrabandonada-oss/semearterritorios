import type { ActionType, ListeningRecord, SourceType } from "@/lib/database.types";
import { calculateRespondentTerritoryQuality } from "@/lib/territorial-quality";

type RecordKindInput = Pick<ListeningRecord, "source_type" | "respondent_neighborhood_id"> & {
  actions?: { action_type?: ActionType | string | null } | null;
};

export function isConversationCircleRecord(record: { source_type?: SourceType | string | null; actions?: { action_type?: ActionType | string | null } | null }) {
  return record.source_type === "roda" || record.actions?.action_type === "roda";
}

export function getIndividualListeningRecords<TRecord extends RecordKindInput>(records: TRecord[]) {
  return records.filter((record) => !isConversationCircleRecord(record));
}

export function calculateIndividualRespondentTerritoryQuality<TRecord extends RecordKindInput>(records: TRecord[]) {
  const individualRecords = getIndividualListeningRecords(records);
  return calculateRespondentTerritoryQuality(
    individualRecords.length,
    individualRecords.filter((record) => Boolean(record.respondent_neighborhood_id)).length
  );
}

export function getConversationCircleRecordLabel(record: { source_type?: SourceType | string | null; actions?: { action_type?: ActionType | string | null } | null }) {
  return isConversationCircleRecord(record) ? "Relato de roda" : "Escuta individual";
}
