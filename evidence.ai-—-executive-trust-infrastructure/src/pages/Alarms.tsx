/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle } from 'lucide-react';
import { BuildingObject, HistoricalDataset, HistoricalRecord, OptimizationRecommendation } from '../types';
import { deriveAlarmItems } from '../services/objectInsightService';

interface Props {
  currentObject: BuildingObject;
  historyRecords: HistoricalRecord[];
  historyDatasets: HistoricalDataset[];
  optimizationFindings: OptimizationRecommendation[];
  sourceMode?: string;
}

export function Alarms({
  currentObject,
  historyRecords,
  historyDatasets,
  optimizationFindings,
  sourceMode,
}: Props) {
  const objectRecords = historyRecords.filter((r) => r.objectId === currentObject.id);
  const objectDatasets = historyDatasets.filter((d) => d.objectId === currentObject.id);
  const alarms = deriveAlarmItems({
    object: currentObject,
    datasets: objectDatasets,
    records: objectRecords,
    optimizationFindings,
  });

  const isSimulated = sourceMode === 'SIMULATED' || sourceMode === 'FALLBACK';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Anomalies</h1>
        <p className="text-sm text-outline mt-1">
          Active anomaly and risk signals for {currentObject.name}.
        </p>
      </div>

      {isSimulated && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-orange-600" size={20} />
          <div className="text-sm font-bold text-orange-800">
            Operational anomaly detection is currently based on {sourceMode} sensor input. 
            Trust level is review-bound.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-variant bg-background/30 flex items-center gap-3">
          <AlertTriangle size={18} className="text-primary" />
          <div>
            <div className="text-lg font-bold text-on-surface">Object-Bound Anomaly Feed</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
              Derived from audit, history, forecast, and optimization layers
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {alarms.length === 0 ? (
            <div className="text-sm text-outline">No active anomalies derived for this object.</div>
          ) : (
            alarms.map((alarm) => (
              <div key={alarm.id} className="rounded-xl border border-surface-variant bg-background p-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="text-sm font-black text-on-surface">{alarm.title}</div>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded border ${alarm.severity === 'critical' ? 'bg-error-container text-error border-error/30' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    {alarm.severity}
                  </span>
                </div>
                <div className="text-sm text-on-surface leading-relaxed">{alarm.description}</div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-outline">
                  {alarm.sourceType} • {new Date(alarm.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
