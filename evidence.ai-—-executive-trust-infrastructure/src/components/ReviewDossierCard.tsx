/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReviewDossier } from '../types';
import { motion } from 'motion/react';
import { X, FileText, CheckCircle2, AlertTriangle, ShieldCheck, TrendingDown, Target } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  dossier: ReviewDossier;
  onClose: () => void;
}

export function ReviewDossierCard({ dossier, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-on-surface/40 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-surface-variant flex flex-col">
        <div className="p-6 border-b border-surface-variant flex items-center justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">{dossier.title}</h2>
              <div className="text-[10px] font-bold text-outline uppercase tracking-widest mt-0.5">
                Executive Support Document • Generated {new Date(dossier.generatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-variant rounded-full transition-colors"
          >
            <X size={20} className="text-outline" />
          </button>
        </div>

        <div className="p-8 space-y-10">
          {/* Status Header */}
          <div className={cn(
            "p-6 rounded-2xl border-4 flex flex-col md:flex-row md:items-center justify-between gap-6",
            dossier.overallStatus === 'TRUST' ? "bg-green-50 border-green-100" :
            dossier.overallStatus === 'REVIEW' ? "bg-yellow-50 border-yellow-100" :
            "bg-red-50 border-red-100"
          )}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Overall Board-Safe Status</div>
              <div className="flex items-center gap-3">
                {dossier.overallStatus === 'TRUST' ? <ShieldCheck className="text-green-600" size={32} /> : 
                 dossier.overallStatus === 'REVIEW' ? <AlertTriangle className="text-yellow-600" size={32} /> :
                 <AlertTriangle className="text-red-600" size={32} />}
                <span className={cn(
                  "text-5xl font-black tracking-tighter uppercase",
                  dossier.overallStatus === 'TRUST' ? "text-green-700" :
                  dossier.overallStatus === 'REVIEW' ? "text-yellow-700" :
                  "text-red-700"
                )}>{dossier.overallStatus}</span>
              </div>
            </div>
            <div className="max-w-md text-sm font-medium text-on-surface leading-relaxed">
              {dossier.executiveSummary}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Fact Base */}
            <section>
              <h3 className="text-xs font-black text-outline uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Target size={14} /> Fact Base / Evidence
              </h3>
              <div className="space-y-3">
                {dossier.factBase.map((fact, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-background border border-surface-variant/50 rounded-xl">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                    <span className="text-xs font-bold text-on-surface">{fact}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Economic Impact */}
            <section>
              <h3 className="text-xs font-black text-outline uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <TrendingDown size={14} /> Economic Impact Summary
              </h3>
              <div className="p-6 bg-secondary text-white rounded-2xl shadow-lg">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Annual Exposure Risk</div>
                <div className="text-3xl font-black mb-4">{dossier.economicImpactSummary}</div>
                <p className="text-xs text-secondary-container leading-relaxed">
                  Calculated based on current efficiency gaps and market energy price volatility.
                </p>
              </div>
            </section>
          </div>

          {/* Source Integrity */}
          <section className="pt-8 border-t border-surface-variant">
            <h3 className="text-xs font-black text-outline uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
               Fact Source Integrity
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SourceTag label="Historical" value="MEASURED" />
              <SourceTag label="Weather" value="GEOCODED" />
              <SourceTag label="Sensors" value={dossier.sensorSource} />
              <SourceTag label="Forecast" value="DERIVED" />
            </div>
          </section>

          {/* Risks & Optimization */}
          <section className="pt-8 border-t border-surface-variant">
            <h3 className="text-xs font-black text-outline uppercase tracking-[0.3em] mb-6">Risk Drivers & Optimization Findings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossier.optimizationFindings.map((finding, i) => (
                <div key={i} className="p-4 rounded-xl border border-red-100 bg-red-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded tracking-widest">
                      {finding.category} • {finding.severity}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-on-surface mb-2">{finding.issue}</div>
                  <div className="text-[10px] font-medium text-on-surface-variant italic">
                    Action: {finding.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Next Steps */}
          <section className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6">Required Next Evidence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dossier.nextRequiredEvidence.map((step, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                    {i+1}
                  </div>
                  <div className="text-xs font-bold text-on-surface leading-tight">{step}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-surface-variant bg-background flex justify-end gap-3 sticky bottom-0">
          <button className="px-6 py-3 text-xs font-black text-on-surface uppercase tracking-widest hover:bg-surface-variant rounded-xl transition-all">
            Download PDF
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SourceTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-surface-variant bg-background/50">
      <div className="text-[9px] font-black uppercase text-outline mb-1">{label}</div>
      <div className={cn(
        "text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider",
        value === 'MEASURED' || value === 'GEOCODED' ? "bg-green-50 border-green-200 text-green-700" :
        value === 'DERIVED' ? "bg-blue-50 border-blue-200 text-blue-700" :
        "bg-orange-50 border-orange-200 text-orange-700"
      )}>{value}</div>
    </div>
  );
}
