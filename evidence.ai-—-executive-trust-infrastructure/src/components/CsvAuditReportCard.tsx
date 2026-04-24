/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CsvAuditReport } from '../types';
import { AlertCircle, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CsvAuditReportCardProps {
  report: CsvAuditReport;
}

export function CsvAuditReportCard({ report }: CsvAuditReportCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-surface-variant shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-6 border-b border-surface-variant bg-background/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">CSV Audit Report</h3>
            <p className="text-[10px] font-bold text-outline uppercase tracking-[0.2em]">{report.fileName}</p>
          </div>
        </div>
        <StatusBadge status={report.overallStatus} />
      </div>

      <div className="p-6 space-y-8">
        <div className="bg-background rounded-2xl p-5 border border-surface-variant/50">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-primary" />
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Executive Summary</span>
          </div>
          <p className="text-sm font-bold text-on-surface leading-relaxed">
            {report.summary}
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-2">
            <div className="h-px flex-1 bg-surface-variant" />
            <span>Detailed Audit Findings ({report.findings.length})</span>
            <div className="h-px flex-1 bg-surface-variant" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {report.findings.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <ShieldCheck size={48} className="text-green-500 mb-4 opacity-20" />
                <p className="text-sm font-bold text-outline">No structural or business rule violations detected.</p>
              </div>
            ) : (
              report.findings.map(finding => (
                <div key={finding.id} className="relative group">
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-full",
                    finding.priority === 'KRITISCH' ? 'bg-error' :
                    finding.priority === 'HOCH' ? 'bg-orange-500' :
                    finding.priority === 'MITTEL' ? 'bg-yellow-500' : 'bg-outline'
                  )} />
                  <div className="pl-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                            finding.priority === 'KRITISCH' ? 'bg-error/10 text-error' :
                            finding.priority === 'HOCH' ? 'bg-orange-50 text-orange-700' :
                            finding.priority === 'MITTEL' ? 'bg-yellow-50 text-yellow-700' : 'bg-background text-outline'
                          )}>
                            {finding.priority}
                          </span>
                          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                            {finding.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-on-surface tracking-tight">{finding.title}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <AuditField label="Root Cause" value={finding.rootCause} />
                        <AuditField label="Technical Analysis" value={finding.technicalCause} />
                      </div>
                      <div className="space-y-3">
                        <AuditField label="Business Impact" value={finding.businessCause} />
                        <AuditField label="Recommended Fix" value={finding.recommendedFix} status="action" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                       {finding.affectedRows.length > 0 && (
                         <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-outline uppercase tracking-widest">Affected Rows:</span>
                           <div className="flex gap-1">
                             {finding.affectedRows.map(row => (
                               <span key={row} className="px-1.5 py-0.5 bg-background border border-surface-variant rounded text-[10px] font-bold text-on-surface">l.{row}</span>
                             ))}
                             {finding.rootCause.includes('...') && <span className="text-[10px] font-bold text-outline">...</span>}
                           </div>
                         </div>
                       )}
                       {finding.affectedColumns.length > 0 && (
                         <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-outline uppercase tracking-widest">Affected Columns:</span>
                           <div className="flex gap-2">
                             {finding.affectedColumns.map(col => (
                               <span key={col} className="text-[10px] font-bold text-primary underline underline-offset-4 decoration-primary/30">{col}</span>
                             ))}
                           </div>
                         </div>
                       )}
                    </div>

                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                      <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Preventive Measure</div>
                      <div className="text-xs font-bold text-primary/80">{finding.preventiveMeasure}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditField({ label, value, status }: { label: string; value: string; status?: 'action' }) {
  return (
    <div>
      <div className="text-[9px] font-black text-outline uppercase tracking-widest mb-1">{label}</div>
      <div className={cn(
        "text-sm font-medium leading-relaxed",
        status === 'action' ? "text-on-surface font-bold" : "text-on-surface/80"
      )}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <div className={cn(
      "px-4 py-2 rounded-xl border flex items-center gap-2",
      status === 'TRUST' ? 'bg-green-50 border-green-200 text-green-700' :
      status === 'REVIEW' ? 'bg-orange-50 border-orange-200 text-orange-700' :
      'bg-error-container border-error text-error'
    )}>
       {status === 'TRUST' ? <ShieldCheck size={18} /> : 
        status === 'REVIEW' ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
       <span className="text-sm font-black uppercase tracking-widest">{status}</span>
    </div>
  );
}
