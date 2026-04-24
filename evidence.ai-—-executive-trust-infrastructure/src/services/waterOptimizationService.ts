/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WaterMeterReading, OptimizationRecommendation } from '../types';

export function assessWaterOptimization(args: {
  objectId: string;
  readings: WaterMeterReading[];
}): OptimizationRecommendation[] {
  const { objectId, readings } = args;

  if (!readings.length) {
    return [
      {
        objectId,
        category: 'water',
        severity: 'LOW',
        confidence: 'REVIEW',
        issue: 'No water meter readings available.',
        recommendedAction: 'Connect digital water meters before enabling leak detection alerts.',
        economicImpact: 'Potential water loss costs cannot be quantified.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const latest = readings[readings.length - 1];
  const results: OptimizationRecommendation[] = [];

  // Logic: High warm water share or high total flow in off-hours
  if (latest.warmWaterLiters > latest.coldWaterLiters * 1.5) {
    results.push({
      objectId,
      category: 'water',
      severity: 'MEDIUM',
      confidence: 'TRUST',
      issue: 'High warm water thermal share detected.',
      recommendedAction: 'Check circulation pump timing and insulation of warm water pipes.',
      economicImpact: 'Reduces avoidable standby heating energy for domestic hot water.',
      createdAt: new Date().toISOString(),
    });
  }

  if (!results.length) {
    results.push({
      objectId,
      category: 'water',
      severity: 'LOW',
      confidence: 'TRUST',
      issue: 'Water consumption patterns are within expected baseline.',
      recommendedAction: 'Continue monitoring for unusual flow signatures during night hours.',
      economicImpact: 'Maintains current efficient water utility cost level.',
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}
