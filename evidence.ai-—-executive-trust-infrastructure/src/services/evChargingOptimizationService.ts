/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EVChargingReading, OptimizationRecommendation } from '../types';

function getHour(timestamp: string) {
  return new Date(timestamp).getHours();
}

export function assessEVChargingOptimization(args: {
  objectId: string;
  readings: EVChargingReading[];
}): OptimizationRecommendation[] {
  const { objectId, readings } = args;

  if (!readings.length) {
    return [
      {
        objectId,
        category: 'ev',
        severity: 'LOW',
        confidence: 'REVIEW',
        issue: 'No EV charging telemetry available.',
        recommendedAction: 'Connect EV charging telemetry before enabling load behavior recommendations.',
        economicImpact: 'No charging optimization potential can be quantified yet.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const totalEnergy = readings.reduce((sum, reading) => sum + Math.max(0, reading.energyUsageKwh), 0);
  const peakWindowReadings = readings.filter((reading) => {
    const hour = getHour(reading.timestamp);
    return hour >= 17 && hour <= 21;
  });

  const peakEnergy = peakWindowReadings.reduce((sum, reading) => sum + Math.max(0, reading.energyUsageKwh), 0);
  const peakShare = totalEnergy > 0 ? peakEnergy / totalEnergy : 0;

  const results: OptimizationRecommendation[] = [];

  if (peakShare > 0.4) {
    results.push({
      objectId,
      category: 'ev',
      severity: peakShare > 0.6 ? 'HIGH' : 'MEDIUM',
      confidence: 'TRUST',
      issue: `Charging behavior causes evening peak load concentration (${(peakShare * 100).toFixed(1)}% of measured EV energy).`,
      recommendedAction: 'Shift charging to preferred windows such as 08:00–15:00 or 21:00–24:00 and notify tenants when charging is complete.',
      economicImpact: 'Reduces local peak load pressure and improves charging behavior efficiency.',
      createdAt: new Date().toISOString(),
    });
  }

  const completedSessions = readings.filter((reading) => reading.isCompleted).length;
  if (completedSessions > 0) {
    results.push({
      objectId,
      category: 'ev',
      severity: 'LOW',
      confidence: 'TRUST',
      issue: `${completedSessions} completed charging sessions detected.`,
      recommendedAction: 'Enable completion alerts so vehicles are removed promptly and charging slots are reused efficiently.',
      economicImpact: 'Improves station turnover and charging slot utilization.',
      createdAt: new Date().toISOString(),
    });
  }

  if (!results.length) {
    results.push({
      objectId,
      category: 'ev',
      severity: 'LOW',
      confidence: 'TRUST',
      issue: 'No critical EV charging inefficiency detected in the measured interval.',
      recommendedAction: 'Continue monitoring charging frequency and interval concentration.',
      economicImpact: 'No immediate EV load optimization pressure detected.',
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}
