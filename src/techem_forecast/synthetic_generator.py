"""Synthetic smart-building extension generation for Techem unit histories."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .data_loader import load_dataset
from .preprocess import prepare_daily_data
from .synthetic_weather import build_city_weather_profiles, generate_city_weather_calendar, stable_seed

DEFAULT_START_DATE = "2021-01-01"
DEFAULT_END_DATE = "2026-04-24"
DEFAULT_SEED = 20260424
PARQUET_NAME = "unit_daily_extended_2021_2026.parquet"
CSV_NAME = "unit_daily_extended_2021_2026.csv"

HEATING_MODE_OFF = "off"
HEATING_MODE_ECO = "eco"
HEATING_MODE_COMFORT = "comfort"
HEATING_MODE_BOOST = "boost"


@dataclass
class SyntheticGenerationConfig:
    dataset_dir: str = "dataset"
    output_dir: str = "outputs/synthetic"
    start_date: str = DEFAULT_START_DATE
    end_date: str = DEFAULT_END_DATE
    seed: int = DEFAULT_SEED


def generate_synthetic_extension(config: SyntheticGenerationConfig) -> dict[str, object]:
    """Generate and persist the synthetic smart-building extension dataset."""

    raw = load_dataset(config.dataset_dir)
    unit_history = prepare_daily_data(raw, grain="unit")
    metadata = build_unit_metadata(unit_history, seed=config.seed)

    start_date = pd.Timestamp(config.start_date)
    end_date = pd.Timestamp(config.end_date)
    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date")

    dates = pd.date_range(start_date, end_date, freq="D")
    weather_profiles = build_city_weather_profiles(raw)
    weather = generate_city_weather_calendar(metadata["city"].tolist(), dates, weather_profiles)
    weather_by_city = {city: frame.reset_index(drop=True) for city, frame in weather.groupby("city", sort=False)}

    frames = []
    for record in metadata.to_dict(orient="records"):
        city_weather = weather_by_city[str(record["city"])].copy()
        frames.append(_generate_unit_daily_series(record, city_weather, dates))

    synthetic = (
        pd.concat(frames, ignore_index=True)
        .sort_values(["property_id", "unit_number", "date"])
        .reset_index(drop=True)
    )
    synthetic["synthetic_source_flag"] = 1
    synthetic["synthetic_seed"] = synthetic["synthetic_seed"].astype(np.int64)

    output_info = write_synthetic_outputs(synthetic, config.output_dir)
    summary = summarize_synthetic_dataset(synthetic)
    summary["config"] = asdict(config)
    summary["output_paths"] = output_info

    return {
        "synthetic_dataset": synthetic,
        "summary": summary,
        "output_paths": output_info,
    }


def build_unit_metadata(unit_history: pd.DataFrame, seed: int = DEFAULT_SEED) -> pd.DataFrame:
    """Create stable unit metadata and anchored behavioral parameters from history."""

    history = unit_history.sort_values(["series_id", "date"]).copy()
    history["date"] = pd.to_datetime(history["date"], errors="coerce")
    history["energy_filled"] = history.groupby("series_id", sort=False)["energy_usage_kwh"].transform(
        _fill_series
    )
    history["month"] = history["date"].dt.month
    history["weekday"] = history["date"].dt.dayofweek
    history["day_of_year"] = history["date"].dt.dayofyear
    history["heating_degree_days"] = np.maximum(0.0, 18.0 - history["outside_temp_c"].astype(float))

    latest = history.groupby("series_id", as_index=False).tail(1).copy()
    metadata_rows: list[dict[str, object]] = []

    for unit_id, group in history.groupby("series_id", sort=False):
        static = latest.loc[latest["series_id"] == unit_id].iloc[0]
        space = float(static["living_space_m2"])
        rooms = int(float(static["room_count"]))
        unit_seed = stable_seed(seed, unit_id)

        energy = group["energy_filled"].to_numpy(dtype=float)
        hdd = group["heating_degree_days"].to_numpy(dtype=float)
        observed = group["energy_usage_kwh"].notna().to_numpy()

        valid_energy = energy[observed] if observed.any() else energy
        valid_hdd = hdd[observed] if observed.any() else hdd

        structural_base = (0.028 * space) + (0.24 * rooms)
        structural_slope = (0.0115 * space) + (0.15 * rooms)
        summer_mean = _season_mean(group, months=[6, 7, 8], default=valid_energy.mean())
        regression = _fit_linear(valid_hdd, valid_energy)
        regression_intercept = max(0.25, regression["intercept"])
        regression_slope = max(0.0, regression["slope"])

        base_load = float(np.clip((0.55 * summer_mean) + (0.45 * structural_base), 0.35, None))
        heating_slope = float(
            np.clip((0.6 * regression_slope) + (0.4 * structural_slope), 0.18, max(8.5, structural_slope * 2.0))
        )
        weekday_factors = _weekday_factors(group, valid_energy.mean())
        doy_profile = _day_of_year_profile(group)
        occupancy_base = float(
            np.clip(
                0.18 + (0.05 * min(rooms, 6)) + (0.0012 * space) + (((unit_seed // 17) % 9) - 4) * 0.015,
                0.12,
                0.86,
            )
        )
        yearly_trend = (((unit_seed // 103) % 9) - 4) * 0.003

        metadata_rows.append(
            {
                "series_id": unit_id,
                "property_id": str(static["property_id"]),
                "unit_id": str(static["unit_id"]),
                "unit_number": int(static["unit_number"]),
                "zipcode": str(static["zipcode"]),
                "city": str(static["city"]),
                "energy_source": str(static["energy_source"]),
                "living_space_m2": space,
                "room_count": rooms,
                "emission_factor_g_per_kwh": float(static["emission_factor_g_per_kwh"]),
                "hist_mean_energy_kwh": float(valid_energy.mean()),
                "hist_peak_energy_kwh": float(valid_energy.max()),
                "base_load_kwh": base_load,
                "heating_slope_kwh_per_hdd": heating_slope,
                "weekday_factors": weekday_factors.tolist(),
                "day_of_year_profile": doy_profile.tolist(),
                "occupancy_base": occupancy_base,
                "yearly_trend": yearly_trend,
                "unit_seed": int(unit_seed % (2**31 - 1)),
            }
        )

    return pd.DataFrame(metadata_rows).sort_values(["property_id", "unit_number"]).reset_index(drop=True)


def summarize_synthetic_dataset(df: pd.DataFrame) -> dict[str, object]:
    """Return a concise generation summary for reporting and validation."""

    ranges = {}
    for column in [
        "energy_usage_kwh",
        "outside_temp_c",
        "room_temperature_c",
        "heater_setpoint_c",
        "radiator_valve_open_pct",
        "humidity_pct",
        "occupancy_proxy",
        "window_open_risk",
        "heating_degree_days",
    ]:
        ranges[column] = {
            "min": float(df[column].min()),
            "max": float(df[column].max()),
        }

    return {
        "row_count": int(len(df)),
        "property_count": int(df["property_id"].nunique()),
        "unit_count": int(df["unit_id"].nunique()),
        "start_date": df["date"].min().date().isoformat(),
        "end_date": df["date"].max().date().isoformat(),
        "feature_ranges": ranges,
        "temperature_energy_correlation": float(df["outside_temp_c"].corr(df["energy_usage_kwh"])),
    }


def write_synthetic_outputs(df: pd.DataFrame, output_dir: str | Path) -> dict[str, str]:
    """Write the synthetic dataset, preferring Parquet and falling back to CSV."""

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    parquet_path = output_path / PARQUET_NAME
    csv_path = output_path / CSV_NAME
    written: dict[str, str] = {}

    try:
        df.to_parquet(parquet_path, index=False)
        written["dataset"] = str(parquet_path.resolve())
    except (ImportError, ModuleNotFoundError, ValueError, AttributeError):
        df.to_csv(csv_path, index=False)
        written["dataset"] = str(csv_path.resolve())
        written["fallback_reason"] = "Parquet engine unavailable in the local Python runtime"

    return written


def _generate_unit_daily_series(
    meta: dict[str, object],
    city_weather: pd.DataFrame,
    dates: pd.DatetimeIndex,
) -> pd.DataFrame:
    date_index = pd.DatetimeIndex(dates)
    ordinal = np.arange(len(date_index), dtype=float)
    day_of_year = date_index.dayofyear.to_numpy(dtype=int)
    weekday = date_index.dayofweek.to_numpy(dtype=int)
    month = date_index.month.to_numpy(dtype=int)
    is_weekend = (weekday >= 5).astype(int)
    outside_temp = city_weather["outside_temp_c"].to_numpy(dtype=float)
    hdd = np.maximum(0.0, 18.0 - outside_temp)

    base_load = float(meta["base_load_kwh"])
    heating_slope = float(meta["heating_slope_kwh_per_hdd"])
    hist_mean_energy = max(0.5, float(meta["hist_mean_energy_kwh"]))
    occupancy_base = float(meta["occupancy_base"])
    unit_seed = int(meta["unit_seed"])
    year_offset = date_index.year.to_numpy(dtype=float) - float(date_index.year.min())

    weekday_factors = np.take(np.asarray(meta["weekday_factors"], dtype=float), weekday)
    doy_profile = np.take(np.asarray(meta["day_of_year_profile"], dtype=float), np.minimum(day_of_year, 366) - 1)
    seasonal_factor = 0.72 + (0.28 * doy_profile)
    year_factor = 1.0 + (float(meta["yearly_trend"]) * (year_offset / max(1.0, year_offset.max())))

    occupancy = np.clip(
        occupancy_base
        + (0.07 * is_weekend)
        + (0.035 * np.isin(month, [12, 1, 2]).astype(float))
        + (0.045 * np.sin((2.0 * np.pi * ordinal / 14.0) + (unit_seed % 11)))
        + (0.03 * np.cos((2.0 * np.pi * ordinal / 91.0) + ((unit_seed // 7) % 13))),
        0.05,
        1.0,
    )

    demand_core = (base_load + (heating_slope * hdd)) * seasonal_factor * weekday_factors * year_factor
    demand_core = np.maximum(demand_core, base_load * 0.8)

    mode_score = hdd + (6.0 * occupancy) + (1.0 * is_weekend)
    heating_mode = np.full(len(date_index), HEATING_MODE_COMFORT, dtype=object)
    heating_mode[(mode_score < 4.0) & (outside_temp >= 16.0)] = HEATING_MODE_OFF
    heating_mode[(mode_score >= 4.0) & (mode_score < 9.0)] = HEATING_MODE_ECO
    heating_mode[(mode_score >= 9.0) & (mode_score < 18.0)] = HEATING_MODE_COMFORT
    heating_mode[mode_score >= 18.0] = HEATING_MODE_BOOST

    mode_level = np.select(
        [
            heating_mode == HEATING_MODE_OFF,
            heating_mode == HEATING_MODE_ECO,
            heating_mode == HEATING_MODE_COMFORT,
            heating_mode == HEATING_MODE_BOOST,
        ],
        [0.0, 0.45, 1.0, 1.4],
        default=1.0,
    )

    mode_setpoint_bias = np.select(
        [
            heating_mode == HEATING_MODE_OFF,
            heating_mode == HEATING_MODE_ECO,
            heating_mode == HEATING_MODE_COMFORT,
            heating_mode == HEATING_MODE_BOOST,
        ],
        [-0.95, -0.4, 0.1, 0.6],
        default=0.0,
    )
    setpoint = np.clip(
        19.55
        + (1.2 * mode_level)
        + (1.0 * (occupancy - 0.5))
        + (0.24 * np.sin((2.0 * np.pi * ordinal / 9.0) + ((unit_seed // 5) % 7)))
        + (0.12 * np.cos((2.0 * np.pi * ordinal / 27.0) + ((unit_seed // 43) % 19))),
        18.1,
        24.2,
    ) + mode_setpoint_bias
    setpoint = np.clip(
        setpoint,
        18.1,
        24.2,
    )

    valve = np.clip(
        6.0
        + (3.2 * hdd)
        + (14.0 * mode_level)
        + (8.0 * (setpoint - 19.0))
        + (4.5 * (occupancy - 0.5))
        + (5.0 * np.sin((2.0 * np.pi * ordinal / 13.0) + ((unit_seed // 13) % 11))),
        0.0,
        100.0,
    )

    mode_room_bias = np.select(
        [
            heating_mode == HEATING_MODE_OFF,
            heating_mode == HEATING_MODE_ECO,
            heating_mode == HEATING_MODE_COMFORT,
            heating_mode == HEATING_MODE_BOOST,
        ],
        [-1.45, -0.75, 0.15, 0.95],
        default=0.5,
    )
    preliminary_room_temp = (
        9.45
        + (0.47 * setpoint)
        + (0.09 * outside_temp)
        + (0.8 * (occupancy - 0.5))
        + mode_room_bias
        + (0.22 * np.sin((2.0 * np.pi * ordinal / 15.0) + ((unit_seed // 37) % 17)))
        - (0.012 * np.maximum(valve - 92.0, 0.0))
    )
    window_open_risk = np.clip(
        0.12
        + (0.36 * occupancy)
        + (0.09 * np.isin(month, [4, 5, 9, 10]).astype(float))
        + (0.12 * np.maximum(preliminary_room_temp - 21.0, 0.0))
        - (0.015 * hdd)
        + (0.05 * np.cos((2.0 * np.pi * ordinal / 16.0) + ((unit_seed // 19) % 17))),
        0.0,
        1.0,
    )

    tiny_unit_correction = np.where(float(meta["living_space_m2"]) < 10.0, 0.35, 0.0)
    room_temperature = np.clip(
        preliminary_room_temp - (0.72 * window_open_risk) + tiny_unit_correction,
        16.0,
        25.0,
    )
    humidity = np.clip(
        47.0
        - (1.25 * (room_temperature - 20.0))
        - (0.3 * (outside_temp - 10.0))
        + (9.0 * window_open_risk)
        + (2.4 * np.sin((2.0 * np.pi * ordinal / 21.0) + ((unit_seed // 29) % 13))),
        28.0,
        68.0,
    )

    mild_sensor_adjustment = np.clip(
        1.0
        + (0.0013 * (valve - 50.0))
        + (0.013 * (setpoint - 20.0))
        + (0.018 * (occupancy - 0.5))
        - (0.015 * window_open_risk),
        0.9,
        1.12,
    )
    deterministic_residual = 1.0 + (
        0.045 * np.sin((2.0 * np.pi * ordinal / 11.0) + ((unit_seed // 31) % 17))
    ) + (0.02 * np.cos((2.0 * np.pi * ordinal / 37.0) + ((unit_seed // 41) % 19)))
    size_safety_floor = 0.02 * max(float(meta["living_space_m2"]), 10.0) + (0.2 * float(meta["room_count"]))
    energy_usage = np.maximum(
        demand_core * mild_sensor_adjustment * deterministic_residual,
        size_safety_floor,
    )

    result = pd.DataFrame(
        {
            "date": date_index,
            "property_id": str(meta["property_id"]),
            "unit_id": str(meta["unit_id"]),
            "unit_number": int(meta["unit_number"]),
            "zipcode": str(meta["zipcode"]),
            "city": str(meta["city"]),
            "energy_source": str(meta["energy_source"]),
            "living_space_m2": float(meta["living_space_m2"]),
            "room_count": int(meta["room_count"]),
            "emission_factor_g_per_kwh": float(meta["emission_factor_g_per_kwh"]),
            "energy_usage_kwh": np.round(energy_usage, 3),
            "outside_temp_c": np.round(outside_temp, 2),
            "day_of_year": day_of_year.astype(int),
            "month": month.astype(int),
            "is_weekend": is_weekend.astype(int),
            "heating_degree_days": np.round(hdd, 3),
            "room_temperature_c": np.round(room_temperature, 3),
            "heater_setpoint_c": np.round(setpoint, 3),
            "radiator_valve_open_pct": np.round(valve, 3),
            "humidity_pct": np.round(humidity, 3),
            "occupancy_proxy": np.round(occupancy, 4),
            "window_open_risk": np.round(window_open_risk, 4),
            "heating_mode": heating_mode,
            "synthetic_seed": int(unit_seed),
        }
    )

    expected_columns = [
        "date",
        "property_id",
        "unit_id",
        "unit_number",
        "zipcode",
        "city",
        "energy_source",
        "living_space_m2",
        "room_count",
        "emission_factor_g_per_kwh",
        "energy_usage_kwh",
        "room_temperature_c",
        "heater_setpoint_c",
        "radiator_valve_open_pct",
        "humidity_pct",
        "occupancy_proxy",
        "window_open_risk",
        "heating_mode",
        "outside_temp_c",
        "day_of_year",
        "month",
        "is_weekend",
        "heating_degree_days",
        "synthetic_seed",
    ]
    return result.loc[:, expected_columns]


def _fill_series(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.notna().any():
        return numeric.interpolate(limit_direction="both").ffill().bfill()
    return pd.Series(np.zeros(len(series), dtype=float), index=series.index)


def _season_mean(group: pd.DataFrame, months: list[int], default: float) -> float:
    season = group.loc[group["month"].isin(months), "energy_filled"]
    if season.notna().any():
        return float(season.mean())
    return float(default)


def _fit_linear(x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    if len(x) < 2:
        return {"intercept": float(np.nanmean(y)), "slope": 0.0}
    design = np.column_stack([np.ones(len(x)), x])
    coeffs, _, _, _ = np.linalg.lstsq(design, y, rcond=None)
    return {"intercept": float(coeffs[0]), "slope": float(coeffs[1])}


def _weekday_factors(group: pd.DataFrame, overall_mean: float) -> np.ndarray:
    factors = np.ones(7, dtype=float)
    if overall_mean <= 0:
        return factors
    weekday_means = group.groupby("weekday")["energy_filled"].mean()
    for day in range(7):
        mean_value = weekday_means.get(day, overall_mean)
        factors[day] = float(np.clip(mean_value / overall_mean, 0.88, 1.12))
    return factors


def _day_of_year_profile(group: pd.DataFrame) -> np.ndarray:
    daily = group.loc[group["date"].dt.year == group["date"].dt.year.max(), ["date", "energy_filled"]].copy()
    if daily.empty:
        daily = group.loc[:, ["date", "energy_filled"]].copy()
    daily = daily.sort_values("date")
    smoothed = daily["energy_filled"].rolling(window=21, center=True, min_periods=5).mean()
    smoothed = smoothed.bfill().ffill()
    overall = max(0.1, float(smoothed.mean()))

    profile = np.ones(366, dtype=float)
    for day, value in zip(daily["date"].dt.dayofyear.to_numpy(dtype=int), smoothed.to_numpy(dtype=float)):
        profile[min(day, 366) - 1] = np.clip(value / overall, 0.65, 1.5)

    for index in range(366):
        if profile[index] == 1.0 and index > 0:
            profile[index] = profile[index - 1]
    return profile
