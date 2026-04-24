/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OptimizationRecommendation, OptimizationSnapshot, ReviewDossier, HistoricalTrustAssessment, ForecastReadinessAssessment, EconomicValueAssessment, SourceMode } from '../types';

export function buildOptimizationSummary(snapshot: OptimizationSnapshot): string[] {
  return snapshot.recommendations.map((rec) => {
    return `[${rec.category.toUpperCase()}] ${rec.issue} Recommended action: ${rec.recommendedAction}`;
  });
}

interface BuildReviewDossierInput {
  objectId: string;
  objectName: string;
  historicalTrust: HistoricalTrustAssessment;
  readiness: ForecastReadinessAssessment;
  economicValue: EconomicValueAssessment;
  optimizationFindings: OptimizationRecommendation[];
  sensorSource: SourceMode;
}

export function buildReviewDossier(
  input: BuildReviewDossierInput
): ReviewDossier {
  const {
    objectId,
    objectName,
    historicalTrust,
    readiness,
    economicValue,
    optimizationFindings,
    sensorSource,
  } = input;

  const highOptimization = optimizationFindings.filter(
    (f) => f.severity === 'HIGH'
  );

  let overallStatus: 'TRUST' | 'REVIEW' | 'HIGH RISK' | 'CRITICAL' = 'TRUST';

  if (
    historicalTrust.trustStatus === 'HIGH RISK' ||
    readiness.readinessStatus === 'NOT READY' ||
    highOptimization.length >= 2 ||
    sensorSource === 'FALLBACK'
  ) {
    overallStatus = 'HIGH RISK';
  } else if (
    historicalTrust.trustStatus === 'REVIEW' ||
    readiness.readinessStatus === 'REVIEW REQUIRED' ||
    optimizationFindings.length > 0 ||
    sensorSource === 'SIMULATED'
  ) {
    overallStatus = 'REVIEW';
  }

  const keyRisks = [
    historicalTrust.weakestPoint,
    ...economicValue.riskDrivers,
    ...optimizationFindings.map((f) => f.issue),
  ].filter(Boolean);

  const recommendedAction =
    optimizationFindings[0]?.recommendedAction ??
    economicValue.recommendedAction;

  return {
    objectId,
    title: `Review Dossier — ${objectName}`,
    overallStatus,

    executiveSummary:
      `Forecast confidence is ${overallStatus}. ` +
      `Optimization risks and historical evidence quality must be reviewed before approval. ` +
      (sensorSource === 'SIMULATED' ? 'Note: Sensor data is currently simulated.' : ''),

    factBase: [
      `Historical confidence score: ${historicalTrust.confidenceScore}`,
      `Economic calculation: ${Math.round(economicValue.annualUsageKwh ?? 0).toLocaleString()} kWh × ${(economicValue.energyPricePerKwh ?? 0).toFixed(2)} €/kWh`,
      `Benchmark source: ${economicValue.benchmarkSource ?? 'not specified'}`,
      `Optimization findings: ${optimizationFindings.length}`,
      `Sensor source integrity: ${sensorSource}`,
    ],

    weakestAssumption:
      optimizationFindings[0]?.issue ??
      historicalTrust.weakestPoint,

    keyRisks,

    economicImpactSummary:
      `Estimated annual exposure: €${(economicValue.annualCostExposureEur / 1000).toFixed(1)}k`,

    recommendedAction,

    nextRequiredEvidence: [
      'Validate operational optimization findings',
      'Review anomaly sources',
      'Confirm temperature + usage assumptions',
      ...(economicValue.calculationWarnings ?? []).map((warning) => `Resolve economic calculation warning: ${warning}`),
    ],

    optimizationFindings,
    sensorSource,

    generatedAt: new Date().toISOString(),
  };
}
