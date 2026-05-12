"use client";

import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown } from "lucide-react";
import { type RespondentTerritoryQualityMetrics, getRespondentQualityStatusLabel } from "@/lib/territorial-quality";

interface RespondentTerritoryQualityPanelProps {
  metrics: RespondentTerritoryQualityMetrics;
  onReviewClick?: () => void;
}

export function RespondentTerritoryQualityPanel({ metrics, onReviewClick }: RespondentTerritoryQualityPanelProps) {
  const statusLabel = getRespondentQualityStatusLabel(metrics.qualityStatus);
  
  const statusIcon = {
    boa: <CheckCircle className="h-5 w-5 text-green-600" />,
    atenção: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    crítica: <AlertTriangle className="h-5 w-5 text-red-600" />,
  }[metrics.qualityStatus];

  const statusBg = {
    boa: "bg-green-50 border-green-200",
    atenção: "bg-yellow-50 border-yellow-200",
    crítica: "bg-red-50 border-red-200",
  }[metrics.qualityStatus];

  const progressBg = {
    boa: "bg-green-500",
    atenção: "bg-yellow-500",
    crítica: "bg-red-500",
  }[metrics.qualityStatus];

  return (
    <div className={`p-6 border rounded-lg ${statusBg} space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <h3 className="font-semibold text-gray-900">Qualidade do território de referência</h3>
            <p className="text-sm text-gray-600">Cobertura de preenchimento do campo território de referência do entrevistado</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Total de escutas</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalRecords}</p>
        </div>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Com território</p>
          <p className="text-2xl font-bold text-green-600">{metrics.recordsWithRespondentTerritory}</p>
        </div>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Sem território</p>
          <p className="text-2xl font-bold text-red-600">{metrics.recordsWithoutRespondentTerritory}</p>
        </div>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Cobertura</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.coveragePercent}%</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso de cobertura</span>
          <span className="text-xs font-semibold text-gray-600">{statusLabel.label}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${progressBg} transition-all`}
            style={{ width: `${Math.min(metrics.coveragePercent, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-600">
          <span>0%</span>
          <span>50% (atenção)</span>
          <span>80% (boa)</span>
          <span>100%</span>
        </div>
      </div>

      {metrics.qualityStatus !== "boa" && (
        <div className="bg-white p-4 rounded border border-gray-200">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Recomendação</p>
              {metrics.qualityStatus === "atenção" && (
                <p className="text-sm text-gray-700">
                  Moderada cobertura. Considere revisar as escutas sem território de referência nas próximas bancas. 
                  Pergunte de qual bairro ou região a pessoa fala/mora/circula.
                </p>
              )}
              {metrics.qualityStatus === "crítica" && (
                <p className="text-sm text-gray-700">
                  Cobertura baixa ({metrics.coveragePercent}%). Priorize revisar escutas sem território de referência.
                  Foco especial em confirmar de qual bairro ou região as pessoas falam, sem inventar dados.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {onReviewClick && metrics.recordsWithoutRespondentTerritory > 0 && (
        <button
          onClick={onReviewClick}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Revisar {metrics.recordsWithoutRespondentTerritory} escuta{metrics.recordsWithoutRespondentTerritory !== 1 ? "s" : ""} sem território
        </button>
      )}
    </div>
  );
}
