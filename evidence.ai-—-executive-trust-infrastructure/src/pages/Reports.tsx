/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { BuildingObject, HistoricalDataset, HistoricalRecord } from '../types';
import { HistoryUploadPanel } from '../components/HistoryUploadPanel';
import { DatasetMappingManager } from '../components/DatasetMappingManager';
import { ImportedDatasetRegistry } from '../components/ImportedDatasetRegistry';
import { listHistoricalDatasets, listHistoricalRecords } from '../services/historyStore';
import { batchCreateObjectsFromUnlinkedDatasets } from '../services/importObjectFactory';

interface ReportsProps {
  objects?: BuildingObject[];
  onDataChanged?: () => void;
}

export function Reports({ objects = [], onDataChanged }: ReportsProps) {
  const [datasets, setDatasets] = useState<HistoricalDataset[]>([]);
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  async function load() {
    const loadedDatasets = await listHistoricalDatasets();
    const loadedRecords = await listHistoricalRecords();
    setDatasets(loadedDatasets);
    setRecords(loadedRecords);
  }

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    await load();
    onDataChanged?.();
  }

  async function handleBatchCreate() {
    if (!confirm('This will generate imported building objects for all unlinked datasets. Continue?')) return;

    setIsBatchProcessing(true);
    try {
      await batchCreateObjectsFromUnlinkedDatasets(datasets, records);
      await refresh();
    } catch (error) {
      console.error(error);
      alert('Batch creation failed.');
    } finally {
      setIsBatchProcessing(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: datasets.length,
      unlinked: datasets.filter((dataset) => !dataset.objectId).length,
      converted: datasets.filter((dataset) => dataset.lifecycleStatus === 'CONVERTED').length,
    };
  }, [datasets]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Data & Imports</h2>
          <p className="text-sm text-outline mt-1 italic">
            Evidence-led portfolio growth through historical data ingestion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-lg border border-surface-variant bg-white text-[10px] font-bold uppercase tracking-widest text-outline">
            {stats.total} datasets
          </span>
          <span className="px-3 py-1 rounded-lg border border-orange-200 bg-orange-50 text-[10px] font-bold uppercase tracking-widest text-orange-700">
            {stats.unlinked} unlinked
          </span>
          <span className="px-3 py-1 rounded-lg border border-green-200 bg-green-50 text-[10px] font-bold uppercase tracking-widest text-green-700">
            {stats.converted} converted
          </span>

          <button
            disabled={isBatchProcessing || stats.unlinked === 0}
            onClick={handleBatchCreate}
            className="px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50"
          >
            Create All Imported Objects
          </button>
        </div>
      </div>

      <HistoryUploadPanel onImportCommitted={refresh} />

      <ImportedDatasetRegistry
        datasets={datasets}
        records={records}
        onDataChanged={refresh}
      />

      <DatasetMappingManager
        objects={objects}
        datasets={datasets}
        allRecords={records}
        onMappingsChanged={refresh}
      />
    </div>
  );
}
