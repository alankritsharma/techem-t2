/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatasetObjectMapping, LocalStorageEnvelope } from '../types';

const SCHEMA_VERSION = 1;

const STORAGE_KEYS = {
  MAPPINGS: 'trusted_building_dataset_mappings',
  VERSION: 'trusted_building_mapping_schema_version',
} as const;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nowIso() {
  return new Date().toISOString();
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, data: T) {
  if (!isBrowser()) return;
  const envelope: LocalStorageEnvelope<T> = {
    version: SCHEMA_VERSION,
    updatedAt: nowIso(),
    data,
  };
  window.localStorage.setItem(key, JSON.stringify(envelope));
}

function readEnvelope<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const parsed = safeParse<LocalStorageEnvelope<T>>(window.localStorage.getItem(key));
  if (!parsed || parsed.version !== SCHEMA_VERSION || !('data' in parsed)) return fallback;
  return parsed.data ?? fallback;
}

export function initializeMappingStore() {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.VERSION, String(SCHEMA_VERSION));
  const mappings = listMappings();
  if (!Array.isArray(mappings)) {
    saveMappings([]);
  }
}

export function listMappings(): DatasetObjectMapping[] {
  const mappings = readEnvelope<DatasetObjectMapping[]>(STORAGE_KEYS.MAPPINGS, []);
  return Array.isArray(mappings) ? mappings : [];
}

export function saveMappings(mappings: DatasetObjectMapping[]) {
  writeEnvelope(STORAGE_KEYS.MAPPINGS, mappings);
}

export function getMappingByDatasetId(datasetId: string) {
  return listMappings().find((mapping) => mapping.datasetId === datasetId);
}

export function listMappingsForObject(objectId: string) {
  return listMappings().filter((mapping) => mapping.objectId === objectId);
}

export function createOrUpdateMapping(input: {
  datasetId: string;
  propertyId: string;
  objectId: string;
  mappingStatus?: 'CONFIRMED' | 'REVIEW';
  mappingReason?: string;
}): DatasetObjectMapping {
  const existing = getMappingByDatasetId(input.datasetId);
  const now = nowIso();

  const mapping: DatasetObjectMapping = existing
    ? {
        ...existing,
        objectId: input.objectId,
        propertyId: input.propertyId,
        mappingStatus: input.mappingStatus ?? existing.mappingStatus,
        mappingReason: input.mappingReason ?? existing.mappingReason,
        updatedAt: now,
      }
    : {
        id: `mapping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        datasetId: input.datasetId,
        propertyId: input.propertyId,
        objectId: input.objectId,
        mappingStatus: input.mappingStatus ?? 'CONFIRMED',
        mappingReason: input.mappingReason ?? '',
        createdAt: now,
        updatedAt: now,
      };

  const current = listMappings();
  const next = existing
    ? current.map((item) => (item.datasetId === input.datasetId ? mapping : item))
    : [...current, mapping];

  saveMappings(next);
  return mapping;
}

export function deleteMapping(datasetId: string) {
  saveMappings(listMappings().filter((mapping) => mapping.datasetId !== datasetId));
}

export function resetMappingStore() {
  saveMappings([]);
}
