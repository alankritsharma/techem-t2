/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CsvValidationIssue,
  CsvValidationSummary,
  HistoricalImportPreview,
  HistoricalRecord,
  TrustDecision,
} from '../types';
import {
  buildHistoricalDatasetMeta,
  normalizeHeader,
  parseCsvLine,
  parseHistoricalCsv,
  REQUIRED_HISTORY_HEADERS,
  toPropertyId,
} from './historyProcessing';
import { runCsvAuditCheck } from './historyAuditService';
import { PROPERTY_CSV_SCHEMA } from './historySchemaReference';

function isValidDateString(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sortDates(records: HistoricalRecord[]) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

export function detectDuplicateRows(records: HistoricalRecord[]): CsvValidationIssue[] {
  const issues: CsvValidationIssue[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const key = `${record.propertyId}|${record.date}|${record.unitNumber}`;
    if (seen.has(key)) {
      issues.push({
        code: 'DUPLICATE_ROW',
        severity: 'warning',
        message: `Duplicate row detected for date ${record.date} and unit ${record.unitNumber}.`,
        rowIndex: index + 2,
      });
    } else {
      seen.add(key);
    }
  });

  return issues;
}

export function detectTimeSeriesGaps(records: HistoricalRecord[]): CsvValidationIssue[] {
  const issues: CsvValidationIssue[] = [];
  const byUnit = new Map<number, HistoricalRecord[]>();

  for (const record of records) {
    const list = byUnit.get(record.unitNumber) ?? [];
    list.push(record);
    byUnit.set(record.unitNumber, list);
  }

  for (const [unitNumber, unitRecords] of byUnit.entries()) {
    const sorted = sortDates(unitRecords);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays > 1) {
        issues.push({
          code: 'TIME_GAP',
          severity: 'warning',
          message: `Gap of ${diffDays - 1} day(s) detected for unit ${unitNumber} between ${sorted[i - 1].date} and ${sorted[i].date}.`,
        });
      }
    }
  }

  return issues;
}

export function validateHistoricalRows(
  records: HistoricalRecord[],
  propertyId: string
): CsvValidationIssue[] {
  const issues: CsvValidationIssue[] = [];

  records.forEach((record, index) => {
    // Schema Reference Business Rule Checks
    if (!PROPERTY_CSV_SCHEMA.businessRules.allowedEnergySources.includes(record.energysource)) {
      issues.push({
        code: 'BUSINESS_RULE',
        severity: 'warning',
        message: `Unknown energy source: ${record.energysource}. Standard portfolio uses ${PROPERTY_CSV_SCHEMA.businessRules.allowedEnergySources.join(', ')}.`,
        rowIndex: index + 2,
        column: 'energysource'
      } as any);
    }

    if (!isValidDateString(record.date)) {
      issues.push({
        code: 'INVALID_DATE',
        severity: 'critical',
        message: `Invalid date format: ${record.date}`,
        rowIndex: index + 2,
        column: 'date',
      });
    }

    if (!Number.isFinite(record.energyUsageKwh)) {
      issues.push({
        code: 'INVALID_NUMBER',
        severity: 'critical',
        message: 'Energy usage is not numeric.',
        rowIndex: index + 2,
        column: 'energyusage [kWh]',
      });
    }

    if (Number.isFinite(record.energyUsageKwh) && record.energyUsageKwh < 0) {
      issues.push({
        code: 'NEGATIVE_ENERGY',
        severity: 'critical',
        message: 'Negative energy usage detected.',
        rowIndex: index + 2,
        column: 'energyusage [kWh]',
      });
    }

    if (!Number.isFinite(record.meanOutsideTemperatureC)) {
      issues.push({
        code: 'MISSING_TEMPERATURE',
        severity: 'warning',
        message: 'Temperature value missing or invalid.',
        rowIndex: index + 2,
        column: 'mean outside temperature [°C]',
      });
    }

    if (!Number.isFinite(record.livingSpaceM2) || record.livingSpaceM2 <= 0) {
      issues.push({
        code: 'INVALID_LIVING_SPACE',
        severity: 'warning',
        message: 'Living space missing or not positive.',
        rowIndex: index + 2,
        column: 'livingspace [m²]',
      });
    }

    if (!Number.isFinite(record.emissionFactorGPerKwh) || record.emissionFactorGPerKwh <= 0) {
      issues.push({
        code: 'INVALID_EMISSION_FACTOR',
        severity: 'warning',
        message: 'Emission factor missing or not positive.',
        rowIndex: index + 2,
        column: 'emission factor [g/kWh]',
      });
    }

    if (
      Number.isFinite(record.energyUsageKwh) &&
      record.energyUsageKwh === 0 &&
      Number.isFinite(record.meanOutsideTemperatureC) &&
      record.meanOutsideTemperatureC < 5
    ) {
      issues.push({
        code: 'ZERO_USAGE_ANOMALY',
        severity: 'info',
        message: 'Zero usage at low outdoor temperature may indicate anomaly or missing data.',
        rowIndex: index + 2,
        column: 'energyusage [kWh]',
      });
    }
  });

  issues.push(...detectDuplicateRows(records));
  issues.push(...detectTimeSeriesGaps(records));

  return issues;
}

export function buildCsvValidationSummary(args: {
  fileName: string;
  propertyId: string;
  totalRows: number;
  records: HistoricalRecord[];
  issues: CsvValidationIssue[];
  missingColumns?: string[];
}): CsvValidationSummary {
  const {
    fileName,
    propertyId,
    totalRows,
    issues,
    missingColumns = [],
  } = args;

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

  const invalidRowIndexes = new Set(
    issues
      .filter((issue) => typeof issue.rowIndex === 'number' && issue.severity !== 'info')
      .map((issue) => issue.rowIndex as number)
  );

  let validationStatus: TrustDecision = 'TRUST';

  if (missingColumns.length > 0 || criticalCount > 0) {
    validationStatus = 'HIGH RISK';
  } else if (warningCount > 0 || issues.length > 0) {
    validationStatus = 'REVIEW';
  }

  const canImport = validationStatus !== 'HIGH RISK';

  return {
    fileName,
    propertyId,
    totalRows,
    validRows: Math.max(0, totalRows - invalidRowIndexes.size),
    invalidRows: invalidRowIndexes.size,
    validationStatus,
    issues,
    missingColumns,
    duplicateCount: issues.filter((issue) => issue.code === 'DUPLICATE_ROW').length,
    missingTemperatureCount: issues.filter((issue) => issue.code === 'MISSING_TEMPERATURE').length,
    invalidLivingSpaceCount: issues.filter((issue) => issue.code === 'INVALID_LIVING_SPACE').length,
    negativeEnergyCount: issues.filter((issue) => issue.code === 'NEGATIVE_ENERGY').length,
    invalidEmissionFactorCount: issues.filter((issue) => issue.code === 'INVALID_EMISSION_FACTOR').length,
    zeroUsageAnomalyCount: issues.filter((issue) => issue.code === 'ZERO_USAGE_ANOMALY').length,
    timeGapCount: issues.filter((issue) => issue.code === 'TIME_GAP').length,
    canImport,
  };
}

export async function validateCsvBeforeImport(
  fileName: string,
  content: string
): Promise<HistoricalImportPreview> {
  const auditReport = await runCsvAuditCheck(fileName, content);

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = lines.length ? parseCsvLine(lines[0]).map(normalizeHeader) : [];
  const missingColumns = REQUIRED_HISTORY_HEADERS.filter((header) => !headers.includes(header));
  const propertyId = toPropertyId(fileName);

  const parsed = parseHistoricalCsv(content, fileName);
  const rowIssues = validateHistoricalRows(parsed.records, propertyId);

  const summary = buildCsvValidationSummary({
    fileName,
    propertyId,
    totalRows: Math.max(0, lines.length - 1),
    records: parsed.records,
    issues: rowIssues,
    missingColumns,
  });

  const dataset =
    summary.canImport && parsed.records.length
      ? {
          ...buildHistoricalDatasetMeta(
            parsed.records,
            propertyId,
            fileName,
            summary.validationStatus,
            summary.issues.map((issue) => issue.message)
          ),
          lifecycleStatus: 'VALIDATED' as const,
          auditReport,
        }
      : null;

  return {
    fileName,
    propertyId,
    summary,
    records: parsed.records,
    dataset,
    auditReport,
  };
}
