/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MSDReading, OptimizationRecommendation } from '../types';

export function assessMoistureRisk(args: {
  objectId: string;
  readings: MSDReading[];
}): OptimizationRecommendation[] {
  const { objectId, readings } = args;

  if (!readings.length) {
    return [
      {
        objectId,
        category: 'moisture',
        severity: 'LOW',
        confidence: 'REVIEW',
        issue: 'No MSD readings available for humidity and room temperature.',
        recommendedAction: 'Connect MSD sensor data before deriving mold prevention guidance.',
        economicImpact: 'Moisture-related damage prevention cannot be estimated yet.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const latest = readings[readings.length - 1];
  const humidity = latest.humidityPercent;
  const temp = latest.temperatureC;
  const windowsOpen = Boolean(latest.windowsOpen);
  const heatingActive = Boolean(latest.heatingActive);

  const results: OptimizationRecommendation[] = [];

  if (humidity >= 70) {
    results.push({
      objectId,
      category: 'moisture',
      severity: humidity >= 78 ? 'HIGH' : 'MEDIUM',
      confidence: 'TRUST',
      issue: `Humidity reached ${humidity.toFixed(1)}%, indicating elevated mold risk.`,
      recommendedAction: heatingActive
        ? 'Ventilate now and reduce heating level to avoid humidity buildup and heat conflict.'
        : 'Ventilate now to reduce moisture concentration in the room.',
      economicImpact: 'Prevents moisture-related damage, tenant complaints and remediation cost.',
      createdAt: new Date().toISOString(),
    });
  }

  if (windowsOpen && heatingActive) {
    results.push({
      objectId,
      category: 'moisture',
      severity: 'MEDIUM',
      confidence: 'TRUST',
      issue: 'Window-open and heating-active conflict detected.',
      recommendedAction: 'Turn down heating while ventilating to avoid unnecessary heat loss.',
      economicImpact: 'Reduces avoidable heat loss during airing periods.',
      createdAt: new Date().toISOString(),
    });
  }

  if (!results.length) {
    results.push({
      objectId,
      category: 'moisture',
      severity: 'LOW',
      confidence: 'TRUST',
      issue: `Humidity (${humidity.toFixed(1)}%) and temperature (${temp.toFixed(1)}°C) are currently within acceptable range.`,
      recommendedAction: 'Continue regular monitoring and maintain periodic ventilation.',
      economicImpact: 'No immediate moisture-related cost escalation signal detected.',
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}
