/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldQuestion, FileText } from 'lucide-react';
import { CsvValidationSummary, HistoricalImportPreview } from '../types';
import { cn } from '../lib/utils';
import { CsvAuditReportCard } from './CsvAuditReportCard';

interface HistoryValidationTableProps {
  previews: HistoricalImportPreview[];
  onRemovePreview?: (propertyId: string) => void;
}

export function HistoryValidationTable({
  previews,
  onRemovePreview,
}: HistoryValidationTableProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  if (!previews.length) return null;

  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Import Validation Summary</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Validate first. Audit second. Import third.
        </div>
      </div>

      <div className="divide-y divide-surface-variant">
        {previews.map((preview) => (
          <div key={preview.propertyId} className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div className="text-sm font-bold text-on-surface">{preview.fileName}</div>
                  <StatusBadge status={preview.summary.validationStatus} />
                  {preview.summary.canImport ? (
                    <ImportBadge label="Import allowed" tone="good" />
                  ) : (
                    <ImportBadge label="Import blocked" tone="bad" />
                  )}
                  
                  {preview.auditReport && (
                    <button 
                      onClick={() => setActiveReportId(activeReportId === preview.propertyId ? null : preview.propertyId)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                        activeReportId === preview.propertyId 
                          ? "bg-primary text-white border-primary" 
                          : "bg-background border-surface-variant text-primary hover:border-primary"
                      )}
                    >
                      <FileText size={12} />
                      {activeReportId === preview.propertyId ? 'Close Audit' : 'Open Audit Report'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Property ID" value={preview.propertyId} />
                  <Stat label="Rows" value={String(preview.summary.totalRows)} />
                  <Stat label="Valid" value={String(preview.summary.validRows)} />
                  <Stat label="Invalid" value={String(preview.summary.invalidRows)} />
                </div>

                {activeReportId === preview.propertyId && preview.auditReport && (
                  <div className="mt-8">
                     <CsvAuditReportCard report={preview.auditReport} />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
                  <Stat label="Duplicates" value={String(preview.summary.duplicateCount)} />
                  <Stat label="Missing Temp" value={String(preview.summary.missingTemperatureCount)} />
                  <Stat label="Invalid Area" value={String(preview.summary.invalidLivingSpaceCount)} />
                  <Stat label="Time Gaps" value={String(preview.summary.timeGapCount)} />
                </div>

                {preview.summary.missingColumns.length > 0 && (
                  <div className="mt-4 rounded-xl border border-error/20 bg-error-container/10 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-error mb-1">
                      Missing Columns
                    </div>
                    <div className="text-sm text-on-surface">
                      {preview.summary.missingColumns.join(', ')}
                    </div>
                  </div>
                )}

                {preview.summary.issues.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                      Top Issues
                    </div>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {preview.summary.issues.slice(0, 8).map((issue, index) => (
                        <div
                          key={`${issue.code}-${index}`}
                          className={cn(
                            'rounded-lg border p-3 text-sm',
                            issue.severity === 'critical'
                              ? 'border-error/20 bg-error-container/10'
                              : issue.severity === 'warning'
                              ? 'border-orange-200 bg-orange-50'
                              : 'border-surface-variant bg-background'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <IssueIcon severity={issue.severity} />
                            <span className="font-bold text-on-surface">{issue.code}</span>
                            {typeof issue.rowIndex === 'number' && (
                              <span className="text-xs text-outline">Row {issue.rowIndex}</span>
                            )}
                          </div>
                          <div className="text-on-surface">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {onRemovePreview && (
                <button
                  onClick={() => onRemovePreview(preview.propertyId)}
                  className="px-4 py-2 rounded-xl border border-surface-variant hover:border-primary"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CsvValidationSummary['validationStatus'] }) {
  const icon =
    status === 'TRUST' ? (
      <ShieldCheck size={12} />
    ) : status === 'REVIEW' ? (
      <ShieldQuestion size={12} />
    ) : (
      <ShieldAlert size={12} />
    );

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest',
        status === 'TRUST'
          ? 'bg-green-50 border-green-200 text-green-700'
          : status === 'REVIEW'
          ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
          : 'bg-error-container border-error text-error'
      )}
    >
      {icon}
      {status}
    </span>
  );
}

function ImportBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'bad';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest',
        tone === 'good'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-error-container border-error text-error'
      )}
    >
      {tone === 'good' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

function IssueIcon({ severity }: { severity: 'info' | 'warning' | 'critical' }) {
  if (severity === 'critical') return <ShieldAlert size={12} className="text-error" />;
  if (severity === 'warning') return <AlertTriangle size={12} className="text-orange-600" />;
  return <CheckCircle2 size={12} className="text-outline" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-on-surface">{value}</div>
    </div>
  );
}
