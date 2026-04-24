/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingObject, HistoricalDataset, HistoricalRecord, OptimizationRecommendation } from '../types';
import { deriveComplianceItems } from '../services/objectInsightService';
import { OptimizationComplianceCard } from '../components/OptimizationComplianceCard';
import { useObjectAssessments } from '../hooks/useObjectAssessments';

interface Props {
  currentObject: BuildingObject;
  historyRecords: HistoricalRecord[];
  historyDatasets: HistoricalDataset[];
  optimizationFindings: OptimizationRecommendation[];
}

export function ESG({
  currentObject,
  historyRecords,
  historyDatasets,
  optimizationFindings,
}: Props) {
  const { historicalTrust, economicValue, evidenceAuthority } = useObjectAssessments({
    currentObject,
    historyRecords,
    historyDatasets,
  });

  const rows =
    historicalTrust && evidenceAuthority && economicValue
      ? deriveComplianceItems({
          object: currentObject,
          historicalTrust,
          evidenceAuthority,
          economicValue,
          optimizationFindings,
        })
      : [];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Compliance</h1>
        <p className="text-sm text-outline mt-1">
          Object-bound compliance exposure for {currentObject.name}.
        </p>
      </div>

      <OptimizationComplianceCard findings={optimizationFindings} />

      <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-variant bg-background/30">
          <div className="text-lg font-bold text-on-surface">Governance Evidence Matrix</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
            Compliance now follows the selected object context
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/30">
                <th className="py-4 px-6 text-[10px] font-bold text-outline uppercase tracking-widest">Decision Pillar</th>
                <th className="py-4 px-6 text-[10px] font-bold text-outline uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-outline uppercase tracking-widest">Last Verified</th>
                <th className="py-4 px-6 text-[10px] font-bold text-outline uppercase tracking-widest">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-4 px-6 text-sm font-bold text-on-surface">{row.pillar}</td>
                  <td className="py-4 px-6">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded border ${row.status === 'Critical' ? 'bg-error-container text-error border-error/30' : row.status === 'Warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-on-surface">{new Date(row.lastVerified).toLocaleDateString()}</td>
                  <td className="py-4 px-6 text-sm text-on-surface">{row.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
