/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ForecastReadinessAssessment } from '../types';
import { CheckCircle2, AlertTriangle, ShieldQuestion } from 'lucide-react';
import { cn } from '../lib/utils';

interface ForecastReadinessCardProps {
  assessment: ForecastReadinessAssessment;
}

export function ForecastReadinessCard({ assessment }: ForecastReadinessCardProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Forecast Readiness</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Can this object support forecast decisions?
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center text-white',
              assessment.readinessStatus === 'READY'
                ? 'bg-green-600'
                : assessment.readinessStatus === 'REVIEW REQUIRED'
                ? 'bg-orange-500'
                : 'bg-error'
            )}
          >
            {assessment.readinessStatus === 'READY' ? (
              <CheckCircle2 size={24} />
            ) : assessment.readinessStatus === 'REVIEW REQUIRED' ? (
              <ShieldQuestion size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
          </div>

          <div>
            <div
              className={cn(
                'text-xl font-black tracking-tight',
                assessment.readinessStatus === 'READY'
                  ? 'text-green-700'
                  : assessment.readinessStatus === 'REVIEW REQUIRED'
                  ? 'text-orange-700'
                  : 'text-error'
              )}
            >
              {assessment.readinessStatus}
            </div>
            <div className="text-sm text-outline">{assessment.requiredNextStep}</div>
          </div>
        </div>

        {assessment.reasons.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Blocking / Review Reasons
            </div>
            <div className="space-y-2">
              {assessment.reasons.map((reason, index) => (
                <div key={`${reason}-${index}`} className="rounded-lg border border-surface-variant bg-background p-3 text-sm text-on-surface">
                  • {reason}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
