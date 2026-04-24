/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HistoricalTrustAssessment } from '../types';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '../lib/utils';

interface HistoricalTrustCardProps {
  assessment: HistoricalTrustAssessment;
}

export function HistoricalTrustCard({ assessment }: HistoricalTrustCardProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Historical Trust</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Evidence quality for linked history
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-white',
              assessment.trustStatus === 'TRUST'
                ? 'bg-green-600'
                : assessment.trustStatus === 'REVIEW'
                ? 'bg-orange-500'
                : 'bg-error'
            )}
          >
            {assessment.trustStatus === 'TRUST' ? (
              <ShieldCheck size={28} />
            ) : assessment.trustStatus === 'REVIEW' ? (
              <ShieldQuestion size={28} />
            ) : (
              <ShieldAlert size={28} />
            )}
          </div>

          <div>
            <div
              className={cn(
                'text-2xl font-black tracking-tight',
                assessment.trustStatus === 'TRUST'
                  ? 'text-green-700'
                  : assessment.trustStatus === 'REVIEW'
                  ? 'text-orange-700'
                  : 'text-error'
              )}
            >
              {assessment.trustStatus}
            </div>
            <div className="text-sm text-outline">
              Confidence Score: {assessment.confidenceScore}/100
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Weakest Point
          </div>
          <div className="text-sm font-bold text-on-surface">{assessment.weakestPoint}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Metric label="Datasets" value={String(assessment.datasetIds.length)} />
          <Metric label="Records" value={String(assessment.coverage.recordCount)} />
          <Metric
            label="Coverage"
            value={
              assessment.coverage.start && assessment.coverage.end
                ? `${assessment.coverage.start} → ${assessment.coverage.end}`
                : 'Not available'
            }
          />
        </div>

        {assessment.issues.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Review Notes
            </div>
            <div className="space-y-2">
              {assessment.issues.slice(0, 5).map((issue, index) => (
                <div key={`${issue}-${index}`} className="rounded-lg border border-surface-variant bg-background p-3 text-sm text-on-surface">
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-on-surface">{value}</div>
    </div>
  );
}
