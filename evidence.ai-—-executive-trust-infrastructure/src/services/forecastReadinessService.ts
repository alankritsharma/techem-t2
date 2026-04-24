/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BuildingObject,
  ForecastReadinessAssessment,
  HistoricalTrustAssessment,
  HistoricalRecord,
} from '../types';

export function assessForecastReadiness(args: {
  object: BuildingObject;
  records: HistoricalRecord[];
  historicalTrust: HistoricalTrustAssessment;
}) : ForecastReadinessAssessment {
  const { object, records, historicalTrust } = args;
  const reasons: string[] = [];

  if (!object.coordinates) {
    reasons.push('Object coordinates are not validated yet.');
  }

  if (object.validationStatus !== 'TRUST') {
    reasons.push('Object location and validation status are still review-bound.');
  }

  if (historicalTrust.trustStatus === 'HIGH RISK') {
    reasons.push('Historical evidence is currently not reliable enough for forecast use.');
  }

  if (records.length < 30) {
    reasons.push('Historical record count is below preferred forecast baseline.');
  }

  const tempCount = records.filter((record) => Number.isFinite(record.meanOutsideTemperatureC)).length;
  if (tempCount < 20) {
    reasons.push('Too few temperature-linked history points are available.');
  }

  let readinessStatus: ForecastReadinessAssessment['readinessStatus'] = 'READY';
  let requiredNextStep = 'Forecast can be used with normal review discipline.';

  if (reasons.length > 0) {
    readinessStatus = 'REVIEW REQUIRED';
    requiredNextStep = 'Review linked datasets, mapping quality, and object validation before relying on forecast output.';
  }

  if (historicalTrust.trustStatus === 'HIGH RISK' || records.length < 10) {
    readinessStatus = 'NOT READY';
    requiredNextStep = 'Link valid history, confirm mapping, and validate object location before enabling forecast decisions.';
  }

  return {
    objectId: object.id,
    readinessStatus,
    reasons,
    requiredNextStep,
    calculatedAt: new Date().toISOString(),
  };
}
