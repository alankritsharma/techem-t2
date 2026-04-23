"""Data loading utilities for raw challenge CSVs and optional weather inputs."""

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


def _property_sort_key(path: Path) -> tuple[int, str]:
    suffix = path.stem.split("_")[-1]
    return (int(suffix) if suffix.isdigit() else 10**9, path.name)
