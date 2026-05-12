"use client";

import { useState, useMemo } from "react";
import { MapPinned, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Neighborhood } from "@/lib/database.types";
import { formatNeighborhoodOption } from "@/lib/neighborhoods";

interface ListeningRecordForReview {
  id: string;
  action_id: string;
  date: string;
  respondent_neighborhood_id: string | null;
  respondent_territory_relation: string | null;
  places_mentioned_text: string | null;
  actions?: { title?: string; neighborhoods?: { name?: string } };
  respondent_neighborhoods?: { name?: string } | null;
}

interface RespondentTerritoryReviewQueueProps {
  records: ListeningRecordForReview[];
  neighborhoods: Neighborhood[];
  onRecordUpdated?: () => void;
}

const TERRITORY_RELATIONS = [
  { value: "mora", label: "Mora" },
  { value: "trabalha_estuda", label: "Trabalha / Estuda" },
  { value: "circula", label: "Circula" },
  { value: "fala_sobre", label: "Fala sobre" },
  { value: "nao_informado", label: "Não informado" },
];

export function RespondentTerritoryReviewQueue({
  records,
  neighborhoods,
  onRecordUpdated,
}: RespondentTerritoryReviewQueueProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    neighborhoodId: string | null;
    relation: string | null;
  }>({ neighborhoodId: null, relation: null });
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const withoutTerritory = records.filter((r) => !r.respondent_neighborhood_id);

  const startEdit = (record: ListeningRecordForReview) => {
    setEditingId(record.id);
    setEditValues({
      neighborhoodId: record.respondent_neighborhood_id || null,
      relation: record.respondent_territory_relation || null,
    });
    setSuccessId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ neighborhoodId: null, relation: null });
  };

  const saveRecord = async () => {
    if (!editingId || !supabase) return;

    setSaving(true);
    try {
      // Atualiza o registro
      const { error: updateError } = await supabase
        .from("listening_records")
        .update({
          respondent_neighborhood_id: editValues.neighborhoodId,
          respondent_territory_relation: editValues.relation as any,
        })
        .eq("id", editingId);

      if (updateError) throw updateError;

      // Registra auditoria
      const { error: auditError } = await supabase
        .from("listening_record_field_audits" as any)
        .insert({
          listening_record_id: editingId,
          field_name: "respondent_neighborhood_id",
          new_value: editValues.neighborhoodId || null,
          reason: "Revisão de qualidade territorial",
          changed_by: (await supabase.auth.getUser()).data.user?.id,
        } as any);

      if (auditError) console.error("Audit error:", auditError);

      setSuccessId(editingId);
      setEditingId(null);
      onRecordUpdated?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error("Error saving record:", err);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (withoutTerritory.length === 0) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <h3 className="font-semibold text-green-900">Excelente!</h3>
        <p className="text-sm text-green-700">Todas as escutas possuem território de referência preenchido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Escutas sem território de referência ({withoutTerritory.length})
        </h3>
        <p className="text-sm text-blue-700 mt-2">
          <strong>Atenção:</strong> Corrija apenas quando houver evidência na ficha ou na fala. <strong>Não invente território.</strong>
        </p>
      </div>

      <div className="space-y-3">
        {withoutTerritory.map((record) => (
          <div
            key={record.id}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPinned className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-gray-900">{record.actions?.title || "Sem ação"}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Local da ação: <strong>{record.actions?.neighborhoods?.name || "Não informado"}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">Data: {new Date(record.date).toLocaleDateString("pt-BR")}</p>
              </div>
              {successId === record.id && (
                <div className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  ✓ Salvo
                </div>
              )}
            </div>

            {record.places_mentioned_text && (
              <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Lugares citados:</p>
                <p className="text-sm text-gray-700 line-clamp-2">{record.places_mentioned_text}</p>
              </div>
            )}

            {editingId === record.id ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Território de referência</label>
                  <select
                    value={editValues.neighborhoodId || ""}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        neighborhoodId: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecionar...</option>
                    {neighborhoods.map((n) => (
                      <option key={n.id} value={n.id}>
                        {formatNeighborhoodOption(n)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vínculo com o território</label>
                  <select
                    value={editValues.relation || ""}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        relation: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecionar...</option>
                    {TERRITORY_RELATIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveRecord}
                    disabled={saving}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(record)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Revisar e preencher
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
