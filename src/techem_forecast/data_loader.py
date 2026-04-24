"""Data loading utilities for raw challenge CSVs, modeled daily histories, and weather inputs."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .schemas import NUMERIC_COLUMNS, normalize_columns, require_valid_schema


def load_property_csv(path: str | Path) -> pd.DataFrame:
    """Load one raw property CSV and attach a property_id derived from the file name."""

    csv_path = Path(path)
    df = pd.read_csv(csv_path)
    df["property_id"] = csv_path.stem
    df = normalize_columns(df)
    require_valid_schema(df)
    return _coerce_types(df)


def load_dataset(dataset_dir: str | Path) -> pd.DataFrame:
    """Load all property CSVs from a directory."""

    dataset_path = Path(dataset_dir)
    files = sorted(dataset_path.glob("property_*.csv"), key=_property_sort_key)
    if not files:
        raise FileNotFoundError(f"No property_*.csv files found in {dataset_path}")
    frames = [load_property_csv(path) for path in files]
    return pd.concat(frames, ignore_index=True)


def load_daily_history(path: str | Path) -> pd.DataFrame:
    """Load a pre-aggregated daily unit/property history from CSV or Parquet."""

    history_path = Path(path)
    if not history_path.exists():
        raise FileNotFoundError(f"Daily history file not found: {history_path}")

    if history_path.suffix.lower() == ".parquet":
        df = pd.read_parquet(history_path)
    else:
        df = pd.read_csv(history_path)

    df = normalize_columns(df)
    return _coerce_daily_history(df)


def load_future_weather(path: str | Path | None) -> pd.DataFrame | None:
    """Load optional future weather CSV.

    Expected columns after normalization:
    - date
    - outside_temp_c
    - optionally property_id, unit_id, zipcode, city
    """

    if path is None:
        return None
    weather = pd.read_csv(path)
    weather = normalize_columns(weather)
    if "date" not in weather.columns or "outside_temp_c" not in weather.columns:
        raise ValueError("Future weather CSV must include date and outside_temp_c columns")
    weather["date"] = pd.to_datetime(weather["date"], errors="coerce")
    weather["outside_temp_c"] = pd.to_numeric(weather["outside_temp_c"], errors="coerce")
    return weather.dropna(subset=["date", "outside_temp_c"])


def _coerce_types(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    for column in NUMERIC_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df["zipcode"] = df["zipcode"].astype(str)
    df["city"] = df["city"].astype(str)
    df["energy_source"] = df["energy_source"].astype(str)
    df["property_id"] = df["property_id"].astype(str)
    invalid_dates = df["date"].isna().sum()
    if invalid_dates:
        raise ValueError(f"Found {invalid_dates} rows with invalid dates")
    return df


def _coerce_daily_history(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    required = {
        "date",
        "property_id",
        "energy_usage_kwh",
        "living_space_m2",
        "outside_temp_c",
        "room_count",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Daily history is missing required columns: {', '.join(missing)}")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    invalid_dates = df["date"].isna().sum()
    if invalid_dates:
        raise ValueError(f"Found {invalid_dates} rows with invalid dates in daily history")

    string_columns = ["property_id", "unit_id", "zipcode", "city", "energy_source", "heating_mode"]
    for column in string_columns:
        if column in df.columns:
            df[column] = df[column].fillna("").astype(str)

    numeric_candidates = [
        "unit_number",
        "energy_usage_kwh",
        "living_space_m2",
        "outside_temp_c",
        "room_count",
        "emission_factor_g_per_kwh",
        "room_temperature_c",
        "heater_setpoint_c",
        "radiator_valve_open_pct",
        "humidity_pct",
        "occupancy_proxy",
        "window_open_risk",
        "day_of_year",
        "month",
        "is_weekend",
        "heating_degree_days",
        "synthetic_seed",
        "synthetic_source_flag",
        "is_missing_observation",
    ]
    for column in numeric_candidates:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    if "unit_id" not in df.columns:
        df["unit_id"] = ""
    if "unit_number" not in df.columns:
        df["unit_number"] = 0
    if "zipcode" not in df.columns:
        df["zipcode"] = ""
    if "city" not in df.columns:
        df["city"] = ""
    if "energy_source" not in df.columns:
        df["energy_source"] = ""
    if "emission_factor_g_per_kwh" not in df.columns:
        df["emission_factor_g_per_kwh"] = 0.0
    if "series_id" not in df.columns:
        if df["unit_id"].astype(str).str.len().gt(0).any():
            df["series_id"] = df["unit_id"].astype(str)
        else:
            df["series_id"] = df["property_id"].astype(str)
    if "is_missing_observation" not in df.columns:
        df["is_missing_observation"] = 0

    return df.sort_values(["series_id", "date"]).reset_index(drop=True)


def _property_sort_key(path: Path) -> tuple[int, str]:
    suffix = path.stem.split("_")[-1]
    return (int(suffix) if suffix.isdigit() else 10**9, path.name)
