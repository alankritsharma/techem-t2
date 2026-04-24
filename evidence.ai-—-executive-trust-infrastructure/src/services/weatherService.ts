/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingObject, WeatherProfile } from '../types';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

function clampRisk(rainProbability: number, windSpeed: number) {
  const score = rainProbability + windSpeed * 1.5;
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractCityAndZip(object: BuildingObject) {
  const raw = `${object.locationLabel} ${object.addressOriginal}`;
  const zipMatch = raw.match(/\b\d{5}\b/);
  const city = object.locationLabel || raw.split(',')[0]?.trim() || 'Unknown';
  return {
    city,
    zip: zipMatch?.[0] ?? '',
  };
}

async function geocodeObject(object: BuildingObject): Promise<GeocodeResult | null> {
  const { city, zip } = extractCityAndZip(object);
  const query = [city, zip, 'Germany'].filter(Boolean).join(' ');

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const first = json?.results?.[0];
    if (!first) return null;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      name: first.name,
      country: first.country,
    };
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

function buildFallbackWeather(object: BuildingObject): WeatherProfile {
  const { city } = extractCityAndZip(object);
  const baseTemp = city.toLowerCase().includes('frankfurt') ? 11 : city.toLowerCase().includes('hamburg') ? 8 : 10;
  const now = new Date();

  const forecast = Array.from({ length: 4 }).map((_, index) => {
    const slotTime = new Date(now.getTime() + (index + 1) * 6 * 60 * 60 * 1000);
    const temp = baseTemp + (index % 2 === 0 ? 1 : -1) + index * 0.4;
    const rainProbability = 20 + index * 12;
    const windSpeed = 12 + index * 3;
    return {
      time: slotTime.toISOString(),
      temp,
      rainProbability,
      risk: clampRisk(rainProbability, windSpeed),
    } as const;
  });

  return {
    source: 'mock',
    locationMode: 'unvalidated-address',
    current: {
      temp: forecast[0].temp,
      feelsLike: forecast[0].temp - 1,
      windSpeed: 15,
      humidity: 66,
      rainProbability: forecast[0].rainProbability,
      condition: 'Indicative weather only',
      cloudCover: 55,
    },
    forecast,
    fetchedAt: new Date().toISOString(),
    note: 'Weather is geocoding fallback or mock-based because no validated coordinates were available.',
  };
}

export async function fetchWeatherForObject(object: BuildingObject): Promise<WeatherProfile> {
  let lat = object.coordinates?.lat ?? null;
  let lng = object.coordinates?.lng ?? null;
  let locationMode: WeatherProfile['locationMode'] = object.coordinates ? 'coordinates' : 'unvalidated-address';

  if (lat == null || lng == null) {
    const geocode = await geocodeObject(object);
    if (geocode) {
      lat = geocode.latitude;
      lng = geocode.longitude;
      locationMode = 'unvalidated-address';
    }
  }

  if (lat == null || lng == null) {
    return buildFallbackWeather(object);
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,cloud_cover,wind_speed_10m` +
      `&hourly=temperature_2m,precipitation_probability,wind_speed_10m` +
      `&timezone=auto&forecast_days=2`;

    const response = await fetch(url);
    if (!response.ok) {
      return buildFallbackWeather(object);
    }

    const json = await response.json();
    const hourlyTimes: string[] = json?.hourly?.time ?? [];
    const hourlyTemps: number[] = json?.hourly?.temperature_2m ?? [];
    const hourlyRain: number[] = json?.hourly?.precipitation_probability ?? [];
    const hourlyWind: number[] = json?.hourly?.wind_speed_10m ?? [];

    const forecast = [0, 6, 12, 18]
      .map((hourOffset) => {
        const idx = Math.min(hourOffset, hourlyTimes.length - 1);
        if (idx < 0) return null;
        const rainProbability = Number(hourlyRain[idx] ?? 0);
        const windSpeed = Number(hourlyWind[idx] ?? 0);
        return {
          time: hourlyTimes[idx],
          temp: Number(hourlyTemps[idx] ?? 0),
          rainProbability,
          risk: clampRisk(rainProbability, windSpeed),
        } as const;
      })
      .filter(Boolean) as WeatherProfile['forecast'];

    return {
      source: 'open-meteo',
      locationMode,
      current: {
        temp: Number(json?.current?.temperature_2m ?? average(hourlyTemps.slice(0, 4))),
        feelsLike: Number(json?.current?.apparent_temperature ?? average(hourlyTemps.slice(0, 4))),
        windSpeed: Number(json?.current?.wind_speed_10m ?? average(hourlyWind.slice(0, 4))),
        humidity: Number(json?.current?.relative_humidity_2m ?? 60),
        rainProbability: Number(json?.current?.precipitation_probability ?? hourlyRain[0] ?? 0),
        condition: 'Location-coupled forecast',
        cloudCover: Number(json?.current?.cloud_cover ?? 50),
      },
      forecast,
      fetchedAt: new Date().toISOString(),
      note:
        locationMode === 'coordinates'
          ? 'Forecast based on validated coordinates.'
          : 'Forecast geocoded from object location label and address because validated coordinates were missing.',
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return buildFallbackWeather(object);
  }
}
