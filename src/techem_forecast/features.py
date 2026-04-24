"""Feature engineering for daily energy forecasting."""

from __future__ import annotations

import numpy as np
import pandas as pd

TARGET_COLUMN = "energy_usage_kwh"

LAG_DAYS = [1, 2, 3, 7, 14, 28]
ROLLING_WINDOWS = [3, 7, 14, 28]

CATEGORICAL_FEATURES = ["property_id", "unit_id", "zipcode", "city", "energy_source", "heating_mode"]
NUMERIC_FEATURES = [
    "unit_number",
    "outside_temp_c",
    "living_space_m2",
    "room_count",
    "emission_factor_g_per_kwh",
    "is_missing_observation",
    "room_temperature_c",
    "heater_setpoint_c",
    "radiator_valve_open_pct",
    "humidity_pct",
    "occupancy_proxy",
    "window_open_risk",
    "day_of_week",
    "is_weekend",
    "month",
    "quarter",
    "day_of_year",
    "week_of_year",
    "is_heating_season",
    "heating_degree_days",
    "cooling_degree_days",
    "temp_rolling_mean_3",
    "temp_rolling_mean_7",
    "energy_intensity_lag_1",
]

for lag in LAG_DAYS:
    NUMERIC_FEATURES.append(f"lag_{lag}")

for window in ROLLING_WINDOWS:
    NUMERIC_FEATURES.append(f"rolling_mean_{window}")
    NUMERIC_FEATURES.append(f"rolling_std_{window}")

FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def add_calendar_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    dates = df["date"]
    df["day_of_week"] = dates.dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["month"] = dates.dt.month
    df["quarter"] = dates.dt.quarter
    df["day_of_year"] = dates.dt.dayofyear
    df["week_of_year"] = dates.dt.isocalendar().week.astype(int)
    df["is_heating_season"] = df["month"].isin([10, 11, 12, 1, 2, 3, 4]).astype(int)
    df["heating_degree_days"] = np.maximum(0, 18.0 - df["outside_temp_c"])
    df["cooling_degree_days"] = np.maximum(0, df["outside_temp_c"] - 22.0)
    return df


def add_lag_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["series_id", "date"]).copy()
    grouped_energy = df.groupby("series_id", sort=False)[TARGET_COLUMN]

    for lag in LAG_DAYS:
        df[f"lag_{lag}"] = grouped_energy.shift(lag)

    shifted = grouped_energy.shift(1)
    for window in ROLLING_WINDOWS:
        rolled = shifted.groupby(df["series_id"], sort=False).rolling(window, min_periods=2)
        df[f"rolling_mean_{window}"] = rolled.mean().reset_index(level=0, drop=True)
        df[f"rolling_std_{window}"] = rolled.std().reset_index(level=0, drop=True)

    df["energy_intensity_lag_1"] = df["lag_1"] / df["living_space_m2"].replace(0, np.nan)

    grouped_temp = df.groupby("series_id", sort=False)["outside_temp_c"]
    temp_shifted = grouped_temp.shift(1)
    df["temp_rolling_mean_3"] = (
        temp_shifted.groupby(df["series_id"], sort=False)
        .rolling(3, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )
    df["temp_rolling_mean_7"] = (
        temp_shifted.groupby(df["series_id"], sort=False)
        .rolling(7, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )
    return df


def make_modeling_frame(df: pd.DataFrame, dropna_target: bool = True) -> pd.DataFrame:
    """Return a feature-rich frame ready for model training or prediction."""

    featured = add_calendar_weather_features(df)
    featured = add_lag_rolling_features(featured)
    if dropna_target:
        featured = featured.dropna(subset=[TARGET_COLUMN])
    return featured


def available_feature_columns(df: pd.DataFrame) -> list[str]:
    return [column for column in FEATURE_COLUMNS if column in df.columns]
