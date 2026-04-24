/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { 
  Calendar, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  History,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BuildingObject, HistoricalRecord, HistoryChartPoint } from '../types';

interface HistoricalConsumptionModuleProps {
  object: BuildingObject;
  historyRecords: HistoricalRecord[];
}

type ViewMode = 'day' | 'week' | 'month';

export function HistoricalConsumptionModule({
  object,
  historyRecords,
}: HistoricalConsumptionModuleProps) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');

  const records = useMemo(() => {
    return historyRecords.filter((r) => r.objectId === object.id);
  }, [historyRecords, object.id]);

  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    const grouped = records.reduce<Record<string, any>>((acc, r) => {
      const date = r.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          energyUsageKwh: 0,
          meanOutsideTemperatureC: 0,
          count: 0,
          co2EmissionsG: 0,
          kwhPerM2: 0,
        };
      }

      acc[date].energyUsageKwh += safeNumber(r.energyUsageKwh);
      acc[date].meanOutsideTemperatureC += safeNumber(r.meanOutsideTemperatureC);
      acc[date].co2EmissionsG += safeNumber(r.co2EmissionsG);
      acc[date].kwhPerM2 += safeNumber(r.kwhPerM2);
      acc[date].count += 1;

      return acc;
    }, {});

    const sorted = Object.values(grouped)
      .map((g: any) => ({
        ...g,
        energyUsageKwh: Number(g.energyUsageKwh.toFixed(2)),
        meanOutsideTemperatureC: Number((g.meanOutsideTemperatureC / Math.max(g.count, 1)).toFixed(2)),
        co2EmissionsG: Number(g.co2EmissionsG.toFixed(2)),
        kwhPerM2: Number((g.kwhPerM2 / Math.max(g.count, 1)).toFixed(4)),
      }))
      .sort((a: any, b: any) => Date.parse(a.date) - Date.parse(b.date)) as HistoryChartPoint[];

    if (view === 'day') return sorted;

    return aggregateData(sorted, view);
  }, [records, view]);

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const totalKwh = records.reduce((sum, r) => sum + safeNumber(r.energyUsageKwh), 0);
    const avgTemp =
      records.reduce((sum, r) => sum + safeNumber(r.meanOutsideTemperatureC), 0) /
      Math.max(records.length, 1);
    const avgKwhPerM2 =
      records.reduce((sum, r) => sum + safeNumber(r.kwhPerM2), 0) /
      Math.max(records.length, 1);

    const tempValues = records.map((r) => safeNumber(r.meanOutsideTemperatureC));
    const usageValues = records.map((r) => safeNumber(r.energyUsageKwh));
    const tempUsageCorrelation = Math.abs(correlation(tempValues, usageValues));

    return {
      totalKwh,
      avgTemp,
      avgKwhPerM2,
      tempUsageCorrelation,
    };
  }, [records]);

  const energyMax = useMemo(() => {
    const max = Math.max(...chartData.map((d) => safeNumber(d.energyUsageKwh)), 1);
    return Math.ceil(max * 1.12);
  }, [chartData]);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-surface-variant p-10 flex flex-col items-center justify-center text-center h-[500px]">
        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6">
          <Database className="text-outline" size={32} />
        </div>
        <h3 className="text-lg font-bold text-on-surface">No historical evidence linked yet</h3>
        <p className="text-sm text-outline mt-2 max-w-sm mx-auto">
          Upload CSV datasets in the Strategy view and link them to this object to unlock historical analysis and baseline validation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-surface-variant shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-surface-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Historical Consumption & Context</h2>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider mt-1">
              Dual-axis energy and weather evidence
            </p>
          </div>
        </div>

        <div className="flex items-center bg-background p-1 rounded-xl border border-surface-variant">
          <ViewToggle active={view === 'day'} onClick={() => setView('day')} label="Day" />
          <ViewToggle active={view === 'week'} onClick={() => setView('week')} label="Week" />
          <ViewToggle active={view === 'month'} onClick={() => setView('month')} label="Month" />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 12, bottom: 16 }}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-surface-variant)"
                />

                <XAxis
                  dataKey="date"
                  fontSize={10}
                  fontWeight={700}
                  tickFormatter={(val) => formatDate(val, view)}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />

                <YAxis
                  yAxisId="energy"
                  orientation="left"
                  domain={[0, energyMax]}
                  allowDecimals={false}
                  fontSize={10}
                  fontWeight={700}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(val) => `${Number(val).toLocaleString()} kWh`}
                />

                <YAxis
                  yAxisId="temperature"
                  orientation="right"
                  domain={[-15, 40]}
                  ticks={[-15, -5, 5, 15, 25, 35, 40]}
                  fontSize={10}
                  fontWeight={700}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(val) => `${val}°C`}
                />

                <Tooltip
                  content={<HistoricalTooltip />}
                  cursor={{ stroke: 'var(--color-outline-variant)', strokeWidth: 1 }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    paddingBottom: '20px',
                  }}
                />

                <Area
                  yAxisId="energy"
                  type="monotone"
                  dataKey="energyUsageKwh"
                  name="Energy"
                  stroke="var(--color-primary)"
                  fillOpacity={1}
                  fill="url(#colorEnergy)"
                  strokeWidth={3}
                  unit=" kWh"
                  isAnimationActive={false}
                />

                <Line
                  yAxisId="temperature"
                  type="monotone"
                  dataKey="meanOutsideTemperatureC"
                  name="Outside Temperature"
                  stroke="var(--color-secondary)"
                  strokeWidth={2}
                  dot={false}
                  unit=" °C"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <HistoryStatCard
            label="Total Evidence"
            value={`${Math.round(stats?.totalKwh || 0).toLocaleString()} kWh`}
            detail="Sum of historical records"
            icon={<Activity size={14} className="text-primary" />}
          />

          <HistoryStatCard
            label="Mean Temperature"
            value={`${stats?.avgTemp.toFixed(1)} °C`}
            detail="Historical period average"
            icon={<TrendingUp size={14} className="text-secondary" />}
          />

          <HistoryStatCard
            label="Spec. Consumption"
            value={`${stats?.avgKwhPerM2.toFixed(2)} kWh/m²`}
            detail="Record-level normalized baseline"
            icon={<ArrowUpRight size={14} className="text-green-600" />}
          />

          <div className="mt-auto bg-background rounded-2xl p-5 border border-surface-variant/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-orange-500" />
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Decision Logic
              </span>
            </div>
            <p className="text-[11px] font-bold text-on-surface leading-snug">
              Temperature-to-energy correlation is{' '}
              {stats && stats.tempUsageCorrelation >= 0.55
                ? 'HIGH'
                : stats && stats.tempUsageCorrelation >= 0.3
                ? 'MODERATE'
                : 'WEAK'}
              . Forecast trust should reflect this relationship instead of using a single shared axis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoricalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const energy = payload.find((p: any) => p.dataKey === 'energyUsageKwh');
  const temp = payload.find((p: any) => p.dataKey === 'meanOutsideTemperatureC');

  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-lg p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">
        {label}
      </div>

      {energy && (
        <div className="text-sm font-bold text-on-surface">
          Energy: {Number(energy.value).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh
        </div>
      )}

      {temp && (
        <div className="text-sm font-bold text-on-surface">
          Outside Temperature: {Number(temp.value).toFixed(1)} °C
        </div>
      )}
    </div>
  );
}

function HistoryStatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-background/40 rounded-2xl p-4 border border-surface-variant/50 hover:border-primary transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[9px] font-bold text-outline uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="text-xl font-black text-on-surface tracking-tight group-hover:text-primary transition-colors">
        {value}
      </div>
      <div className="text-[10px] font-medium text-outline mt-1">{detail}</div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
        active ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-on-surface'
      )}
    >
      {label}
    </button>
  );
}

function formatDate(dateStr: string, view: ViewMode) {
  const date = new Date(dateStr);

  if (view === 'month') {
    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
  }

  if (view === 'week') {
    return `W${getIsoWeek(date)}`;
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function getIsoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function aggregateData(sorted: HistoryChartPoint[], view: 'week' | 'month'): HistoryChartPoint[] {
  const result: Record<string, any> = {};

  sorted.forEach((p) => {
    const d = new Date(p.date);
    let key = '';

    if (view === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      key = `${d.getFullYear()}-W${String(getIsoWeek(d)).padStart(2, '0')}`;
    }

    if (!result[key]) {
      result[key] = {
        date: key,
        energyUsageKwh: 0,
        meanOutsideTemperatureC: 0,
        count: 0,
        co2EmissionsG: 0,
        kwhPerM2: 0,
      };
    }

    result[key].energyUsageKwh += safeNumber(p.energyUsageKwh);
    result[key].meanOutsideTemperatureC += safeNumber(p.meanOutsideTemperatureC);
    result[key].co2EmissionsG += safeNumber(p.co2EmissionsG);
    result[key].kwhPerM2 += safeNumber(p.kwhPerM2);
    result[key].count += 1;
  });

  return Object.values(result)
    .map((g: any) => ({
      ...g,
      energyUsageKwh: Number(g.energyUsageKwh.toFixed(2)),
      meanOutsideTemperatureC: Number((g.meanOutsideTemperatureC / Math.max(g.count, 1)).toFixed(2)),
      co2EmissionsG: Number(g.co2EmissionsG.toFixed(2)),
      kwhPerM2: Number((g.kwhPerM2 / Math.max(g.count, 1)).toFixed(4)),
    }))
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date))) as HistoryChartPoint[];
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function correlation(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const xMean = xs.reduce((s, v) => s + v, 0) / xs.length;
  const yMean = ys.reduce((s, v) => s + v, 0) / ys.length;

  let numerator = 0;
  let xDen = 0;
  let yDen = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const xd = xs[i] - xMean;
    const yd = ys[i] - yMean;
    numerator += xd * yd;
    xDen += xd * xd;
    yDen += yd * yd;
  }

  if (xDen === 0 || yDen === 0) return 0;
  return numerator / Math.sqrt(xDen * yDen);
}
