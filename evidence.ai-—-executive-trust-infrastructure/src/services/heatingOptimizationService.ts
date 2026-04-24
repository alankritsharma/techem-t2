/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HeatingReading, OptimizationRecommendation } from '../types';

export function assessHeatingOptimization(args: {
  objectId: string;
  readings: HeatingReading[];
  comfortableMinC?: number;
  comfortableMaxC?: number;
  energyPricePerKwh?: number;
}): OptimizationRecommendation[] {
  const {
    objectId,
    readings,
    comfortableMinC = 19,
    comfortableMaxC = 23,
    energyPricePerKwh = 0.12,
  } = args;

  if (!readings.length) {
    return [
      {
        objectId,
        category: 'heating',
        severity: 'LOW',
        confidence: 'REVIEW',
        issue: 'No heating sub-meter readings available.',
        recommendedAction: 'Connect heating and room temperature telemetry before deriving heating optimization advice.',
        economicImpact: 'No reliable heating optimization potential can be quantified.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const latest = readings[readings.length - 1];
  const results: OptimizationRecommendation[] = [];

  if (latest.roomTemperatureC > comfortableMaxC && latest.heatingActive) {
    results.push({
      objectId,
      category: 'heating',
      severity: 'HIGH',
      confidence: 'TRUST',
      issue: `Room temperature is ${latest.roomTemperatureC.toFixed(1)}°C while heating remains active.`,
      recommendedAction: 'Reduce or switch off heating to return to efficient comfort range.',
      economicImpact: `Current heating use of ${latest.energyUsageKwh.toFixed(2)} kWh implies avoidable cost while overheating persists.`,
      co2Impact: latest.co2EmissionFactorGPerKwh
        ? `${((latest.energyUsageKwh * latest.co2EmissionFactorGPerKwh) / 1000).toFixed(2)} kg CO2 linked to the current interval.`
        : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  if (latest.roomTemperatureC < comfortableMinC && !latest.heatingActive) {
    results.push({
      objectId,
      category: 'heating',
      severity: 'MEDIUM',
      confidence: 'TRUST',
      issue: `Room temperature dropped to ${latest.roomTemperatureC.toFixed(1)}°C with heating inactive.`,
      recommendedAction: 'Turn heating on moderately to restore comfort without overshooting.',
      economicImpact: 'Improves comfort while preventing uncontrolled rebound heating.',
      createdAt: new Date().toISOString(),
    });
  }

  if (!results.length) {
    const intervalCost = latest.energyUsageKwh * energyPricePerKwh;
    const greenStamp = (latest.greenEnergySharePercent ?? 0) >= 60 ? 'GREEN STAMP' : 'REVIEW';

    results.push({
      objectId,
      category: 'heating',
      severity: 'LOW',
      confidence: 'TRUST',
      issue: `Heating behavior is currently within target range. Status: ${greenStamp}.`,
      recommendedAction: 'Continue monitoring room temperature and keep heating within efficient comfort range.',
      economicImpact: `Current interval heating cost estimate: €${intervalCost.toFixed(2)}.`,
      co2Impact: latest.co2EmissionFactorGPerKwh
        ? `${((latest.energyUsageKwh * latest.co2EmissionFactorGPerKwh) / 1000).toFixed(2)} kg CO2 in the current interval.`
        : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}
