/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { BuildingObject, HistoricalRecord, SevenDayEnergyPoint } from '../types';

interface Props {
  object: BuildingObject;
  records: HistoricalRecord[];
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
}

function inferSevenDayPoints(object: BuildingObject, records: HistoricalRecord[]): SevenDayEnergyPoint[] {
  const temps = records.map((r) => r.meanOutsideTemperatureC).filter((v) => Number.isFinite(v));
  const energy = records.map((r) => r.energyUsageKwh).filter((v) => Number.isFinite(v));
  const avgTemp = mean(temps) || 10;
  const avgEnergy = mean(energy) || 18;
  const emissionFactorKg = mean(records.map((r) => r.emissionFactorGPerKwh).filter((v) => Number.isFinite(v)).map((v) => v / 1000)) || 0.22;
  const costPerKwh = 0.14;

  const weatherForecast = object.weatherProfile?.forecast ?? [];

  return Array.from({ length: 7 }).map((_, index) => {
    // Audit Hardening: Use real forecast data if available, otherwise fallback to historical mean drift
    const forecastPoint = weatherForecast[index];
    const tempMeanC = forecastPoint ? forecastPoint.temp : (avgTemp + ((index % 3) - 1) * 1.4);
    
    const temperatureFactor = 
      tempMeanC < 5 ? 1.25 :
      tempMeanC < 10 ? 1.12 :
      1.0;

    const predictedEnergyKwh = Math.max(5, avgEnergy * temperatureFactor);
    const predictedCostEur = predictedEnergyKwh * costPerKwh;
    const predictedCo2Kg = predictedEnergyKwh * emissionFactorKg;

    let trust: SevenDayEnergyPoint['trust'] = 'TRUST';
    if (!object.coordinates || records.length < 30 || !forecastPoint) trust = 'REVIEW';
    if (records.length < 10) trust = 'HIGH RISK';

    return {
      date: dayLabel(index + 1),
      tempMeanC: Number(tempMeanC.toFixed(1)),
      predictedEnergyKwh: Number(predictedEnergyKwh.toFixed(1)),
      predictedCostEur: Number(predictedCostEur.toFixed(2)),
      predictedCo2Kg: Number(predictedCo2Kg.toFixed(2)),
      trust,
    };
  });
}

export function SevenDayEnergyOutlook({ object, records }: Props) {
  const points = useMemo(() => inferSevenDayPoints(object, records), [object.id, object.coordinates?.lat, object.coordinates?.lng, records]);
  const totalCost = useMemo(() => points.reduce((sum, p) => sum + p.predictedCostEur, 0).toFixed(2), [points]);
  const totalEnergy = useMemo(() => points.reduce((sum, p) => sum + p.predictedEnergyKwh, 0).toFixed(1), [points]);

  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="text-lg font-bold text-on-surface">Seven-Day Energy Outlook</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
          Derived from active object history and weather-adjusted short-term projection
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ececec" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="energy" tick={{ fontSize: 10, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 10, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line yAxisId="energy" type="monotone" dataKey="predictedEnergyKwh" stroke="#002045" strokeWidth={3} dot />
              <Line yAxisId="temp" type="monotone" dataKey="tempMeanC" stroke="#adc7f7" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="7d Energy" value={`${totalEnergy} kWh`} />
            <Metric label="7d Cost" value={`€${totalCost}`} />
          </div>
          <div className="h-[160px] rounded-xl border border-surface-variant bg-background p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ececec" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#74777f', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="predictedCostEur" fill="#adc7f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-surface-variant bg-background p-4 text-sm text-on-surface leading-relaxed">
            This outlook is object-bound. It reacts to the selected object’s linked historical records and becomes review-bound if object location or evidence depth is weak.
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-background p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">{label}</div>
      <div className="text-lg font-black text-on-surface">{value}</div>
    </div>
  );
}
