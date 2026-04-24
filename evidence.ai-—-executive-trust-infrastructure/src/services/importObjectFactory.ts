/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HistoricalDataset, HistoricalRecord, BuildingObject } from '../types';
import {
  createObject,
  applyImportedDatasetMetadataToObject,
  applyObjectHistoryMetadata,
} from './objectStore';
import { createOrUpdateMapping } from './mappingStore';
import { assignDatasetAndRecordsToObject, updateDatasetLifecycleStatus } from './historyStore';
import { assessHistoricalTrust } from './historicalTrustService';

export interface AutoObjectResult {
  object: BuildingObject;
  dataset: HistoricalDataset;
}

function prettifyPropertyId(propertyId: string) {
  return propertyId.replace(/^property_/i, 'Property ');
}

export async function createObjectFromImportedDataset(
  dataset: HistoricalDataset,
  records: HistoricalRecord[]
): Promise<AutoObjectResult> {
  const objectName = `Imported ${prettifyPropertyId(dataset.propertyId)} – ${dataset.city}`;

  const newObject = createObject({
    name: objectName,
    addressOriginal: `${dataset.city}, ${dataset.zipcode} (derived from imported dataset)`,
    type: 'Imported Sample Property',
    description:
      `Auto-generated from ${dataset.name}. ` +
      `This object represents imported sample history, not a fully validated postal building record.`,
    source: 'import',
    isLocalDraft: false,
    locationLabel: dataset.city,
    validationStatus: 'REVIEW',
    trustStatus: 'REVIEW',
    historicalDatasetIds: [dataset.id],
    historyStatus: 'REVIEW',
    historyCoverage: {
      start: dataset.dateRange.start,
      end: dataset.dateRange.end,
      recordCount: dataset.recordCount,
    },
    importMetadata: {
      propertyId: dataset.propertyId,
      datasetId: dataset.id,
      derivedFromCsv: true,
      sourceFile: dataset.name,
    },
  });

  createOrUpdateMapping({
    datasetId: dataset.id,
    propertyId: dataset.propertyId,
    objectId: newObject.id,
    mappingStatus: 'CONFIRMED',
    mappingReason: 'Auto-generated imported object from sample CSV dataset.',
  });

  await assignDatasetAndRecordsToObject(dataset.id, newObject.id, 'CONVERTED');

  const trust = assessHistoricalTrust({
    objectId: newObject.id,
    datasets: [{ ...dataset, objectId: newObject.id, lifecycleStatus: 'CONVERTED' }],
    records: records.map((record) => ({ ...record, objectId: newObject.id })),
  });

  applyImportedDatasetMetadataToObject({
    objectId: newObject.id,
    propertyId: dataset.propertyId,
    datasetId: dataset.id,
    sourceFile: dataset.name,
  });

  applyObjectHistoryMetadata({
    objectId: newObject.id,
    historicalDatasetIds: [dataset.id],
    historyStatus: trust.trustStatus,
    historyCoverage: trust.coverage,
  });

  await updateDatasetLifecycleStatus(dataset.id, 'CONVERTED');

  return {
    object: newObject,
    dataset: {
      ...dataset,
      objectId: newObject.id,
      lifecycleStatus: 'CONVERTED',
    },
  };
}

export async function batchCreateObjectsFromUnlinkedDatasets(
  datasets: HistoricalDataset[],
  allRecords: HistoricalRecord[]
): Promise<AutoObjectResult[]> {
  const unlinked = datasets.filter((dataset) => !dataset.objectId);
  const results: AutoObjectResult[] = [];

  for (const dataset of unlinked) {
    const datasetRecords = allRecords.filter(
      (record) => record.sourceFile === dataset.name || record.propertyId === dataset.propertyId
    );
    const result = await createObjectFromImportedDataset(dataset, datasetRecords);
    results.push(result);
  }

  return results;
}
