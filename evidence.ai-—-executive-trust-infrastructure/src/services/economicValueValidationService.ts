/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BuildingObject, 
  HistoricalRecord, 
  HistoricalTrustAssessment, 
  ForecastReadinessAssessment, 
  EconomicValueAssessment, 
  TrustDecision 
} from '../types';

interface EconomicInput {
  object: BuildingObject;
  records: HistoricalRecord[];
  trust: HistoricalTrustAssessment;
  readiness: ForecastReadinessAssessment;
}

const DEFAULT_ENERGY_PRICE_EUR_PER_KWH = 0.35;
const DEFAULT_CO2_FACTOR_G_KWH = 200;

const BENCHMARKS_KWH_M2: Record<string, number> = {
  erdgas: 130,
  fernwärme: 115,
  heizöl: 145,
  default: 120,
};

export function assessEconomicValue(input: EconomicInput): EconomicValueAssessment {
  const { object, records, trust, readiness } = input;
  const now = new Date().toISOString();

  const calculationWarnings: string[] = [];

  const totalUsage = records.reduce((acc, r) => acc + safeNumber(r.energyUsageKwh), 0);
  const uniqueDays = new Set(records.map((r) => r.date).filter(Boolean)).size;
  const annualUsage = uniqueDays > 0 ? (totalUsage / uniqueDays) * 365 : 0;

  const effectiveAreaM2 = calculateEffectiveArea(records);
  if (effectiveAreaM2 <= 0) {
    calculationWarnings.push('Effective building area could not be derived from unique units.');
  }

  const energyPricePerKwh = DEFAULT_ENERGY_PRICE_EUR_PER_KWH;
  const annualCostExposureEur = annualUsage * energyPricePerKwh;

  const avgEmissionFactor = average(
    records
      .map((r) => safeNumber(r.emissionFactorGPerKwh))
      .filter((v) => v > 0)
  );

  const co2Factor = avgEmissionFactor || DEFAULT_CO2_FACTOR_G_KWH;
  const annualCo2ExposureKg = (annualUsage * co2Factor) / 1000;

  const energySource = normalizeEnergySource(records[0]?.energysource);
  const portfolioReferenceKwhM2 =
    BENCHMARKS_KWH_M2[energySource] ?? BENCHMARKS_KWH_M2.default;

  const currentKwhM2 = effectiveAreaM2 > 0 ? annualUsage / effectiveAreaM2 : 0;

  const efficiencyGapPercent =
    portfolioReferenceKwhM2 > 0
      ? ((currentKwhM2 - portfolioReferenceKwhM2) / portfolioReferenceKwhM2) * 100
      : 0;

  if (records.length > 0 && uniqueDays < 30) {
    calculationWarnings.push('Annualization is based on fewer than 30 unique days.');
  }

  if (currentKwhM2 > 350) {
    calculationWarnings.push(
      'Specific consumption is unusually high. Check whether imported living space is unit-level or building-level.'
    );
  }

  if (annualCostExposureEur > 0 && annualCostExposureEur / Math.max(annualUsage, 1) < 0.05) {
    calculationWarnings.push('Cost per kWh appears too low. Verify energy price unit.');
  }

  let businessConfidence: TrustDecision = trust.trustStatus;
  if (readiness.readinessStatus === 'NOT READY') {
    businessConfidence = 'HIGH RISK';
  } else if (calculationWarnings.length > 0 && businessConfidence === 'TRUST') {
    businessConfidence = 'REVIEW';
  }

  let decisionPriority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (annualCostExposureEur > 50000 || Math.abs(efficiencyGapPercent) > 20) {
    decisionPriority = 'HIGH';
  } else if (annualCostExposureEur > 20000 || Math.abs(efficiencyGapPercent) > 10) {
    decisionPriority = 'MEDIUM';
  }

  let recommendedAction = 'Continue standard monitoring.';
  if (businessConfidence === 'HIGH RISK') {
    recommendedAction = 'Validate data evidence before financial decision.';
  } else if (decisionPriority === 'HIGH' && efficiencyGapPercent > 0) {
    recommendedAction = 'Create an efficiency review project and validate benchmark assumptions before CAPEX decision.';
  } else if (decisionPriority === 'MEDIUM') {
    recommendedAction = 'Schedule quarterly performance review and validate price assumptions.';
  }

  const weakestEconomicAssumption =
    calculationWarnings[0] ||
    readiness.reasons[0] ||
    trust.weakestPoint ||
    'Energy price and portfolio benchmark assumptions';

  return {
    objectId: object.id,
    annualCostExposureEur,
    annualCo2ExposureKg,
    efficiencyGapPercent,
    baselineComparison: {
      referenceType: 'portfolio',
      referenceValue: portfolioReferenceKwhM2,
      currentValue: currentKwhM2,
      deltaPercent: efficiencyGapPercent,
    },
    riskDrivers: [
      efficiencyGapPercent > 10
        ? 'High specific energy consumption'
        : 'Consumption within benchmark tolerance',
      annualCostExposureEur > 30000
        ? 'Significant annual energy cost exposure'
        : 'Moderate annual energy cost exposure',
      ...calculationWarnings,
    ],
    weakestEconomicAssumption,
    businessConfidence,
    decisionPriority,
    recommendedAction,
    explanationSummary:
      `The building shows an ${
        efficiencyGapPercent > 0 ? 'efficiency gap' : 'efficiency surplus'
      } of ${Math.abs(efficiencyGapPercent).toFixed(1)}% compared to a ${
        energySource || 'default'
      } benchmark. Annualized consumption is ${Math.round(
        annualUsage
      ).toLocaleString()} kWh at ${energyPricePerKwh.toFixed(
        2
      )} €/kWh, resulting in ~${(annualCostExposureEur / 1000).toFixed(
        1
      )}k € annual cost exposure. Decision priority is ${decisionPriority}.`,
    calculatedAt: now,
    energyPricePerKwh,
    annualUsageKwh: annualUsage,
    effectiveAreaM2,
    benchmarkSource: `${energySource || 'default'} portfolio benchmark`,
    calculationWarnings,
  };
}

function calculateEffectiveArea(records: HistoricalRecord[]): number {
  if (!records.length) return 0;

  const uniqueUnitArea = new Map<string, number>();

  for (const record of records) {
    const unit = String(record.unitNumber ?? 'unknown');
    const area = safeNumber(record.livingSpaceM2);

    if (area > 0 && !uniqueUnitArea.has(unit)) {
      uniqueUnitArea.set(unit, area);
    }
  }

  return Array.from(uniqueUnitArea.values()).reduce((sum, area) => sum + area, 0);
}

function normalizeEnergySource(value?: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
