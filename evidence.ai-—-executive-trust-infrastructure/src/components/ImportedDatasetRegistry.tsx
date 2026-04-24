/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import {
  Database,
  FileText,
  CheckCircle2,
  PlusCircle,
  Trash2,
  ArrowUpRight,
  Layers3,
} from 'lucide-react';
import { HistoricalDataset, HistoricalRecord } from '../types';
import { cn } from '../lib/utils';
import { deleteHistoricalDataset } from '../services/historyStore';
import { createObjectFromImportedDataset } from '../services/importObjectFactory';
import { getObjectById } from '../services/objectStore';
import { CsvAuditReportCard } from './CsvAuditReportCard';
import { DatasetDetailDrawer } from './DatasetDetailDrawer';

interface ImportedDatasetRegistryProps {
  datasets: HistoricalDataset[];
  records: HistoricalRecord[];
  onDataChanged: () => void;
}

export function ImportedDatasetRegistry({
  datasets,
  records,
  onDataChanged,
}: ImportedDatasetRegistryProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null;
  const selectedRecords = selectedDataset
    ? records.filter(
        (record) =>
          record.sourceFile === selectedDataset.name ||
          record.propertyId === selectedDataset.propertyId
      )
    : [];
  const selectedObject =
    selectedDataset?.objectId ? getObjectById(selectedDataset.objectId) ?? null : null;

  const counters = useMemo(() => {
    return {
      imported: datasets.filter((dataset) => dataset.lifecycleStatus === 'IMPORTED').length,
      linked: datasets.filter((dataset) => dataset.lifecycleStatus === 'LINKED').length,
      converted: datasets.filter((dataset) => dataset.lifecycleStatus === 'CONVERTED').length,
      review: datasets.filter((dataset) => dataset.validationStatus === 'REVIEW').length,
    };
  }, [datasets]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this dataset? This will remove all associated historical records.')) return;
    await deleteHistoricalDataset(id);
    onDataChanged();
  }

  async function handleAutoCreate(dataset: HistoricalDataset) {
    setIsProcessing(true);
    try {
      const datasetRecords = records.filter(
        (record) =>
          record.sourceFile === dataset.name || record.propertyId === dataset.propertyId
      );
      await createObjectFromImportedDataset(dataset, datasetRecords);
      onDataChanged();
    } catch (error) {
      console.error(error);
      alert('Failed to generate object from imported dataset.');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!datasets.length) {
    return (
      <div className="bg-white rounded-xl border border-surface-variant p-12 text-center">
        <Database size={48} className="mx-auto text-outline/20 mb-4" />
        <div className="text-lg font-bold text-on-surface">No imported evidence found</div>
        <p className="text-sm text-outline mt-2">
          Upload your property CSV files to start building your portfolio.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-variant bg-background/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/10 p-2 rounded-xl text-secondary">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Imported Dataset Registry</h3>
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">
                  Persistent evidence store
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RegistryChip label={`${datasets.length} total`} tone="neutral" />
              <RegistryChip label={`${counters.imported} imported`} tone="neutral" />
              <RegistryChip label={`${counters.linked} linked`} tone="good" />
              <RegistryChip label={`${counters.converted} converted`} tone="good" />
              <RegistryChip label={`${counters.review} review`} tone="review" />
            </div>
          </div>
        </div>

        <div className="divide-y divide-surface-variant">
          {datasets.map((dataset) => {
            const linkedObject = dataset.objectId ? getObjectById(dataset.objectId) : null;
            const auditOpen = activeReportId === dataset.id;

            return (
              <div key={dataset.id} className="p-5 hover:bg-background/20 transition-all group">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                  <div
                    className="space-y-4 flex-1 cursor-pointer"
                    onClick={() => setSelectedDatasetId(dataset.id)}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-black text-on-surface tracking-tight group-hover:text-primary transition-colors">
                        {dataset.name}
                      </span>
                      <StatusBadge status={dataset.validationStatus} />
                      <LifecycleBadge status={dataset.lifecycleStatus ?? 'IMPORTED'} />
                      <span className="text-[9px] font-bold text-outline uppercase bg-background px-2 py-0.5 rounded border border-surface-variant">
                        {dataset.energySource}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DatasetStat label="Property ID" value={dataset.propertyId} />
                      <DatasetStat label="Location" value={`${dataset.city} (${dataset.zipcode})`} />
                      <DatasetStat label="Records" value={String(dataset.recordCount)} />
                      <DatasetStat
                        label="Date Range"
                        value={`${dataset.dateRange.start} → ${dataset.dateRange.end}`}
                      />
                    </div>

                    {linkedObject && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50/50 border border-green-100 rounded-xl">
                        <CheckCircle2 size={14} className="text-green-600" />
                        <span className="text-[10px] font-black text-green-800 uppercase tracking-widest">
                          Linked Object:
                        </span>
                        <span className="text-xs font-bold text-on-surface">
                          {linkedObject.name}
                        </span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 underline cursor-pointer">
                          Open Details <ArrowUpRight size={12} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!dataset.objectId && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleAutoCreate(dataset)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <PlusCircle size={16} />
                        Generate Building
                      </button>
                    )}

                    <button
                      onClick={() => setActiveReportId(auditOpen ? null : dataset.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                        auditOpen
                          ? 'bg-on-surface text-white border-on-surface'
                          : 'bg-white text-on-surface border-surface-variant hover:border-on-surface'
                      )}
                    >
                      <FileText size={16} />
                      {auditOpen ? 'Close Audit' : 'Audit'}
                    </button>

                    <button
                      onClick={() => setSelectedDatasetId(dataset.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-background text-on-surface border border-surface-variant hover:border-on-surface transition-all"
                    >
                      <Layers3 size={16} />
                      Details
                    </button>

                    <button
                      onClick={() => handleDelete(dataset.id)}
                      className="p-2 text-outline hover:text-error transition-colors"
                      title="Delete Dataset"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {auditOpen && (
                  <div className="mt-8 animate-in fade-in slide-in-from-top-4">
                    {dataset.auditReport ? (
                      <CsvAuditReportCard report={dataset.auditReport} />
                    ) : (
                      <div className="p-8 border-2 border-dashed border-surface-variant rounded-2xl text-center bg-background/50">
                        <FileText size={40} className="mx-auto text-outline/20 mb-3" />
                        <p className="text-sm font-bold text-outline tracking-tight">
                          No persisted audit snapshot available for this dataset.
                        </p>
                        <p className="text-[10px] uppercase font-bold text-outline/60 mt-1">
                          Re-import to attach an audit snapshot to this dataset.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDataset && (
        <DatasetDetailDrawer
          dataset={selectedDataset}
          records={selectedRecords}
          linkedObject={selectedObject}
          onClose={() => setSelectedDatasetId(null)}
        />
      )}
    </>
  );
}

function DatasetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-on-surface break-words">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: HistoricalDataset['validationStatus'] }) {
  return (
    <span
      className={cn(
        'text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest',
        status === 'TRUST'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : status === 'REVIEW'
          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          : 'bg-error-container text-error border border-error/30'
      )}
    >
      {status}
    </span>
  );
}

function LifecycleBadge({ status }: { status: HistoricalDataset['lifecycleStatus'] }) {
  const tone =
    status === 'CONVERTED'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : status === 'LINKED'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'IMPORTED'
      ? 'bg-slate-50 text-slate-700 border-slate-200'
      : 'bg-orange-50 text-orange-700 border-orange-200';

  return (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border', tone)}>
      {status}
    </span>
  );
}

function RegistryChip({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'good' | 'review';
}) {
  return (
    <span
      className={cn(
        'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border',
        tone === 'good'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : tone === 'review'
          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          : 'bg-white text-outline border-surface-variant'
      )}
    >
      {label}
    </span>
  );
}
