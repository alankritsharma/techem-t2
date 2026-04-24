/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CloudRain, Wind, Thermometer } from 'lucide-react';
import { BuildingObject, WeatherProfile } from '../types';
import { fetchWeatherForObject } from '../services/weatherService';
import { cn } from '../lib/utils';

interface Props {
  object: BuildingObject;
}

function formatLocalHour(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function WeatherImpactModule({ object }: Props) {
  const [weather, setWeather] = useState<WeatherProfile | null>(object.weatherProfile ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const next = await fetchWeatherForObject(object);
      if (!cancelled) {
        setWeather(next);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [object.id, object.locationLabel, object.addressOriginal, object.coordinates?.lat, object.coordinates?.lng]);

  const highestRisk = useMemo(() => {
    if (!weather?.forecast?.length) return 'low';
    if (weather.forecast.some((slot) => slot.risk === 'high')) return 'high';
    if (weather.forecast.some((slot) => slot.risk === 'medium')) return 'medium';
    return 'low';
  }, [weather]);

  if (loading || !weather) {
    return (
      <div className="bg-white rounded-xl border border-surface-variant p-6">
        <div className="text-sm font-bold text-on-surface">Loading weather context...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-5 border-b border-surface-variant bg-background/30">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <CloudRain size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-on-surface">Weather Impact</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-outline mt-1">
              {object.name} • {weather.locationMode === 'coordinates' ? 'Validated location' : 'Address-coupled fallback'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Current Temp" value={`${weather.current.temp.toFixed(1)}°C`} icon={<Thermometer size={14} />} />
          <Metric label="Wind" value={`${weather.current.windSpeed.toFixed(0)} km/h`} icon={<Wind size={14} />} />
          <Metric label="Rain Probability" value={`${weather.current.rainProbability.toFixed(0)}%`} icon={<CloudRain size={14} />} />
        </div>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
            Strategy Timeline — Next 24h Risk Visibility
          </div>
          <div className="grid grid-cols-4 gap-3">
            {weather.forecast.map((slot) => (
              <div key={slot.time} className="rounded-xl border border-surface-variant bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
                  {formatLocalHour(slot.time)}
                </div>
                <div className="text-lg font-black text-on-surface">{slot.temp.toFixed(1)}°</div>
                <div className="text-[10px] text-outline mt-1">{slot.rainProbability.toFixed(0)}% rain</div>
                <div
                  className={cn(
                    'mt-2 inline-flex px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest border',
                    slot.risk === 'high'
                      ? 'bg-error-container text-error border-error/30'
                      : slot.risk === 'medium'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  )}
                >
                  {slot.risk}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-surface-variant bg-background p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
            Weather Interpretation
          </div>
          <div className="text-sm font-medium text-on-surface leading-relaxed">
            Highest near-term weather risk is{' '}
            <span className="font-black uppercase">{highestRisk}</span>.{' '}
            {weather.note ?? 'Weather forecast is connected to the active object context.'}
          </div>
        </div>

        {weather.locationMode !== 'coordinates' && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-orange-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-1">
                Review-bound location
              </div>
              <div className="text-sm text-orange-900">
                Weather is currently geocoded from the selected object’s label/address because validated coordinates are still missing.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-background p-4">
      <div className="flex items-center gap-2 text-outline mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-lg font-black text-on-surface">{value}</div>
    </div>
  );
}
