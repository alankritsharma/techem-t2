/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Link2, ShieldCheck, ShieldQuestion, AlertTriangle } from 'lucide-react';
import { BuildingObject, HistoricalDataset } from '../types';
import { createOrUpdateMapping, getMappingByDatasetId } from '../services/mappingStore';
import { linkDatasetToObject } from '../services/historyStore';
import { applyObjectHistoryMetadata, getObjectById } from '../services/objectStore';
import { assessHistoricalTrust } from '../services/historicalTrustService';
import { cn } from '../lib/utils';

interface DatasetMappingManagerProps {
  objects: BuildingObject[];
  datasets: HistoricalDataset[];
  allRecords: any[];
  onMappingsChanged?: () => void;
}

export function DatasetMappingManager({
  objects,
  datasets,
  allRecords,
  onMappingsChanged,
}: DatasetMappingManagerProps) {
  const [selectedObjectByDataset, setSelectedObjectByDataset] = useState<Record<string, string>>({});
  const [reasonByDataset, setReasonByDataset] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    return datasets.map((dataset) => {
      const mapping = getMappingByDatasetId(dataset.id);
      return {
        dataset,
        mapping,
        selectedObjectId: selectedObjectByDataset[dataset.id] ?? mapping?.objectId ?? '',
        reason: reasonByDataset[dataset.id] ?? mapping?.mappingReason ?? '',
      };
    });
  }, [datasets, selectedObjectByDataset, reasonByDataset]);

  async function handleApplyMapping(datasetId: string) {
    const dataset = datasets.find((item) => item.id === datasetId);
    const objectId = selectedObjectByDataset[datasetId];

    if (!dataset || !objectId) return;

    const mappingReason = reasonByDataset[datasetId] ?? '';

    createOrUpdateMapping({
      datasetId: dataset.id,
      propertyId: dataset.propertyId,
      objectId,
      mappingStatus: 'CONFIRMED',
      mappingReason,
    });

    // Integrated with async history store
    await linkDatasetToObject(dataset.id, objectId);

    const objectDatasets = datasets
      .filter((item) => {
        const mapping = getMappingByDatasetId(item.id);
        return mapping?.objectId === objectId || item.id === dataset.id;
      })
      .map((item) => item.id);

    const objectRecords = allRecords.filter((record) => record.objectId === objectId || record.propertyId === dataset.propertyId);
    const objectHistoricalDatasets = datasets.filter((item) => {
      const mapping = getMappingByDatasetId(item.id);
      return mapping?.objectId === objectId || item.id === dataset.id;
    });

    const trust = assessHistoricalTrust({
      objectId,
      datasets: objectHistoricalDatasets,
      records: objectRecords.map((record) =>
        record.objectId === objectId ? record : { ...record, objectId }
      ),
    });

    applyObjectHistoryMetadata({
      objectId,
      historicalDatasetIds: objectDatasets,
      historyStatus: trust.trustStatus,
      historyCoverage: trust.coverage,
    });

    onMappingsChanged?.();
  }

  if (!datasets.length) {
    return (
      <div className="bg-white rounded-xl border border-surface-variant p-6">
        <div className="text-lg font-bold text-on-surface mb-2">Dataset Mapping Manager</div>
        <div className="text-sm text-outline">
          No imported datasets available yet. Import and validate historical CSV files first.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Link2 size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-on-surface">Dataset Mapping Manager</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
              Explicit dataset-to-object assignment
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-surface-variant">
        {rows.map(({ dataset, mapping, selectedObjectId, reason }) => (
          <div key={dataset.id} className="p-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              <div className="xl:col-span-4">
                <div className="text-sm font-bold text-on-surface">{dataset.name}</div>
                <div className="text-xs text-outline mt-1">
                  {dataset.propertyId} • {dataset.city} • {dataset.energySource}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={dataset.validationStatus} />
                  {mapping ? (
                    <MappingBadge label={mapping.mappingStatus} />
                  ) : (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-orange-50 border-orange-200 text-orange-700 uppercase tracking-widest">
                      Unmapped
                    </span>
                  )}
                </div>
              </div>

              <div className="xl:col-span-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  Assign Object
                </div>
                <select
                  value={selectedObjectId}
                  onChange={(e) =>
                    setSelectedObjectByDataset((current) => ({
                      ...current,
                      [dataset.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-surface-variant px-3 py-2 bg-white outline-none"
                >
                  <option value="">Select object</option>
                  {objects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  Mapping Reason
                </div>
                <input
                  value={reason}
                  onChange={(e) =>
                    setReasonByDataset((current) => ({
                      ...current,
                      [dataset.id]: e.target.value,
                    }))
                  }
                  placeholder="Why does this dataset belong to this object?"
                  className="w-full rounded-xl border border-surface-variant px-3 py-2 outline-none"
                />
              </div>

              <div className="xl:col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                  Action
                </div>
                <button
                  disabled={!selectedObjectId}
                  onClick={() => handleApplyMapping(dataset.id)}
                  className="w-full px-4 py-2 rounded-xl bg-primary text-white font-bold disabled:opacity-40"
                >
                  Confirm Mapping
                </button>
              </div>
            </div>

            {mapping?.objectId && (
              <div className="mt-4 rounded-xl border border-surface-variant bg-background p-3 text-sm">
                <div className="font-bold text-on-surface mb-1">Current Mapping</div>
                <div className="text-outline">
                  {dataset.propertyId} is linked to{' '}
                  <span className="font-bold text-on-surface">
                    {getObjectById(mapping.objectId)?.name ?? mapping.objectId}
                  </span>
                  {mapping.mappingReason ? ` — ${mapping.mappingReason}` : ''}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: HistoricalDataset['validationStatus'] }) {
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
      {status === 'TRUST' ? (
        <ShieldCheck size={12} />
      ) : status === 'REVIEW' ? (
        <ShieldQuestion size={12} />
      ) : (
        <AlertTriangle size={12} />
      )}
      {status}
    </span>
  );
}

function MappingBadge({ label }: { label: 'CONFIRMED' | 'REVIEW' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest',
        label === 'CONFIRMED'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-orange-50 border-orange-200 text-orange-700'
      )}
    >
      {label === 'CONFIRMED' ? <ShieldCheck size={12} /> : <ShieldQuestion size={12} />}
      {label}
    </span>
  );
}
