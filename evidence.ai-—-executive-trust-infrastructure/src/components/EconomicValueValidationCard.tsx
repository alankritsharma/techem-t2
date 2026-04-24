/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, Euro, Leaf, BarChart3, Info } from 'lucide-react';
import { EconomicValueAssessment } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface EconomicValueValidationCardProps {
  assessment: EconomicValueAssessment;
  projectCount?: number;
}

export function EconomicValueValidationCard({
  assessment,
  projectCount = 0,
}: EconomicValueValidationCardProps) {
  const isHighPriority = assessment.decisionPriority === 'HIGH';
  const isAlert = assessment.businessConfidence === 'HIGH RISK';
  const hasNoProjectForHighPriority = isHighPriority && projectCount === 0;

  return (
    <div className="bg-white rounded-2xl border border-surface-variant shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-surface-variant bg-background/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Euro size={16} className="text-primary" />
          <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">
            Economic Value Validation
          </h3>
        </div>
        <div
          className={cn(
            'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border',
            isHighPriority
              ? 'bg-error-container text-error border-error/20'
              : 'bg-secondary/10 text-secondary border-secondary/20'
          )}
        >
          Priority: {assessment.decisionPriority}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
              <Euro size={10} /> Annual Cost Exposure
            </span>
            <div className="text-2xl font-black text-on-surface leading-none">
              €{(assessment.annualCostExposureEur / 1000).toFixed(1)}k
            </div>
            <div className="text-[10px] font-bold text-outline">
              {Math.round(assessment.annualUsageKwh ?? 0).toLocaleString()} kWh ×{' '}
              {(assessment.energyPricePerKwh ?? 0).toFixed(2)} €/kWh
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
              <Leaf size={10} /> CO2 Exposure
            </span>
            <div className="text-2xl font-black text-on-surface leading-none">
              {(assessment.annualCo2ExposureKg / 1000).toFixed(1)}t
            </div>
            <div className="text-[10px] font-bold text-outline">
              Annual carbon footprint
            </div>
          </div>
        </div>

        <div className="p-4 bg-background rounded-2xl border border-surface-variant relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 size={40} />
          </div>

          <div className="flex flex-col gap-4 relative z-10">
            <div>
              <span className="text-[10px] font-black text-outline uppercase tracking-widest block mb-1">
                Efficiency Gap
              </span>
              <div className="flex items-end gap-2">
                <span
                  className={cn(
                    'text-3xl font-black leading-none',
                    assessment.efficiencyGapPercent > 0 ? 'text-error' : 'text-green-600'
                  )}
                >
                  {assessment.efficiencyGapPercent > 0 ? '+' : ''}
                  {assessment.efficiencyGapPercent.toFixed(1)}%
                </span>
                <span className="text-[10px] font-black text-outline uppercase tracking-wider mb-1">
                  vs. {assessment.benchmarkSource ?? 'Portfolio Baseline'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-surface-variant pt-3">
              <div>
                <div className="text-[9px] font-bold text-outline uppercase">Current Spec.</div>
                <div className="text-xs font-black text-on-surface">
                  {assessment.baselineComparison.currentValue?.toFixed(1)} kWh/m²
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-outline uppercase">Benchmark</div>
                <div className="text-xs font-black text-on-surface">
                  {assessment.baselineComparison.referenceValue?.toFixed(1)} kWh/m²
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-outline uppercase">Area Basis</div>
                <div className="text-xs font-black text-on-surface">
                  {assessment.effectiveAreaM2?.toFixed(1) ?? 'n/a'} m²
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasNoProjectForHighPriority && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-orange-700 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">
                  High priority without project container
                </div>
                <div className="text-sm font-bold text-orange-950 leading-snug">
                  This object has HIGH priority, but no project exists yet. Create a draft
                  efficiency project before treating the recommendation as operationalized.
                </div>
              </div>
            </div>
          </div>
        )}

        {assessment.calculationWarnings && assessment.calculationWarnings.length > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-yellow-700 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2">
                  Calculation Warnings
                </div>
                <div className="space-y-1">
                  {assessment.calculationWarnings.map((warning, index) => (
                    <div key={`${warning}-${index}`} className="text-sm font-bold text-yellow-950">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className={cn(isAlert ? 'text-error' : 'text-secondary')} />
            <span className="text-[10px] font-black text-outline uppercase tracking-widest">
              Business Confidence
            </span>
            <div className="flex-1 border-b border-surface-variant border-dotted" />
            <span
              className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded border',
                assessment.businessConfidence === 'TRUST'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : assessment.businessConfidence === 'REVIEW'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-error-container text-error border-error-variant'
              )}
            >
              {assessment.businessConfidence}
            </span>
          </div>

          <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10">
            <div className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
              <CheckCircle2 size={10} /> Recommended Management Action
            </div>
            <div className="text-xs font-bold text-on-surface leading-snug">
              {assessment.recommendedAction}
            </div>
          </div>

          <p className="text-xs text-outline font-medium leading-relaxed">
            {assessment.explanationSummary}
          </p>
        </div>
      </div>
    </div>
  );
}
