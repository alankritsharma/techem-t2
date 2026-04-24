/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EvidenceAuthorityAssessment } from '../types';
import { ShieldCheck, ShieldQuestion, ShieldAlert, MinusCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface EvidenceAuthorityCardProps {
  assessment: EvidenceAuthorityAssessment;
}

export function EvidenceAuthorityCard({ assessment }: EvidenceAuthorityCardProps) {
  const tone =
    assessment.proofLevel === 'FULLY_VERIFIED'
      ? 'good'
      : assessment.proofLevel === 'PARTIALLY_VERIFIED'
      ? 'good'
      : assessment.proofLevel === 'REQUIRES_REVIEW'
      ? 'review'
      : 'bad';

  return (
    <div
      id="evidence-authority-card"
      className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Evidence Authority</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Truth authority before executive output
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-white',
              tone === 'good'
                ? 'bg-green-600'
                : tone === 'review'
                ? 'bg-orange-500'
                : 'bg-error'
            )}
          >
            {tone === 'good' ? (
              <ShieldCheck size={26} />
            ) : tone === 'review' ? (
              <ShieldQuestion size={26} />
            ) : (
              <ShieldAlert size={26} />
            )}
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-on-surface">
              {assessment.proofLevel}
            </div>
            <div className="text-sm text-outline">
              Evidence completeness: {assessment.evidenceCompletenessScore}/100
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Explanation
          </div>
          <div className="text-sm font-bold text-on-surface">{assessment.explanationSummary}</div>
        </div>

        {assessment.scoreBreakdown && assessment.scoreBreakdown.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Why Not Fully Verified?
            </div>
            <div className="space-y-2">
              {assessment.scoreBreakdown.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MinusCircle size={13} className="text-orange-700" />
                    <span className="font-black">{item.label}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                      {item.delta}
                    </span>
                  </div>
                  <div className="text-xs font-bold">{item.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment.authoritativeSources.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Authoritative Sources
            </div>
            <div className="space-y-2">
              {assessment.authoritativeSources.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-950"
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment.missingEvidence.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Missing Evidence
            </div>
            <div className="space-y-2">
              {assessment.missingEvidence.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg border border-surface-variant bg-background p-3 text-sm"
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {assessment.reviewBoundStatements.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Review-Bound Statements
            </div>
            <div className="space-y-2">
              {assessment.reviewBoundStatements.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900"
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
