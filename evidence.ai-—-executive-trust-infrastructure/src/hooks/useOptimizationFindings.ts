/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BuildingObject,
  HistoricalRecord,
  OptimizationRecommendation,
  SensorSnapshot,
  SourceMode,
} from '../types';
import { getSensorSnapshot } from '../services/historyStore';
import { buildOptimizationSnapshot } from '../services/optimizationDecisionService';

export function useOptimizationFindings({
  object,
  historyRecords,
}: {
  object: BuildingObject | null;
  historyRecords: HistoricalRecord[];
}) {
  const [sensorSnapshot, setSensorSnapshot] = useState<SensorSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!object) {
      setSensorSnapshot(null);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const snap = await getSensorSnapshot(object.id);
        setSensorSnapshot(snap);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [object?.id]);

  const snapshot = useMemo(() => {
    if (!object) return null;

    return buildOptimizationSnapshot({
      objectId: object.id,
      sensorSnapshot,
      energyPricePerKwh: 0.12, // Standard price baseline
    });
  }, [object?.id, sensorSnapshot]);

  const findings = useMemo(() => {
    return snapshot?.recommendations ?? [];
  }, [snapshot]);

  return {
    sensorSnapshot,
    snapshot,
    findings,
    sourceMode: snapshot?.sensorSource ?? 'FALLBACK',
    loading,
  };
}
