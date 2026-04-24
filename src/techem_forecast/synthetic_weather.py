"""Deterministic synthetic weather generation anchored to historical city patterns."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class CityWeatherProfile:
    """Compact set of parameters for deterministic per-city weather generation."""

    city: str
    mean_temp_c: float
    amplitude_c: float
    harmonic_c: float
    phase_shift_days: int
    variation_scale_c: float
    city_seed: int


def build_city_weather_profiles(history: pd.DataFrame) -> dict[str, CityWeatherProfile]:
    """Derive city-specific weather parameters from historical temperature observations."""

    required_columns = {"city", "date", "outside_temp_c"}
    missing = required_columns - set(history.columns)
    if missing:
        missing_names = ", ".join(sorted(missing))
        raise ValueError(f"Weather profile input is missing required columns: {missing_names}")

    source = history.loc[:, ["city", "date", "outside_temp_c"]].dropna().copy()
    if source.empty:
        raise ValueError("Cannot build synthetic weather profiles from an empty history frame")

    source["date"] = pd.to_datetime(source["date"], errors="coerce")
    source["outside_temp_c"] = pd.to_numeric(source["outside_temp_c"], errors="coerce")
    source = source.dropna(subset=["date", "outside_temp_c"])
    source["month"] = source["date"].dt.month

    profiles: dict[str, CityWeatherProfile] = {}
    for city, group in source.groupby("city", sort=True):
        monthly_means = group.groupby("month")["outside_temp_c"].mean()
        mean_temp = float(group["outside_temp_c"].mean())
        amplitude = float((monthly_means.max() - monthly_means.min()) / 2.0) if len(monthly_means) else 8.0
        amplitude = float(np.clip(amplitude, 5.5, 13.5))
        harmonic = float(np.clip(group["outside_temp_c"].std(ddof=0) / 5.0, 0.8, 2.4))
        city_seed = stable_seed(city)
        profiles[city] = CityWeatherProfile(
            city=str(city),
            mean_temp_c=mean_temp,
            amplitude_c=amplitude,
            harmonic_c=harmonic,
            phase_shift_days=int(city_seed % 21) - 10,
            variation_scale_c=float(0.45 + ((city_seed // 101) % 40) / 100.0),
            city_seed=city_seed,
        )

    return profiles


def generate_city_weather_calendar(
    cities: list[str] | pd.Series,
    dates: pd.DatetimeIndex,
    profiles: dict[str, CityWeatherProfile],
) -> pd.DataFrame:
    """Generate deterministic daily weather for each requested city."""

    frames = [generate_weather_for_city(str(city), dates, profiles[str(city)]) for city in sorted(set(cities))]
    if not frames:
        return pd.DataFrame(columns=["date", "city", "outside_temp_c"])
    return pd.concat(frames, ignore_index=True)


def generate_weather_for_city(
    city: str,
    dates: pd.DatetimeIndex,
    profile: CityWeatherProfile,
) -> pd.DataFrame:
    """Generate a full daily weather series for one city."""

    date_index = pd.DatetimeIndex(dates)
    ordinal = np.arange(len(date_index), dtype=float)
    day_of_year = date_index.dayofyear.to_numpy(dtype=float)
    angle = 2.0 * np.pi * (day_of_year - 15.0 - profile.phase_shift_days) / 365.25

    seasonal = profile.mean_temp_c - profile.amplitude_c * np.cos(angle)
    second_harmonic = profile.harmonic_c * np.sin((2.0 * angle) + ((profile.city_seed % 360) * np.pi / 180.0))
    short_cycle = profile.variation_scale_c * np.sin((2.0 * np.pi * ordinal / 17.0) + (profile.city_seed % 23))
    medium_cycle = 0.55 * np.cos((2.0 * np.pi * ordinal / 29.0) + ((profile.city_seed // 11) % 19))
    gentle_year_shift = 0.3 * np.sin(
        (2.0 * np.pi * (date_index.year.to_numpy(dtype=float) - date_index.year.min()) / 5.0)
        + ((profile.city_seed // 97) % 13)
    )

    temperature = seasonal + second_harmonic + short_cycle + medium_cycle + gentle_year_shift
    frame = pd.DataFrame(
        {
            "date": date_index,
            "city": city,
            "outside_temp_c": np.clip(np.round(temperature, 2), -16.0, 35.0),
        }
    )
    return frame


def stable_seed(*parts: object) -> int:
    """Return a deterministic integer seed for any set of scalar identifiers."""

    text = "::".join(str(part) for part in parts)
    digest = sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)
