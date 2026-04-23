"""Preprocessing and grain conversion for Techem energy data."""

from __future__ import annotations

import pandas as pd


def add_identifiers(df: pd.DataFrame) -> pd.DataFrame:
    """Create stable property, unit and room identifiers."""

    df = df.copy()
    df["unit_number"] = df["unit_number"].astype(int)
    df["room_number"] = df["room_number"].astype(int)
    df["unit_id"] = df["property_id"] + "_unit_" + df["unit_number"].astype(str)
    df["room_id"] = df["unit_id"] + "_room_" + df["room_number"].astype(str)
    return df


def aggregate_to_daily_units(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate raw room-level rows into one daily row per property/unit."""

    df = add_identifiers(df)
    group_columns = [
        "date",
        "property_id",
        "unit_id",
        "unit_number",
        "zipcode",
        "city",
        "energy_source",
    ]
    aggregated = (
        df.groupby(group_columns, as_index=False)
        .agg(
            energy_usage_kwh=("energy_usage_kwh", "sum"),
            living_space_m2=("living_space_m2", "sum"),
            outside_temp_c=("outside_temp_c", "mean"),
            room_count=("room_number", "nunique"),
            emission_factor_g_per_kwh=("emission_factor_g_per_kwh", "mean"),
        )
        .sort_values(["property_id", "unit_number", "date"])
        .reset_index(drop=True)
    )
    aggregated["series_id"] = aggregated["unit_id"]
    return aggregated


def aggregate_to_daily_properties(unit_daily: pd.DataFrame) -> pd.DataFrame:
    """Aggregate unit-day rows to property-day rows for property-level forecasts."""

    group_columns = ["date", "property_id", "zipcode", "city", "energy_source"]
    property_daily = (
        unit_daily.groupby(group_columns, as_index=False)
        .agg(
            energy_usage_kwh=("energy_usage_kwh", "sum"),
            living_space_m2=("living_space_m2", "sum"),
            outside_temp_c=("outside_temp_c", "mean"),
            room_count=("room_count", "sum"),
            emission_factor_g_per_kwh=("emission_factor_g_per_kwh", "mean"),
        )
        .sort_values(["property_id", "date"])
        .reset_index(drop=True)
    )
    property_daily["unit_id"] = ""
    property_daily["unit_number"] = 0
    property_daily["series_id"] = property_daily["property_id"]
    return property_daily


def complete_daily_series(df: pd.DataFrame) -> pd.DataFrame:
    """Create a complete daily calendar per series and mark missing observations."""

    completed = []
    static_columns = [
        "property_id",
        "unit_id",
        "unit_number",
        "zipcode",
        "city",
        "energy_source",
        "living_space_m2",
        "room_count",
        "emission_factor_g_per_kwh",
        "series_id",
    ]

    for _, group in df.sort_values("date").groupby("series_id", sort=False):
        full_dates = pd.date_range(group["date"].min(), group["date"].max(), freq="D")
        reindexed = group.set_index("date").reindex(full_dates)
        reindexed.index.name = "date"
        reindexed = reindexed.reset_index()
        reindexed["is_missing_observation"] = reindexed["energy_usage_kwh"].isna().astype(int)

        for column in static_columns:
            reindexed[column] = reindexed[column].ffill().bfill()

        reindexed["outside_temp_c"] = (
            reindexed["outside_temp_c"].interpolate(limit_direction="both").ffill().bfill()
        )
        completed.append(reindexed)

    return pd.concat(completed, ignore_index=True).sort_values(["series_id", "date"])


def prepare_daily_data(raw_df: pd.DataFrame, grain: str = "unit") -> pd.DataFrame:
    """Normalize raw room data to the requested daily modeling grain."""

    unit_daily = aggregate_to_daily_units(raw_df)
    if grain == "unit":
        return complete_daily_series(unit_daily)
    if grain == "property":
        return complete_daily_series(aggregate_to_daily_properties(unit_daily))
    raise ValueError("grain must be either 'unit' or 'property'")
