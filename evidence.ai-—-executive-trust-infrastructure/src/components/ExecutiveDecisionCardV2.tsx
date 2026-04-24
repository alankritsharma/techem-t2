/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecutiveDecisionModelResult, RecommendationGateResult, EvidenceAuthorityAssessment } from '../types';
import { cn } from '../lib/utils';
import { History, ShieldCheck, Database } from 'lucide-react';

interface ExecutiveDecisionCardV2Props {
  decision: ExecutiveDecisionModelResult;
  gate?: RecommendationGateResult;
  evidence?: EvidenceAuthorityAssessment;
}

export function ExecutiveDecisionCardV2({ decision, gate, evidence }: ExecutiveDecisionCardV2Props) {
  return (
    <div id="executive-decision-card-v2" className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-black text-on-surface uppercase tracking-tight">Executive Decision Model</div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1">
          BOARD-SAFE TRUST VALIDATION ENGINE
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div
          className={cn(
            'px-6 py-6 rounded-2xl border transition-all',
            decision.finalStatus === 'TRUST'
              ? 'bg-green-50 border-green-200'
              : decision.finalStatus === 'REVIEW'
              ? 'bg-yellow-50 border-yellow-200'
              : decision.finalStatus === 'HIGH RISK'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-error-container/20 border-error/30 shadow-inner'
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                Final Decision Status
              </div>
              <div className="text-4xl font-black tracking-tighter text-on-surface">
                {decision.finalStatus}
              </div>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
              decision.finalStatus === 'TRUST' ? "bg-green-200 text-green-800" : "bg-white/50 text-on-surface"
            )}>
              {gate?.decision || 'Assessable'}
            </div>
          </div>
          <div className="text-sm font-medium text-on-surface leading-snug">{decision.decisionExplanation}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Metric label="Primary Risk Driver" value={decision.primaryRiskDriver} />
          <Metric 
            label="Optimization Risks" 
            value={decision.optimizationRiskCount > 0 
              ? `${decision.optimizationRiskCount} Active Findings` 
              : 'No Active Risks'} 
            status={decision.optimizationRiskCount > 0 ? 'warning' : 'good'}
          />
          <Metric label="Recommended Next Action" value={decision.recommendedNextAction} highlighted />
        </div>

        {/* Governance and Traceability Section */}
        <div className="pt-4 border-t border-surface-variant">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-outline" />
            <h4 className="text-xs font-black text-outline uppercase tracking-[0.2em]">Evidence Chain & Traceability</h4>
          </div>

          <div className="space-y-3">
            <TraceStep 
              icon={Database} 
              label="Authoritative Evidence" 
              value={evidence?.proofLevel ?? 'UNKNOWN'} 
              detail={evidence?.explanationSummary ?? 'Evidence base assessment pending.'} 
            />
            <TraceStep 
              icon={ShieldCheck} 
              label="Adversarial Validation" 
              value={decision.weakestAssumption ? 'CHALLENGED' : 'UNTESTED'} 
              detail={`Primary vulnerability identified: ${decision.weakestAssumption}`} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceStep({ icon: Icon, label, value, detail }: { icon: any, label: string, value: string, detail: string }) {
  return (
    <div className="flex gap-4 p-3 rounded-xl bg-background/50 border border-surface-variant/50">
      <div className="w-8 h-8 rounded-lg bg-white border border-surface-variant flex items-center justify-center shrink-0">
        <Icon size={16} className="text-outline" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{label}</span>
          <span className="text-[10px] font-black text-on-surface uppercase">{value}</span>
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, highlighted, status }: { label: string; value: string; highlighted?: boolean; status?: 'good' | 'warning' | 'critical' }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      highlighted ? "border-primary/20 bg-primary/5" : "border-surface-variant bg-background",
      status === 'good' && "border-green-100 bg-green-50/30",
      status === 'warning' && "border-orange-100 bg-orange-50/30",
      status === 'critical' && "border-red-100 bg-red-50/30"
    )}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
        {label}
      </div>
      <div className={cn(
        "text-sm font-bold text-on-surface",
        highlighted && "text-primary",
        status === 'good' && "text-green-700",
        status === 'warning' && "text-orange-700",
        status === 'critical' && "text-red-700"
      )}>{value}</div>
    </div>
  );
}
