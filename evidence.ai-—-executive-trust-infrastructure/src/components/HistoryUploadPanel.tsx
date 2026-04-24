/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { FileUp, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { HistoricalImportPreview } from '../types';
import { validateCsvBeforeImport } from '../services/historyValidation';
import { commitHistoricalImport } from '../services/historyStore';
import { HistoryValidationTable } from './HistoryValidationTable';

interface HistoryUploadPanelProps {
  onImportCommitted?: () => void;
}

export function HistoryUploadPanel({ onImportCommitted }: HistoryUploadPanelProps) {
  const [previews, setPreviews] = useState<HistoricalImportPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const totalFiles = previews.length;
    const totalValid = previews.reduce((sum, preview) => sum + preview.summary.validRows, 0);
    const totalInvalid = previews.reduce((sum, preview) => sum + preview.summary.invalidRows, 0);
    const importable = previews.filter((preview) => preview.summary.canImport).length;
    const blocked = previews.filter((preview) => !preview.summary.canImport).length;

    return { totalFiles, totalValid, totalInvalid, importable, blocked };
  }, [previews]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setLoading(true);
    setSuccessMessage(null);

    const files = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith('.csv'));
    const nextPreviews: HistoricalImportPreview[] = [];

    for (const file of files) {
      const content = await file.text();
      const preview = await validateCsvBeforeImport(file.name, content);
      nextPreviews.push(preview);
    }

    setPreviews(nextPreviews);
    setLoading(false);
  }

  async function handleCommitImport() {
    await commitHistoricalImport(previews);
    const importedCount = previews.filter((preview) => preview.summary.canImport).length;
    setPreviews([]);
    setSuccessMessage(
      `${importedCount} dataset(s) imported. They are now visible below in the Imported Dataset Registry.`
    );
    onImportCommitted?.();
  }

  function handleRemovePreview(propertyId: string) {
    setPreviews((current) => current.filter((preview) => preview.propertyId !== propertyId));
  }

  const canCommit = previews.some((preview) => preview.summary.canImport);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-variant bg-background/30">
          <div className="text-lg font-bold text-on-surface">Historical CSV Upload</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
            Upload → Validate → Review → Import
          </div>
        </div>

        <div className="p-6">
          <label className="block rounded-2xl border-2 border-dashed border-surface-variant bg-background p-8 text-center cursor-pointer hover:border-primary transition-colors">
            <div className="flex flex-col items-center gap-3">
              <UploadCloud size={28} className="text-primary" />
              <div className="text-sm font-bold text-on-surface">
                Drop CSV files here or click to choose files
              </div>
              <div className="text-xs text-outline max-w-xl">
                Files are validated first. Nothing is silently imported. Review status, duplicates,
                gaps, invalid rows, and audit findings before saving datasets into the app.
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-outline">
                Supports multi-file upload
              </div>
            </div>

            <input
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>

          {loading && (
            <div className="mt-4 rounded-xl border border-surface-variant bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-bold text-on-surface">
                  Validating uploaded CSV files...
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-green-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">
                  Import completed
                </div>
                <div className="text-sm text-green-900">{successMessage}</div>
              </div>
            </div>
          )}

          {!loading && previews.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard label="Files" value={String(summary.totalFiles)} />
              <SummaryCard label="Importable" value={String(summary.importable)} tone="good" />
              <SummaryCard label="Blocked" value={String(summary.blocked)} tone="bad" />
              <SummaryCard label="Valid Rows" value={String(summary.totalValid)} />
              <SummaryCard label="Invalid Rows" value={String(summary.totalInvalid)} tone="bad" />
            </div>
          )}

          {!loading && previews.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                disabled={!canCommit}
                onClick={handleCommitImport}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold disabled:opacity-40"
              >
                Import Validated Datasets
              </button>

              <button
                onClick={() => setPreviews([])}
                className="px-4 py-2 rounded-xl border border-surface-variant font-bold"
              >
                Clear Review
              </button>

              <div className="text-xs text-outline">
                Only files with TRUST or REVIEW status are importable.
              </div>
            </div>
          )}

          {!loading && previews.length === 0 && !successMessage && (
            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-1">
                  No validated dataset in preview
                </div>
                <div className="text-sm text-orange-900">
                  Upload one or more property CSV files to build a historical evidence layer before
                  using forecast outputs as decision support.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <HistoryValidationTable previews={previews} onRemovePreview={handleRemovePreview} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === 'good'
          ? 'border-green-200 bg-green-50'
          : tone === 'bad'
          ? 'border-error/20 bg-error-container/10'
          : 'border-surface-variant bg-background'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {tone === 'good' ? (
          <CheckCircle2 size={14} className="text-green-700" />
        ) : tone === 'bad' ? (
          <AlertTriangle size={14} className="text-error" />
        ) : (
          <FileUp size={14} className="text-outline" />
        )}
        <div className="text-lg font-bold text-on-surface">{value}</div>
      </div>
    </div>
  );
}
