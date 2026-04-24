/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OptimizationRecommendation } from '../types';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  findings: OptimizationRecommendation[];
}

export function OptimizationComplianceCard({ findings }: Props) {
  const highRiskCount = findings.filter((f) => f.severity === 'HIGH').length;

  return (
    <div className="bg-white rounded-xl border border-surface-variant p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
          <ShieldAlert size={20} />
        </div>
        <h3 className="font-bold text-lg text-on-surface">Optimization Compliance Risk</h3>
      </div>

      <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
        Active operational inefficiencies directly increase ESG exposure and governance risk. 
        Failure to address high-severity findings can lead to forecast trust degradation.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-background border border-surface-variant rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className={highRiskCount > 0 ? "text-error" : "text-outline"} />
            <span className="text-xs font-bold text-outline uppercase">Active High-Risk Findings</span>
          </div>
          <span className={`text-xl font-black ${highRiskCount > 0 ? "text-error" : "text-on-surface"}`}>
            {highRiskCount}
          </span>
        </div>

        {findings.length > 0 && (
          <div className="pt-4 border-t border-surface-variant">
            <div className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3">Top Risk Vector</div>
            <div className="text-xs font-bold text-on-surface p-3 bg-red-50 border border-red-100 rounded-lg">
              {findings[0]?.issue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
