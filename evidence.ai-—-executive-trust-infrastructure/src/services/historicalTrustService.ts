/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HistoricalDataset,
  HistoricalRecord,
  HistoricalTrustAssessment,
  TrustDecision,
} from '../types';
import { listMappingsForObject } from './mappingStore';

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildCoverage(records: HistoricalRecord[]) {
  const sortedDates = records.map((record) => record.date).sort();
  return {
    start: sortedDates[0] ?? null,
    end: sortedDates[sortedDates.length - 1] ?? null,
    recordCount: records.length,
  };
}

export function assessHistoricalTrust(args: {
  objectId: string;
  datasets: HistoricalDataset[];
  records: HistoricalRecord[];
}): HistoricalTrustAssessment {
  const { objectId, datasets, records } = args;
  const mappings = listMappingsForObject(objectId);
  const issues: string[] = [];
  let score = 100;

  if (!datasets.length) {
    return {
      objectId,
      datasetIds: [],
      trustStatus: 'HIGH RISK',
      confidenceScore: 0,
      weakestPoint: 'No historical dataset linked to this object.',
      issues: ['No historical dataset linked to this object.'],
      coverage: {
        start: null,
        end: null,
        recordCount: 0,
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  const reviewDatasets = datasets.filter((dataset) => dataset.validationStatus === 'REVIEW').length;
  const highRiskDatasets = datasets.filter((dataset) => dataset.validationStatus === 'HIGH RISK').length;
  const confirmedMappings = mappings.filter((mapping) => mapping.mappingStatus === 'CONFIRMED').length;
  const reviewMappings = mappings.filter((mapping) => mapping.mappingStatus === 'REVIEW').length;

  if (records.length < 30) {
    score -= 18;
    issues.push('Historical record count is limited.');
  }

  if (records.length < 10) {
    score -= 28;
    issues.push('Historical baseline is too small for reliable forecasting.');
  }

  if (reviewDatasets > 0) {
    score -= reviewDatasets * 8;
    issues.push(`${reviewDatasets} dataset(s) remain review-bound after validation.`);
  }

  if (highRiskDatasets > 0) {
    score -= highRiskDatasets * 25;
    issues.push(`${highRiskDatasets} dataset(s) were imported despite high-risk signals.`);
  }

  if (reviewMappings > 0) {
    score -= reviewMappings * 10;
    issues.push(`${reviewMappings} mapping(s) are still marked as review.`);
  }

  if (confirmedMappings === 0) {
    score -= 20;
    issues.push('No confirmed dataset-to-object mapping exists.');
  }

  const invalidAreaCount = records.filter(
    (record) => !Number.isFinite(record.livingSpaceM2) || record.livingSpaceM2 <= 0
  ).length;

  if (invalidAreaCount > 0) {
    score -= Math.min(12, invalidAreaCount / 20);
    issues.push('Some records contain invalid or missing living space.');
  }

  const missingTempCount = records.filter(
    (record) => !Number.isFinite(record.meanOutsideTemperatureC)
  ).length;

  if (missingTempCount > 0) {
    score -= Math.min(12, missingTempCount / 20);
    issues.push('Some records contain missing outdoor temperature data.');
  }

  const duplicateDates = records.length - unique(records.map((r) => `${r.propertyId}|${r.date}|${r.unitNumber}`)).length;
  if (duplicateDates > 0) {
    score -= Math.min(10, duplicateDates / 5);
    issues.push('Duplicate date/unit combinations detected in historical records.');
  }

  let trustStatus: TrustDecision = 'TRUST';
  if (score < 55) trustStatus = 'HIGH RISK';
  else if (score < 80) trustStatus = 'REVIEW';

  const weakestPoint =
    issues[0] ??
    (trustStatus === 'TRUST'
      ? 'Historical evidence is sufficiently linked and usable.'
      : 'Historical evidence requires review.');

  return {
    objectId,
    datasetIds: datasets.map((dataset) => dataset.id),
    trustStatus,
    confidenceScore: Math.max(0, Math.round(score)),
    weakestPoint,
    issues,
    coverage: buildCoverage(records),
    calculatedAt: new Date().toISOString(),
  };
}
