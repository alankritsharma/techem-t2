import { useMemo } from 'react';
import {
  BuildingObject,
  HistoricalDataset,
  HistoricalRecord,
  OptimizationRecommendation,
} from '../types';
import { assessHistoricalTrust } from '../services/historicalTrustService';
import { assessForecastReadiness } from '../services/forecastReadinessService';
import { assessEconomicValue } from '../services/economicValueValidationService';
import { assessEvidenceAuthority } from '../services/evidenceAuthorityService';
import { getMappingByDatasetId } from '../services/mappingStore';

export function useObjectAssessments({
  currentObject,
  historyRecords = [],
  historyDatasets = [],
}: {
  currentObject: BuildingObject | null;
  historyRecords?: HistoricalRecord[];
  historyDatasets?: HistoricalDataset[];
}) {
  const objectDatasets = useMemo(
    () => {
      if (!currentObject) return [];
      return historyDatasets.filter((dataset) => {
        const mapping = getMappingByDatasetId(dataset.id);
        return mapping?.objectId === currentObject.id || dataset.objectId === currentObject.id;
      });
    },
    [historyDatasets, currentObject?.id]
  );

  const objectHistory = useMemo(
    () => {
      if (!currentObject) return [];
      return historyRecords.filter((record) => record.objectId === currentObject.id);
    },
    [historyRecords, currentObject?.id]
  );

  const historicalTrust = useMemo(() => {
    if (!currentObject) return null;
    return assessHistoricalTrust({
      objectId: currentObject.id,
      datasets: objectDatasets,
      records: objectHistory,
    });
  }, [currentObject?.id, objectDatasets, objectHistory]);

  const forecastReadiness = useMemo(() => {
    if (!currentObject || !historicalTrust) return null;
    return assessForecastReadiness({
      object: currentObject,
      records: objectHistory,
      historicalTrust,
    });
  }, [currentObject, objectHistory, historicalTrust]);

  const economicValue = useMemo(() => {
    if (!currentObject || !historicalTrust || !forecastReadiness) return null;
    return assessEconomicValue({
      object: currentObject,
      records: objectHistory,
      trust: historicalTrust,
      readiness: forecastReadiness,
    });
  }, [currentObject, objectHistory, historicalTrust, forecastReadiness]);

  const evidenceAuthority = useMemo(() => {
    if (!currentObject || !historicalTrust || !forecastReadiness) return null;
    return assessEvidenceAuthority({
      object: currentObject,
      datasets: objectDatasets,
      records: objectHistory,
      historicalTrust,
      forecastReadiness,
    });
  }, [currentObject, objectDatasets, objectHistory, historicalTrust, forecastReadiness]);

  return {
    objectDatasets,
    objectHistory,
    historicalTrust,
    forecastReadiness,
    economicValue,
    evidenceAuthority,
  };
}
