"""Recursive daily forecast generation."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .features import make_modeling_frame
from .train import TrainedForecaster


def forecast_daily(
    history: pd.DataFrame,
    forecaster: TrainedForecaster,
    horizon_days: int = 30,
    property_id: str | None = None,
    unit_id: str | None = None,
    future_weather: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Forecast future daily kWh recursively for selected series."""

    selected = filter_history(history, property_id=property_id, unit_id=unit_id)
    if selected.empty:
        raise ValueError("No historical rows match the requested property/unit selection")

    outputs = []
    for series_id, group in selected.groupby("series_id", sort=False):
        series_forecast = _forecast_one_series(
            group.sort_values("date"),
            forecaster,
            horizon_days=horizon_days,
            future_weather=future_weather,
        )
        series_forecast["series_id"] = series_id
        outputs.append(series_forecast)

    forecast = pd.concat(outputs, ignore_index=True)
    forecast["predicted_energy_kwh"] = forecast["energy_usage_kwh"].clip(lower=0)
    forecast = forecast.drop(columns=["energy_usage_kwh"])
    return forecast.sort_values(["series_id", "date"]).reset_index(drop=True)


def filter_history(
    history: pd.DataFrame, property_id: str | None = None, unit_id: str | None = None
) -> pd.DataFrame:
    selected = history.copy()
    if property_id:
        selected = selected[selected["property_id"] == property_id]
    if unit_id:
        selected = selected[selected["unit_id"] == unit_id]
    return selected


def _forecast_one_series(
    history: pd.DataFrame,
    forecaster: TrainedForecaster,
    horizon_days: int,
    future_weather: pd.DataFrame | None,
) -> pd.DataFrame:
    window = history.tail(90).copy()
    last_date = history["date"].max()
    static = history.sort_values("date").iloc[-1].to_dict()
    predictions = []

    for step in range(1, horizon_days + 1):
        forecast_date = last_date + pd.Timedelta(days=step)
        next_row = _make_future_row(static, forecast_date, history, future_weather)
        window = pd.concat([window, pd.DataFrame([next_row])], ignore_index=True)
        features = make_modeling_frame(window, dropna_target=False)
        current = features[features["date"] == forecast_date].tail(1)
        prediction = forecaster.model.predict(current[forecaster.feature_columns])[0]
        prediction = float(max(0.0, prediction))
        window.loc[window["date"] == forecast_date, "energy_usage_kwh"] = prediction
        output_row = window[window["date"] == forecast_date].tail(1).copy()
        predictions.append(output_row)

    return pd.concat(predictions, ignore_index=True)


def _make_future_row(
    static: dict,
    forecast_date: pd.Timestamp,
    history: pd.DataFrame,
    future_weather: pd.DataFrame | None,
) -> dict:
    row = {
        "date": forecast_date,
        "property_id": static["property_id"],
        "unit_id": static.get("unit_id", ""),
        "unit_number": static.get("unit_number", 0),
        "zipcode": static["zipcode"],
        "city": static["city"],
        "energy_source": static["energy_source"],
        "energy_usage_kwh": np.nan,
        "living_space_m2": static["living_space_m2"],
        "outside_temp_c": _lookup_future_temperature(static, forecast_date, history, future_weather),
        "room_count": static["room_count"],
        "emission_factor_g_per_kwh": static["emission_factor_g_per_kwh"],
        "series_id": static["series_id"],
        "is_missing_observation": 0,
    }
    return row


def _lookup_future_temperature(
    static: dict,
    forecast_date: pd.Timestamp,
    history: pd.DataFrame,
    future_weather: pd.DataFrame | None,
) -> float:
    if future_weather is not None and not future_weather.empty:
        candidates = future_weather[future_weather["date"] == forecast_date]
        for column, value in [
            ("unit_id", static.get("unit_id")),
            ("property_id", static.get("property_id")),
            ("zipcode", static.get("zipcode")),
            ("city", static.get("city")),
        ]:
            if column in candidates.columns and value not in (None, ""):
                matched = candidates[candidates[column].astype(str) == str(value)]
                if not matched.empty:
                    return float(matched["outside_temp_c"].iloc[0])
        if not candidates.empty:
            return float(candidates["outside_temp_c"].iloc[0])

    day_of_year = forecast_date.dayofyear
    climatology = history[history["date"].dt.dayofyear == day_of_year]["outside_temp_c"]
    if climatology.notna().any():
        return float(climatology.median())
    return float(history["outside_temp_c"].tail(14).median())
