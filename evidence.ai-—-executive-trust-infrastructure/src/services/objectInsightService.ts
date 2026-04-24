/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BuildingObject,
  DerivedAlarmItem,
  DerivedComplianceItem,
  DerivedEvidenceItem,
  HistoricalDataset,
  HistoricalRecord,
  OptimizationRecommendation,
  HistoricalTrustAssessment,
  EvidenceAuthorityAssessment,
  EconomicValueAssessment,
} from '../types';

export function deriveEvidenceItems(args: {
  object: BuildingObject;
  datasets: HistoricalDataset[];
  records: HistoricalRecord[];
  optimizationFindings: OptimizationRecommendation[];
}): DerivedEvidenceItem[] {
  const { object, datasets, records, optimizationFindings } = args;
  const items: DerivedEvidenceItem[] = [];

  if (datasets.length) {
    items.push({
      id: `evidence-dataset-${object.id}`,
      objectId: object.id,
      title: 'Historical dataset linked',
      description: `${datasets.length} historical dataset(s) are linked to this object.`,
      sourceType: 'dataset',
      confidence: datasets.some((d) => d.validationStatus === 'HIGH RISK') ? 'HIGH RISK' : datasets.some((d) => d.validationStatus === 'REVIEW') ? 'REVIEW' : 'TRUST',
      timestamp: datasets[0].importedAt,
    });
  }

  if (records.length) {
    items.push({
      id: `evidence-history-${object.id}`,
      objectId: object.id,
      title: 'Historical operating evidence',
      description: `${records.length} linked history record(s) are available for trend and forecast derivation.`,
      sourceType: 'history',
      confidence: records.length >= 30 ? 'TRUST' : records.length >= 10 ? 'REVIEW' : 'HIGH RISK',
      timestamp: records[records.length - 1]?.importedAt ?? new Date().toISOString(),
    });
  }

  optimizationFindings.slice(0, 3).forEach((finding, index) => {
    items.push({
      id: `evidence-opt-${object.id}-${index}`,
      objectId: object.id,
      title: `${finding.category.toUpperCase()} optimization signal`,
      description: finding.issue,
      sourceType: 'optimization',
      confidence: finding.confidence,
      timestamp: finding.createdAt,
    });
  });

  return items;
}

export function deriveAlarmItems(args: {
  object: BuildingObject;
  datasets: HistoricalDataset[];
  records: HistoricalRecord[];
  optimizationFindings: OptimizationRecommendation[];
}): DerivedAlarmItem[] {
  const { object, datasets, records, optimizationFindings } = args;
  const alarms: DerivedAlarmItem[] = [];

  datasets.forEach((dataset, index) => {
    if (dataset.validationStatus !== 'TRUST') {
      alarms.push({
        id: `alarm-dataset-${object.id}-${index}`,
        objectId: object.id,
        title: `Dataset quality ${dataset.validationStatus.toLowerCase()}`,
        description: `${dataset.propertyId} is ${dataset.validationStatus.toLowerCase()}-bound and may weaken forecast trust.`,
        severity: dataset.validationStatus === 'HIGH RISK' ? 'critical' : 'warning',
        sourceType: 'audit',
        timestamp: dataset.importedAt,
      });
    }
  });

  const zeroUsageCold = records.filter(
    (record) => record.energyUsageKwh === 0 && record.meanOutsideTemperatureC < 5
  );
  if (zeroUsageCold.length) {
    alarms.push({
      id: `alarm-zero-${object.id}`,
      objectId: object.id,
      title: 'Zero-usage cold weather anomaly',
      description: `${zeroUsageCold.length} record(s) show zero energy use at low outdoor temperatures.`,
      severity: 'warning',
      sourceType: 'history',
      timestamp: zeroUsageCold[0].importedAt,
    });
  }

  optimizationFindings.forEach((finding, index) => {
    if (finding.severity !== 'LOW') {
      alarms.push({
        id: `alarm-opt-${object.id}-${index}`,
        objectId: object.id,
        title: `${finding.category.toUpperCase()} optimization risk`,
        description: finding.issue,
        severity: finding.severity === 'HIGH' ? 'critical' : 'warning',
        sourceType: 'optimization',
        timestamp: finding.createdAt,
      });
    }
  });

  return alarms;
}

export function deriveComplianceItems(args: {
  object: BuildingObject;
  historicalTrust: HistoricalTrustAssessment;
  evidenceAuthority: EvidenceAuthorityAssessment;
  economicValue: EconomicValueAssessment;
  optimizationFindings: OptimizationRecommendation[];
}): DerivedComplianceItem[] {
  const { object, historicalTrust, evidenceAuthority, economicValue, optimizationFindings } = args;

  const results: DerivedComplianceItem[] = [
    {
      id: `comp-evidence-${object.id}`,
      objectId: object.id,
      pillar: 'Evidence integrity',
      status:
        evidenceAuthority.proofLevel === 'BLOCKED' ||
        evidenceAuthority.proofLevel === 'UNVERIFIED'
          ? 'Critical'
          : evidenceAuthority.proofLevel === 'REQUIRES_REVIEW'
          ? 'Warning'
          : 'Compliant',
      lastVerified: evidenceAuthority.calculatedAt,
      actionLabel: 'Evidence Authority',
      explanation: `Proof level for governance is ${evidenceAuthority.proofLevel.replace(/_/g, ' ')}.`,
    },
    {
      id: `comp-carbon-${object.id}`,
      objectId: object.id,
      pillar: 'Carbon transparency',
      status:
        economicValue.annualCo2ExposureKg > 200000
          ? 'Critical'
          : economicValue.annualCo2ExposureKg > 50000
          ? 'Warning'
          : 'Compliant',
      lastVerified: economicValue.calculatedAt,
      actionLabel: 'Carbon Risk',
      explanation: `Operational CO2 exposure is ${Math.round(economicValue.annualCo2ExposureKg).toLocaleString()}kg / year.`,
    },
    {
      id: `comp-trust-${object.id}`,
      objectId: object.id,
      pillar: 'Historical transparency',
      status:
        historicalTrust.trustStatus === 'HIGH RISK'
          ? 'Critical'
          : historicalTrust.trustStatus === 'REVIEW'
          ? 'Warning'
          : 'Compliant',
      lastVerified: historicalTrust.calculatedAt,
      actionLabel: 'Trust Level',
      explanation: `Historical data trust is ${historicalTrust.trustStatus}.`,
    },
    {
      id: `comp-optimization-${object.id}`,
      objectId: object.id,
      pillar: 'Operational gap',
      status: optimizationFindings.some((f) => f.severity === 'HIGH')
        ? 'Critical'
        : optimizationFindings.length > 0
        ? 'Warning'
        : 'Compliant',
      lastVerified: optimizationFindings[0]?.createdAt ?? new Date().toISOString(),
      actionLabel: 'Optimization',
      explanation: `${optimizationFindings.length} pending optimization(s) detected.`,
    },
  ];

  return results;
}
