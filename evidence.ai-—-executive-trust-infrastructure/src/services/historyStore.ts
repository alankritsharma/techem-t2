/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';
import {
  HistoricalDataset,
  HistoricalRecord,
  HistoricalImportPreview,
  SensorSnapshot,
} from '../types';

const DB_NAME = 'trusted_building_history_db';
const DB_VERSION = 2;
const STORES = {
  DATASETS: 'datasets',
  RECORDS: 'records',
  SENSORS: 'sensor_snapshots',
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORES.DATASETS)) {
          db.createObjectStore(STORES.DATASETS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.RECORDS)) {
          const recordStore = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
          recordStore.createIndex('propertyId', 'propertyId', { unique: false });
          recordStore.createIndex('objectId', 'objectId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.SENSORS)) {
          db.createObjectStore(STORES.SENSORS, { keyPath: 'objectId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function initializeHistoryStore() {
  await getDB();
}

export async function listHistoricalDatasets(): Promise<HistoricalDataset[]> {
  const db = await getDB();
  return db.getAll(STORES.DATASETS);
}

export async function saveHistoricalDatasets(datasets: HistoricalDataset[]) {
  const db = await getDB();
  const tx = db.transaction(STORES.DATASETS, 'readwrite');
  await tx.store.clear();
  for (const dataset of datasets) {
    await tx.store.put(dataset);
  }
  await tx.done;
}

export async function listHistoricalRecords(): Promise<HistoricalRecord[]> {
  const db = await getDB();
  return db.getAll(STORES.RECORDS);
}

export async function saveHistoricalRecords(records: HistoricalRecord[]) {
  const db = await getDB();
  const tx = db.transaction(STORES.RECORDS, 'readwrite');
  await tx.store.clear();
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getHistoricalDatasetById(id: string) {
  const db = await getDB();
  return db.get(STORES.DATASETS, id);
}

export async function listRecordsForObject(objectId: string): Promise<HistoricalRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORES.RECORDS, 'objectId', objectId);
}

export async function listRecordsForProperty(propertyId: string): Promise<HistoricalRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORES.RECORDS, 'propertyId', propertyId);
}

export async function listUnlinkedDatasets(): Promise<HistoricalDataset[]> {
  const datasets = await listHistoricalDatasets();
  return datasets.filter((dataset) => !dataset.objectId);
}

export async function commitHistoricalImport(previews: HistoricalImportPreview[]) {
  const importable = previews.filter((preview) => preview.summary.canImport && preview.dataset);
  if (!importable.length) return;

  const db = await getDB();
  const tx = db.transaction([STORES.DATASETS, STORES.RECORDS], 'readwrite');

  for (const preview of importable) {
    if (!preview.dataset) continue;

    const datasetToSave: HistoricalDataset = {
      ...preview.dataset,
      auditReport: preview.auditReport ?? preview.dataset.auditReport,
      lifecycleStatus: 'IMPORTED',
    };

    await tx.objectStore(STORES.DATASETS).put(datasetToSave);

    for (const record of preview.records) {
      await tx.objectStore(STORES.RECORDS).put(record);
    }
  }

  await tx.done;
}

export async function linkDatasetToObject(datasetId: string, objectId: string, lifecycleStatus: HistoricalDataset['lifecycleStatus'] = 'LINKED') {
  const db = await getDB();
  const dataset = await db.get(STORES.DATASETS, datasetId);
  if (!dataset) return;

  const updatedDataset: HistoricalDataset = {
    ...dataset,
    objectId,
    lifecycleStatus,
  };

  const tx = db.transaction([STORES.DATASETS, STORES.RECORDS], 'readwrite');
  await tx.objectStore(STORES.DATASETS).put(updatedDataset);

  const records = await tx.objectStore(STORES.RECORDS).index('propertyId').getAll(dataset.propertyId);
  for (const record of records) {
    await tx.objectStore(STORES.RECORDS).put({ ...record, objectId });
  }

  await tx.done;
}

export async function assignDatasetAndRecordsToObject(
  datasetId: string,
  objectId: string,
  lifecycleStatus: HistoricalDataset['lifecycleStatus'] = 'LINKED'
) {
  await linkDatasetToObject(datasetId, objectId, lifecycleStatus);
}

export async function updateDatasetLifecycleStatus(
  datasetId: string,
  lifecycleStatus: HistoricalDataset['lifecycleStatus']
) {
  const db = await getDB();
  const dataset = await db.get(STORES.DATASETS, datasetId);
  if (!dataset) return;

  await db.put(STORES.DATASETS, {
    ...dataset,
    lifecycleStatus,
  });
}

export async function deleteHistoricalDataset(datasetId: string) {
  const db = await getDB();
  const dataset = await db.get(STORES.DATASETS, datasetId);
  if (!dataset) return;

  const tx = db.transaction([STORES.DATASETS, STORES.RECORDS], 'readwrite');
  await tx.objectStore(STORES.DATASETS).delete(datasetId);

  const records = await tx.objectStore(STORES.RECORDS).index('propertyId').getAll(dataset.propertyId);
  for (const record of records) {
    await tx.objectStore(STORES.RECORDS).delete(record.id);
  }

  await tx.done;
}

export async function resetHistoricalStore() {
  const db = await getDB();
  const tx = db.transaction([STORES.DATASETS, STORES.RECORDS, STORES.SENSORS], 'readwrite');
  await tx.objectStore(STORES.DATASETS).clear();
  await tx.objectStore(STORES.RECORDS).clear();
  await tx.objectStore(STORES.SENSORS).clear();
  await tx.done;
}

export async function getSensorSnapshot(objectId: string): Promise<SensorSnapshot | null> {
  const db = await getDB();
  return (await db.get(STORES.SENSORS, objectId)) ?? null;
}

export async function saveSensorSnapshot(snapshot: SensorSnapshot) {
  const db = await getDB();
  await db.put(STORES.SENSORS, snapshot);
}
