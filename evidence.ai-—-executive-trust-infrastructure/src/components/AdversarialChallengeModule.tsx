/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdversarialObjectionResult } from '../types';
import { ShieldAlert, AlertCircle, Info, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdversarialChallengeModuleProps {
  objections: AdversarialObjectionResult;
}

export function AdversarialChallengeModule({ objections }: AdversarialChallengeModuleProps) {
  return (
    <div id="adversarial-challenge-module" className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30 flex justify-between items-center">
        <div>
          <div className="text-lg font-black text-on-surface uppercase tracking-tight">Adversarial Challenge Board</div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-error mt-1">
            CONSTITUTIONAL MANDATORY OBJECTIONS
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
          objections.answerabilityStatus === 'ANSWERABLE' ? "bg-green-100 text-green-700" :
          objections.answerabilityStatus === 'PARTIALLY_ANSWERABLE' ? "bg-orange-100 text-orange-700" :
          "bg-error-container text-error"
        )}>
          {objections.answerabilityStatus}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {objections.objections.map((obj) => (
          <div 
            key={obj.id} 
            className={cn(
              "rounded-xl border p-4 transition-all hover:shadow-md",
              obj.severity === 'CRITICAL' ? "border-error bg-error-container/5" :
              obj.severity === 'HIGH' ? "border-orange-300 bg-orange-50/30" :
              "border-surface-variant bg-background/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                obj.severity === 'CRITICAL' ? "bg-error text-white" :
                obj.severity === 'HIGH' ? "bg-orange-500 text-white" :
                "bg-outline text-white"
              )}>
                {obj.severity === 'CRITICAL' ? <ShieldAlert size={20} /> : 
                 obj.severity === 'HIGH' ? <AlertCircle size={20} /> : <Info size={20} />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                    {obj.type} OBJECTION • {obj.severity}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mt-1">{obj.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-2 italic">
                  "{obj.objection}"
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-outline uppercase">Why it matters</span>
                    <p className="text-xs text-on-surface-variant">{obj.whyItMatters}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-primary uppercase">Required Resolution</span>
                    <p className="text-xs font-bold text-on-surface">{obj.requiredResolution}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {objections.boardEscalationRequired && (
          <div className="bg-error text-white p-4 rounded-xl flex items-center gap-4 shadow-lg animate-pulse">
            <Flame size={24} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em]">Board Escalation Warning</div>
              <div className="text-sm font-bold">Constitutional blockers detected. Human override or resolution mandatory.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
