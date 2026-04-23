"""Aggregation helpers for frontend dashboard outputs."""

from __future__ import annotations

import pandas as pd


VALUE_COLUMNS = [
    "predicted_energy_kwh",
    "predicted_cost_eur",
    "predicted_co2_kg",
]


def monthly_totals(forecast: pd.DataFrame, group_by: list[str] | None = None) -> pd.DataFrame:
    if group_by is None:
        group_by = ["property_id", "unit_id", "series_id"]
    frame = forecast.copy()
    frame["month"] = frame["date"].dt.to_period("M").astype(str)
    return _aggregate(frame, group_by + ["month"])


def annual_totals(forecast: pd.DataFrame, group_by: list[str] | None = None) -> pd.DataFrame:
    if group_by is None:
        group_by = ["property_id", "unit_id", "series_id"]
    frame = forecast.copy()
    frame["year"] = frame["date"].dt.year
    return _aggregate(frame, group_by + ["year"])


def portfolio_daily_totals(forecast: pd.DataFrame) -> pd.DataFrame:
    return _aggregate(forecast.copy(), ["date"])


def portfolio_monthly_totals(forecast: pd.DataFrame) -> pd.DataFrame:
    return monthly_totals(forecast, group_by=[])


def portfolio_annual_totals(forecast: pd.DataFrame) -> pd.DataFrame:
    return annual_totals(forecast, group_by=[])


def _aggregate(frame: pd.DataFrame, group_columns: list[str]) -> pd.DataFrame:
    grouped = frame.groupby(group_columns, as_index=False)
    result = grouped[[column for column in VALUE_COLUMNS if column in frame.columns]].sum()

    if "series_id" in group_columns:
        metadata = grouped.agg(
            living_space_m2=("living_space_m2", "max"),
            room_count=("room_count", "max"),
        )
    else:
        series_columns = group_columns + ["series_id"]
        metadata = (
            frame.groupby(series_columns, as_index=False)
            .agg(living_space_m2=("living_space_m2", "max"), room_count=("room_count", "max"))
            .groupby(group_columns, as_index=False)
            .agg(living_space_m2=("living_space_m2", "sum"), room_count=("room_count", "sum"))
        )

    result = result.merge(metadata, on=group_columns, how="left")
    if "predicted_energy_kwh" in result.columns and "predicted_co2_kg" in result.columns:
        result["emission_factor_g_per_kwh"] = (
            result["predicted_co2_kg"] * 1000.0 / result["predicted_energy_kwh"].replace(0, pd.NA)
        )
    else:
        result["emission_factor_g_per_kwh"] = grouped["emission_factor_g_per_kwh"].mean()[
            "emission_factor_g_per_kwh"
        ]
    return result
