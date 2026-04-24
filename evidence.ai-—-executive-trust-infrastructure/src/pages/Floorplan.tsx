/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileStack, ShieldCheck, AlertTriangle, Database } from 'lucide-react';
import { ReactNode } from 'react';
import { BuildingObject, HistoricalDataset, HistoricalRecord, OptimizationRecommendation } from '../types';
import { deriveEvidenceItems } from '../services/objectInsightService';
import { useObjectAssessments } from '../hooks/useObjectAssessments';

interface Props {
  currentObject: BuildingObject;
  historyRecords: HistoricalRecord[];
  historyDatasets: HistoricalDataset[];
  optimizationFindings: OptimizationRecommendation[];
}

export function Floorplan({
  currentObject,
  historyRecords,
  historyDatasets,
  optimizationFindings,
}: Props) {
  const { objectDatasets, objectHistory, historicalTrust, evidenceAuthority } =
    useObjectAssessments({
      currentObject,
      historyRecords,
      historyDatasets,
    });

  const evidence = deriveEvidenceItems({
    object: currentObject,
    datasets: objectDatasets,
    records: objectHistory,
    optimizationFindings,
  });

  const hasSpatialData = false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Evidence Authority</h1>
          <p className="text-sm text-outline mt-1 font-medium">
            Fact-check and data integrity layer for {currentObject.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-white border border-surface-variant rounded-lg flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${historicalTrust?.trustStatus === 'TRUST' ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">
              Truth Index: {historicalTrust?.confidenceScore ?? 0}/100
            </span>
          </div>
        </div>
      </div>

      {!hasSpatialData && (
        <div className="rounded-2xl border-2 border-dashed border-surface-variant p-10 flex flex-col items-center text-center gap-4 bg-background/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-surface-variant/30 flex items-center justify-center text-outline">
            <Database size={32} />
          </div>
          <div>
            <div className="text-xl font-black text-on-surface">Spatial Evidence Not Yet Mapped</div>
            <div className="text-sm text-outline max-w-md mx-auto mt-2 font-medium">
              Detailed floorplans and asset coordinates are currently review-bound. 
              The system is currently operating on <strong>authoritative operating evidence</strong> from linked historical records and weather telemetry.
            </div>
          </div>
          <div className="mt-2 px-4 py-2 bg-on-surface text-background text-[10px] font-black uppercase tracking-widest rounded-lg">
            Awaiting BIM/IFC Injection
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard label="Linked Datasets" value={String(objectDatasets.length)} icon={<FileStack size={18} />} detail="CSV Audit Source" />
        <InfoCard label="Operating Records" value={`${objectHistory.length} rows`} icon={<ShieldCheck size={18} />} detail="Evidence Base" />
        <InfoCard label="Opt. Signals" value={String(optimizationFindings.length)} icon={<AlertTriangle size={18} />} detail="Telemetry Based" />
        <InfoCard label="Proof Level" value={evidenceAuthority?.proofLevel ?? 'N/A'} icon={<ShieldCheck size={18} />} detail="Governance status" />
      </div>

      <div className="bg-white rounded-2xl border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-surface-variant bg-background/30 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-on-surface">Authoritative Evidence Feed</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
              Verifiable proof points linked to {currentObject.name}
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary rounded-full">
            Filtered by Object ID
          </div>
        </div>

        <div className="p-6 space-y-4">
          {evidence.length === 0 ? (
            <div className="text-sm text-outline">No object-bound evidence is linked yet.</div>
          ) : (
            evidence.map((item) => (
              <div key={item.id} className="rounded-xl border border-surface-variant bg-background p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-black text-on-surface">{item.title}</div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded border bg-white border-surface-variant text-outline">
                    {item.sourceType}
                  </span>
                </div>
                <div className="text-sm text-on-surface leading-relaxed">{item.description}</div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-outline">
                  {new Date(item.timestamp).toLocaleString()} • {item.confidence}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-variant p-4 shadow-sm group hover:border-primary transition-colors">
      <div className="flex items-center gap-2 text-outline mb-2 group-hover:text-primary">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-lg font-black text-on-surface">{value}</div>
      {detail && (
        <div className="text-[9px] font-bold text-outline uppercase mt-1 tracking-tighter">
          {detail}
        </div>
      )}
    </div>
  );
}
