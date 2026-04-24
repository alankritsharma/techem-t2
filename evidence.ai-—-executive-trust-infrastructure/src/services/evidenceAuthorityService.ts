/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BuildingObject,
  HistoricalDataset,
  HistoricalRecord,
  EvidenceAuthorityAssessment,
  EvidenceClass,
  EvidenceSourceType,
  ProofLevel,
  HistoricalTrustAssessment,
  ForecastReadinessAssessment,
} from '../types';

interface EvidenceInput {
  object: BuildingObject;
  datasets: HistoricalDataset[];
  records: HistoricalRecord[];
  historicalTrust: HistoricalTrustAssessment;
  forecastReadiness: ForecastReadinessAssessment;
}

export function assessEvidenceAuthority(input: EvidenceInput): EvidenceAuthorityAssessment {
  const { object, datasets, records, historicalTrust, forecastReadiness } = input;

  let score = 100;
  const authoritativeSources: string[] = [];
  const missingEvidence: string[] = [];
  const reviewBoundStatements: string[] = [];
  const sourceTypes: EvidenceSourceType[] = [];
  const scoreBreakdown: Array<{ label: string; delta: number; reason: string }> = [];

  function penalize(label: string, delta: number, reason: string) {
    score -= delta;
    scoreBreakdown.push({ label, delta: -delta, reason });
  }

  if (records.length > 0) {
    authoritativeSources.push(`Historical meter-like CSV evidence (${records.length.toLocaleString()} linked records)`);
    sourceTypes.push('CSV_IMPORT');
  } else {
    missingEvidence.push('No historical consumption records linked.');
    penalize('Historical records', 35, 'No historical consumption records linked.');
  }

  if (datasets.length > 0 && datasets.every((dataset) => dataset.auditReport)) {
    authoritativeSources.push('All linked datasets have persisted audit reports.');
  } else if (datasets.some((dataset) => dataset.auditReport)) {
    authoritativeSources.push('Some linked datasets have persisted audit reports.');
    missingEvidence.push('Not all linked datasets have audit reports.');
    penalize('Audit coverage', 5, 'Some linked datasets are not audit-backed.');
  } else {
    missingEvidence.push('No persisted audit-backed dataset available.');
    penalize('Audit coverage', 10, 'No linked dataset has a persisted audit report.');
  }

  if (object.coordinates) {
    authoritativeSources.push('Coordinate-based object location.');
    sourceTypes.push('WEATHER_DATA');
  } else {
    missingEvidence.push('Validated coordinates missing.');
    reviewBoundStatements.push('Weather-driven forecast statements remain review-bound.');
    penalize('Location precision', 12, 'Validated coordinates are missing.');
  }

  if (historicalTrust.trustStatus === 'HIGH RISK') {
    missingEvidence.push('Historical evidence quality is insufficient.');
    reviewBoundStatements.push('Financial and forecast statements cannot be treated as decision-grade.');
    penalize('Historical trust', 25, historicalTrust.weakestPoint);
  } else if (historicalTrust.trustStatus === 'REVIEW') {
    reviewBoundStatements.push('Historical evidence requires manual review before executive use.');
    penalize('Historical trust', 10, historicalTrust.weakestPoint);
  }

  if (forecastReadiness.readinessStatus === 'NOT READY') {
    reviewBoundStatements.push('Forecast recommendations are blocked until readiness is restored.');
    penalize('Forecast readiness', 18, forecastReadiness.requiredNextStep);
  } else if (forecastReadiness.readinessStatus === 'REVIEW REQUIRED') {
    reviewBoundStatements.push('Forecast outputs are only usable with explicit review.');
    penalize('Forecast readiness', 8, forecastReadiness.requiredNextStep);
  }

  const finalScore = Math.max(0, Math.round(score));

  const proofLevel: ProofLevel =
    finalScore >= 85
      ? 'FULLY_VERIFIED'
      : finalScore >= 70
      ? 'PARTIALLY_VERIFIED'
      : finalScore >= 50
      ? 'REQUIRES_REVIEW'
      : finalScore >= 30
      ? 'UNVERIFIED'
      : 'BLOCKED';

  const evidenceClass: EvidenceClass =
    records.length > 0 ? 'PRIMARY_EVIDENCE' : 'NON_AUTHORITATIVE_CONTEXT';

  return {
    objectId: object.id,
    evidenceClass,
    sourceTypes: Array.from(new Set(sourceTypes.length ? sourceTypes : ['ASSUMPTION_LAYER'])),
    proofLevel,
    evidenceCompletenessScore: finalScore,
    authoritativeSources,
    missingEvidence,
    reviewBoundStatements,
    explanationSummary:
      proofLevel === 'FULLY_VERIFIED'
        ? 'Evidence base is sufficiently complete for managed executive use.'
        : proofLevel === 'PARTIALLY_VERIFIED'
        ? `Evidence base is usable, but ${100 - finalScore} point(s) are missing due to review-bound evidence gaps.`
        : proofLevel === 'REQUIRES_REVIEW'
        ? 'Evidence is partially available but not strong enough for unrestricted recommendation.'
        : proofLevel === 'UNVERIFIED'
        ? 'Evidence is too weak for reliable executive output.'
        : 'Evidence integrity is insufficient. Board-safe recommendation is blocked.',
    calculatedAt: new Date().toISOString(),
    scoreBreakdown,
  };
}
