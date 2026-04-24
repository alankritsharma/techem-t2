/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OptimizationRecommendation,
  OptimizationSnapshot,
  SensorSnapshot,
  SourceMode,
} from '../types';
import { assessWaterOptimization } from './waterOptimizationService';
import { assessMoistureRisk } from './moistureRiskService';
import { assessHeatingOptimization } from './heatingOptimizationService';
import { assessEVChargingOptimization } from './evChargingOptimizationService';

function severityRank(severity: OptimizationRecommendation['severity']) {
  if (severity === 'HIGH') return 3;
  if (severity === 'MEDIUM') return 2;
  return 1;
}

export function buildOptimizationSnapshot(args: {
  objectId: string;
  sensorSnapshot: SensorSnapshot | null;
  energyPricePerKwh?: number;
}): OptimizationSnapshot {
  const {
    objectId,
    sensorSnapshot,
    energyPricePerKwh,
  } = args;

  const sensorSource: SourceMode = sensorSnapshot?.sourceMode ?? 'FALLBACK';

  // Map snapshot to old reading formats for compatibility with existing services
  const waterReadings = sensorSnapshot ? [{
    objectId,
    timestamp: sensorSnapshot.createdAt,
    coldWaterLiters: sensorSnapshot.waterColdLiters,
    warmWaterLiters: sensorSnapshot.waterWarmLiters,
  }] : [];

  const msdReadings = sensorSnapshot ? [{
    objectId,
    timestamp: sensorSnapshot.createdAt,
    roomLabel: 'Main Area',
    temperatureC: sensorSnapshot.roomTemperature,
    humidityPercent: sensorSnapshot.humidity,
    windowsOpen: false, // Default or inferred
    heatingActive: sensorSnapshot.heatingActive,
  }] : [];

  const heatingReadings = sensorSnapshot ? [{
    objectId,
    timestamp: sensorSnapshot.createdAt,
    roomLabel: 'Main Area',
    roomTemperatureC: sensorSnapshot.roomTemperature,
    heatingActive: sensorSnapshot.heatingActive,
    energyUsageKwh: sensorSnapshot.heatingKwh,
    greenEnergySharePercent: 50, // Default
    co2EmissionFactorGPerKwh: 200, // Default
  }] : [];

  const evReadings = sensorSnapshot ? [{
    objectId,
    timestamp: sensorSnapshot.createdAt,
    chargerId: 'EV-01',
    energyUsageKwh: sensorSnapshot.evChargingKwh,
    isCompleted: true,
  }] : [];

  const recommendations: OptimizationRecommendation[] = [
    ...assessWaterOptimization({ objectId, readings: waterReadings }),
    ...assessMoistureRisk({ objectId, readings: msdReadings }),
    ...assessHeatingOptimization({ objectId, readings: heatingReadings, energyPricePerKwh }),
    ...assessEVChargingOptimization({ objectId, readings: evReadings }),
  ].map(rec => {
    // Audit Hardening: If sensor data is simulated, confidence cannot be TRUST
    if (sensorSnapshot?.sourceMode === 'SIMULATED' && rec.confidence === 'TRUST') {
      return { ...rec, confidence: 'REVIEW' as const };
    }
    return rec;
  }).sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  return {
    objectId,
    generatedAt: new Date().toISOString(),
    recommendations,
    topPriority: recommendations[0] ?? null,
    sensorSource,
  };
}
