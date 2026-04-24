/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HistoricalDataset,
  HistoricalRecord,
  HistoryChartPoint,
  TrustDecision,
} from '../types';

export const REQUIRED_HISTORY_HEADERS = [
  'date',
  'zipcode',
  'energysource',
  'city',
  'energyusage [kWh]',
  'livingspace [m²]',
  'mean outside temperature [°C]',
  'roomnumber',
  'emission factor [g/kWh]',
  'unitnumber',
];

function nowIso() {
  return new Date().toISOString();
}

export function normalizeHeader(header: string) {
  return header.trim();
}

export function safeNumber(value: string): number {
  const normalized = String(value ?? '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function toPropertyId(sourceFile: string) {
  return sourceFile.replace(/\.csv$/i, '').trim();
}

export function validateHistoricalCsvSchema(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const missing = REQUIRED_HISTORY_HEADERS.filter((required) => !normalized.includes(required));

  return {
    isValid: missing.length === 0,
    missingHeaders: missing,
  };
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

export function normalizeHistoricalRecord(
  row: Record<string, string>,
  propertyId: string,
  sourceFile: string
): HistoricalRecord {
  const date = row['date']?.trim();
  const zipcode = safeNumber(row['zipcode']);
  const city = row['city']?.trim();
  const energysource = row['energysource']?.trim();
  const energyUsageKwh = safeNumber(row['energyusage [kWh]']);
  const livingSpaceM2 = safeNumber(row['livingspace [m²]']);
  const meanOutsideTemperatureC = safeNumber(row['mean outside temperature [°C]']);
  const roomNumber = safeNumber(row['roomnumber']);
  const emissionFactorGPerKwh = safeNumber(row['emission factor [g/kWh]']);
  const unitNumber = safeNumber(row['unitnumber']);

  const co2EmissionsG =
    Number.isFinite(energyUsageKwh) && Number.isFinite(emissionFactorGPerKwh)
      ? energyUsageKwh * emissionFactorGPerKwh
      : NaN;

  const kwhPerM2 =
    Number.isFinite(energyUsageKwh) && Number.isFinite(livingSpaceM2) && livingSpaceM2 > 0
      ? energyUsageKwh / livingSpaceM2
      : NaN;

  const heatingDegreeDeltaC = Number.isFinite(meanOutsideTemperatureC)
    ? Math.max(0, 20 - meanOutsideTemperatureC)
    : NaN;

  return {
    id: `${propertyId}-${date}-${unitNumber}-${Math.random().toString(36).slice(2, 8)}`,
    propertyId,
    objectId: null,
    date,
    zipcode,
    city,
    energysource,
    energyUsageKwh,
    livingSpaceM2,
    meanOutsideTemperatureC,
    roomNumber,
    emissionFactorGPerKwh,
    unitNumber,
    co2EmissionsG,
    kwhPerM2,
    heatingDegreeDeltaC,
    sourceFile,
    importedAt: nowIso(),
  };
}

export function parseHistoricalCsv(content: string, sourceFile: string): {
  records: HistoricalRecord[];
  validationStatus: TrustDecision;
  issues: string[];
} {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      records: [],
      validationStatus: 'HIGH RISK',
      issues: ['CSV file is empty.'],
    };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const schema = validateHistoricalCsvSchema(headers);

  if (!schema.isValid) {
    return {
      records: [],
      validationStatus: 'HIGH RISK',
      issues: [`Missing required headers: ${schema.missingHeaders.join(', ')}`],
    };
  }

  const propertyId = toPropertyId(sourceFile);
  const records: HistoricalRecord[] = [];
  const issues: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) {
      issues.push(`Row ${i + 1}: column count mismatch.`);
      continue;
    }

    const row = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});

    const record = normalizeHistoricalRecord(row, propertyId, sourceFile);
    records.push(record);
  }

  let validationStatus: TrustDecision = 'TRUST';

  if (issues.length > 0) validationStatus = 'REVIEW';
  if (!records.length) validationStatus = 'HIGH RISK';

  const hasInvalidCoreFields = records.some(
    (record) =>
      !record.date ||
      !Number.isFinite(record.energyUsageKwh) ||
      !Number.isFinite(record.meanOutsideTemperatureC)
  );

  if (hasInvalidCoreFields) {
    validationStatus = 'REVIEW';
    issues.push('Some rows contain invalid core numeric or date values.');
  }

  const hasNonPositiveArea = records.some(
    (record) => !Number.isFinite(record.livingSpaceM2) || record.livingSpaceM2 <= 0
  );

  if (hasNonPositiveArea) {
    validationStatus = 'REVIEW';
    issues.push('Some rows have missing or non-positive living space values.');
  }

  return { records, validationStatus, issues };
}

export function buildHistoricalDatasetMeta(
  records: HistoricalRecord[],
  propertyId: string,
  sourceFile: string,
  validationStatus: TrustDecision,
  issues: string[]
): HistoricalDataset {
  const sortedDates = records.map((record) => record.date).sort();

  return {
    id: `dataset-${propertyId}`,
    name: sourceFile,
    objectId: null,
    propertyId,
    city: records[0]?.city ?? 'Unknown',
    zipcode: records[0]?.zipcode ?? 0,
    energySource: records[0]?.energysource ?? 'Unknown',
    recordCount: records.length,
    dateRange: {
      start: sortedDates[0] ?? null,
      end: sortedDates[sortedDates.length - 1] ?? null,
    },
    importedAt: nowIso(),
    source: 'upload',
    validationStatus,
    issues,
  };
}

function aggregateBy(
  records: HistoricalRecord[],
  keyBuilder: (record: HistoricalRecord) => string,
  energyPricePerKwh?: number
): HistoryChartPoint[] {
  const map = new Map<
    string,
    {
      energy: number;
      temp: number[];
      co2: number;
      kwhPerM2: number[];
    }
  >();

  for (const record of records) {
    const key = keyBuilder(record);
    const existing = map.get(key) ?? {
      energy: 0,
      temp: [],
      co2: 0,
      kwhPerM2: [],
    };

    existing.energy += Number.isFinite(record.energyUsageKwh) ? record.energyUsageKwh : 0;
    if (Number.isFinite(record.meanOutsideTemperatureC)) {
      existing.temp.push(record.meanOutsideTemperatureC);
    }
    existing.co2 += Number.isFinite(record.co2EmissionsG) ? record.co2EmissionsG : 0;
    if (Number.isFinite(record.kwhPerM2)) {
      existing.kwhPerM2.push(record.kwhPerM2);
    }

    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      energyUsageKwh: Number(value.energy.toFixed(2)),
      meanOutsideTemperatureC: value.temp.length
        ? Number((value.temp.reduce((sum, x) => sum + x, 0) / value.temp.length).toFixed(2))
        : 0,
      co2EmissionsG: Number(value.co2.toFixed(2)),
      kwhPerM2: value.kwhPerM2.length
        ? Number((value.kwhPerM2.reduce((sum, x) => sum + x, 0) / value.kwhPerM2.length).toFixed(4))
        : 0,
      estimatedCostEur:
        typeof energyPricePerKwh === 'number'
          ? Number((value.energy * energyPricePerKwh).toFixed(2))
          : undefined,
    }));
}

export function aggregateHistoryByDay(
  records: HistoricalRecord[],
  energyPricePerKwh?: number
) {
  return aggregateBy(records, (record) => record.date, energyPricePerKwh);
}

function getWeekLabel(dateString: string) {
  const date = new Date(dateString);
  const firstDayOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + firstDayOfYear.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function aggregateHistoryByWeek(
  records: HistoricalRecord[],
  energyPricePerKwh?: number
) {
  return aggregateBy(records, (record) => getWeekLabel(record.date), energyPricePerKwh);
}

export function aggregateHistoryByMonth(
  records: HistoricalRecord[],
  energyPricePerKwh?: number
) {
  return aggregateBy(records, (record) => record.date.slice(0, 7), energyPricePerKwh);
}
