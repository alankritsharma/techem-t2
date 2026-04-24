/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BuildingObject,
  BuildingProject,
  LocalStorageEnvelope,
  SensorSnapshot,
} from '../types';
import { saveSensorSnapshot, getSensorSnapshot } from './historyStore';

const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  OBJECTS: 'trusted_building_objects',
  PROJECTS: 'trusted_building_projects',
  CURRENT_OBJECT: 'trusted_building_current_object',
  SCHEMA_VERSION: 'trusted_building_schema_version',
} as const;

const nowIso = () => new Date().toISOString();

export const TECHMX_SEED_OBJECT: BuildingObject = {
  id: 'obj-techmx-001',
  name: 'TechmX',
  addressOriginal: 'Westerbachstraße 47/Hinterhof - Haus 2, 60489 Frankfurt am Main',
  addressValidated: 'Westerbachstraße 47, 60489 Frankfurt am Main, Germany',
  locationLabel: 'Frankfurt am Main',
  coordinates: { lat: 50.125, lng: 8.583 },
  validationStatus: 'TRUST',
  solarPosition: null,
  weatherProfile: null,
  trustStatus: 'TRUST',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  source: 'seed',
  isLocalDraft: false,
  type: 'Office / Test Object',
  description: 'Main Innovation Hub for Trusted Building workflows.',
  historicalDatasetIds: [],
  historyStatus: 'TRUST',
  historyCoverage: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-12-31T23:59:59Z',
    recordCount: 365,
  },
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
  if (!parsed || typeof parsed !== 'object') return fallback;
  if (parsed.version !== SCHEMA_VERSION) return fallback;
  if (!('data' in parsed)) return fallback;

  return parsed.data ?? fallback;
}

function writeSchemaVersion() {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(SCHEMA_VERSION));
}

function dedupeObjects(objects: BuildingObject[]): BuildingObject[] {
  const map = new Map<string, BuildingObject>();
  for (const obj of objects) map.set(obj.id, obj);
  return Array.from(map.values());
}

function dedupeProjects(projects: BuildingProject[]): BuildingProject[] {
  const map = new Map<string, BuildingProject>();
  for (const project of projects) map.set(project.id, project);
  return Array.from(map.values());
}

export function listObjects(): BuildingObject[] {
  const objects = readEnvelope<BuildingObject[]>(STORAGE_KEYS.OBJECTS, []);
  return Array.isArray(objects) ? objects : [];
}

export function listProjects(): BuildingProject[] {
  const projects = readEnvelope<BuildingProject[]>(STORAGE_KEYS.PROJECTS, []);
  return Array.isArray(projects) ? projects : [];
}

export function getObjectById(id: string): BuildingObject | undefined {
  return listObjects().find((obj) => obj.id === id);
}

export function getProjectById(id: string): BuildingProject | undefined {
  return listProjects().find((project) => project.id === id);
}

export function saveObjects(objects: BuildingObject[]) {
  writeEnvelope(STORAGE_KEYS.OBJECTS, dedupeObjects(objects));
}

export function saveProjects(projects: BuildingProject[]) {
  writeEnvelope(STORAGE_KEYS.PROJECTS, dedupeProjects(projects));
}

export function getCurrentObjectId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEYS.CURRENT_OBJECT);
}

export function setCurrentObjectId(id: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.CURRENT_OBJECT, id);
}

export function createObject(
  input: Pick<BuildingObject, 'name' | 'addressOriginal'> &
    Partial<Omit<BuildingObject, 'id' | 'name' | 'addressOriginal' | 'createdAt' | 'updatedAt'>>
): BuildingObject {
  const created: BuildingObject = {
    id: `obj-${Date.now()}`,
    name: input.name.trim(),
    addressOriginal: input.addressOriginal.trim(),
    addressValidated: input.addressValidated ?? null,
    locationLabel: input.locationLabel ?? input.addressOriginal.trim(),
    coordinates: input.coordinates ?? null,
    validationStatus: input.validationStatus ?? 'REVIEW',
    solarPosition: input.solarPosition ?? null,
    weatherProfile: input.weatherProfile ?? null,
    trustStatus: input.trustStatus ?? 'REVIEW',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: input.source ?? 'local',
    isLocalDraft: input.isLocalDraft ?? true,
    type: input.type ?? 'Building Object',
    description: input.description ?? '',
    historicalDatasetIds: input.historicalDatasetIds ?? [],
    historyStatus: input.historyStatus ?? 'REVIEW',
    historyCoverage:
      input.historyCoverage ?? {
        start: null,
        end: null,
        recordCount: 0,
      },
    importMetadata: input.importMetadata,
  };

  const next = [...listObjects(), created];
  saveObjects(next);
  return created;
}

export function updateObject(
  id: string,
  patch: Partial<BuildingObject>
): BuildingObject | null {
  const existing = getObjectById(id);
  if (!existing) return null;

  const updated: BuildingObject = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: nowIso(),
  };

  const next = listObjects().map((obj) => (obj.id === id ? updated : obj));
  saveObjects(next);
  return updated;
}

export function applyObjectHistoryMetadata(args: {
  objectId: string;
  historicalDatasetIds: string[];
  historyStatus: 'TRUST' | 'REVIEW' | 'HIGH RISK';
  historyCoverage: {
    start: string | null;
    end: string | null;
    recordCount: number;
  };
}) {
  return updateObject(args.objectId, {
    historicalDatasetIds: args.historicalDatasetIds,
    historyStatus: args.historyStatus,
    historyCoverage: args.historyCoverage,
  });
}

export function applyImportedDatasetMetadataToObject(args: {
  objectId: string;
  propertyId: string;
  datasetId: string;
  sourceFile: string;
}) {
  return updateObject(args.objectId, {
    source: 'import',
    isLocalDraft: false,
    validationStatus: 'REVIEW',
    importMetadata: {
      propertyId: args.propertyId,
      datasetId: args.datasetId,
      derivedFromCsv: true,
      sourceFile: args.sourceFile,
    },
  });
}

export function deleteObject(id: string) {
  const nextObjects = listObjects().filter((obj) => obj.id !== id);
  saveObjects(nextObjects);

  const nextProjects = listProjects().map((project) => ({
    ...project,
    objectIds: project.objectIds.filter((objectId) => objectId !== id),
    updatedAt: nowIso(),
  }));
  saveProjects(nextProjects);

  const currentId = getCurrentObjectId();
  if (currentId === id) {
    const fallbackId = nextObjects[0]?.id ?? null;
    if (fallbackId) setCurrentObjectId(fallbackId);
    else if (isBrowser()) window.localStorage.removeItem(STORAGE_KEYS.CURRENT_OBJECT);
  }
}

export function createProject(
  input: Pick<BuildingProject, 'name'> &
    Partial<Omit<BuildingProject, 'id' | 'name' | 'createdAt' | 'updatedAt'>>
): BuildingProject {
  const created: BuildingProject = {
    id: `prj-${Date.now()}`,
    name: input.name.trim(),
    description: input.description ?? '',
    objectIds: input.objectIds ?? [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    storageMode: input.storageMode ?? 'local',
  };

  const next = [...listProjects(), created];
  saveProjects(next);
  return created;
}

export function updateProject(
  id: string,
  patch: Partial<BuildingProject>
): BuildingProject | null {
  const existing = getProjectById(id);
  if (!existing) return null;

  const updated: BuildingProject = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: nowIso(),
  };

  const next = listProjects().map((project) => (project.id === id ? updated : project));
  saveProjects(next);
  return updated;
}

export function deleteProject(id: string) {
  saveProjects(listProjects().filter((project) => project.id !== id));
}

export async function initializeLocalState() {
  writeSchemaVersion();

  const objects = listObjects();
  if (objects.length === 0) {
    saveObjects([TECHMX_SEED_OBJECT]);
    setCurrentObjectId(TECHMX_SEED_OBJECT.id);
  } else {
    const currentId = getCurrentObjectId();
    const hasCurrent = currentId && objects.some((obj) => obj.id === currentId);
    if (!hasCurrent) {
      setCurrentObjectId(objects[0].id);
    }
  }

  // Seed initial sensor snapshot for TechmX if missing
  const existingSnapshot = await getSensorSnapshot(TECHMX_SEED_OBJECT.id);
  if (!existingSnapshot) {
    const seedSnapshot: SensorSnapshot = {
      id: `sensor-${TECHMX_SEED_OBJECT.id}`,
      objectId: TECHMX_SEED_OBJECT.id,
      waterColdLiters: 140,
      waterWarmLiters: 72,
      roomTemperature: 23.2,
      humidity: 67,
      heatingKwh: 4.8,
      heatingActive: true,
      evChargingKwh: 12.4,
      sourceMode: 'SIMULATED',
      createdAt: nowIso(),
    };
    await saveSensorSnapshot(seedSnapshot);
  }

  const projects = listProjects();
  if (!Array.isArray(projects)) {
    saveProjects([]);
  }
}

export function resetToSeedState() {
  saveObjects([TECHMX_SEED_OBJECT]);
  saveProjects([]);
  setCurrentObjectId(TECHMX_SEED_OBJECT.id);
  writeSchemaVersion();
}
