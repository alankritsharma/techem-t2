/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecutiveDecisionModelResult, AdversarialObjectionResult, RecommendationGateResult } from '../types';
import { AlertTriangle, ShieldQuestion } from 'lucide-react';

interface DecisionResiliencePanelProps {
  decision: ExecutiveDecisionModelResult;
  objections: AdversarialObjectionResult;
  gate: RecommendationGateResult;
}

export function DecisionResiliencePanel({
  decision,
  objections,
  gate,
}: DecisionResiliencePanelProps) {
  return (
    <div id="decision-resilience-panel" className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Decision Resilience</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Why this decision could fail
        </div>
      </div>

      <div className="p-6 space-y-4">
        <PanelBlock title="Weakest Assumption" value={decision.weakestAssumption} />
        <PanelBlock title="Critical Failure Point" value={decision.criticalFailurePoint} />
        <PanelBlock
          title="Confidence Boundary"
          value={decision.confidenceBoundary}
        />

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-700" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-orange-700">
              Strongest Objection
            </div>
          </div>
          <div className="text-sm font-bold text-on-surface">{objections.weakestObjection}</div>
          <div className="text-xs text-outline mt-1">
            Severity: {objections.objectionSeverity}
          </div>
        </div>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldQuestion size={16} className="text-primary" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Recommendation Gate
            </div>
          </div>
          <div className="text-sm font-bold text-on-surface">{gate.decision}</div>
          <div className="text-xs text-outline mt-1">{gate.requiredNextStep}</div>
        </div>
      </div>
    </div>
  );
}

function PanelBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-background p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
        {title}
      </div>
      <div className="text-sm font-bold text-on-surface">{value}</div>
    </div>
  );
}
