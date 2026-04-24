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
    outside_temp = _lookup_future_temperature(static, forecast_date, history, future_weather)
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
        "outside_temp_c": outside_temp,
        "room_count": static["room_count"],
        "emission_factor_g_per_kwh": static["emission_factor_g_per_kwh"],
        "series_id": static["series_id"],
        "is_missing_observation": 0,
    }
    row.update(_project_future_covariates(static, forecast_date, history, outside_temp))
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


def _project_future_covariates(
    static: dict,
    forecast_date: pd.Timestamp,
    history: pd.DataFrame,
    outside_temp_c: float,
) -> dict:
    row: dict[str, object] = {}
    smart_numeric_columns = [
        "room_temperature_c",
        "heater_setpoint_c",
        "radiator_valve_open_pct",
        "humidity_pct",
        "occupancy_proxy",
        "window_open_risk",
    ]
    for column in smart_numeric_columns:
        if column in history.columns:
            row[column] = _lookup_future_numeric_covariate(history, forecast_date, column)

    if "heating_mode" in history.columns:
        row["heating_mode"] = _lookup_future_categorical_covariate(history, forecast_date, "heating_mode")

    if "synthetic_seed" in history.columns:
        row["synthetic_seed"] = static.get("synthetic_seed", history["synthetic_seed"].iloc[-1])
    if "synthetic_source_flag" in history.columns:
        row["synthetic_source_flag"] = static.get("synthetic_source_flag", history["synthetic_source_flag"].iloc[-1])

    if "occupancy_proxy" in row:
        row["occupancy_proxy"] = float(np.clip(row["occupancy_proxy"], 0.0, 1.0))
    if "window_open_risk" in row:
        row["window_open_risk"] = float(np.clip(row["window_open_risk"], 0.0, 1.0))
    if "radiator_valve_open_pct" in row:
        row["radiator_valve_open_pct"] = float(np.clip(row["radiator_valve_open_pct"], 0.0, 100.0))

    if "heater_setpoint_c" in row and "room_temperature_c" in row:
        row["room_temperature_c"] = float(
            min(row["heater_setpoint_c"] - 0.1, max(row["room_temperature_c"], 16.0))
        )
    if "heating_mode" in row and "heater_setpoint_c" in row:
        row["heater_setpoint_c"] = float(_align_setpoint_to_mode(row["heater_setpoint_c"], str(row["heating_mode"])))
    if "heating_mode" in row and "room_temperature_c" in row:
        row["room_temperature_c"] = float(_align_room_temp_to_mode(row["room_temperature_c"], str(row["heating_mode"])))

    if "humidity_pct" in row:
        row["humidity_pct"] = float(np.clip(row["humidity_pct"], 28.0, 68.0))

    return row


def _lookup_future_numeric_covariate(
    history: pd.DataFrame,
    forecast_date: pd.Timestamp,
    column: str,
) -> float:
    same_day = history.loc[
        history["date"].dt.dayofyear == forecast_date.dayofyear,
        column,
    ].dropna()
    if not same_day.empty:
        return float(same_day.median())

    same_month = history.loc[history["date"].dt.month == forecast_date.month, column].dropna()
    if not same_month.empty:
        return float(same_month.median())

    recent = history[column].dropna().tail(30)
    if not recent.empty:
        return float(recent.median())

    return 0.0


def _lookup_future_categorical_covariate(
    history: pd.DataFrame,
    forecast_date: pd.Timestamp,
    column: str,
) -> str:
    same_day = history.loc[
        history["date"].dt.dayofyear == forecast_date.dayofyear,
        column,
    ].dropna()
    if not same_day.empty:
        return str(same_day.mode().iloc[0])

    same_month = history.loc[history["date"].dt.month == forecast_date.month, column].dropna()
    if not same_month.empty:
        return str(same_month.mode().iloc[0])

    recent = history[column].dropna().tail(30)
    if not recent.empty:
        return str(recent.mode().iloc[0])

    return ""


def _align_setpoint_to_mode(setpoint: float, heating_mode: str) -> float:
    bounds = {
        "off": (17.5, 19.2),
        "eco": (18.5, 20.2),
        "comfort": (19.4, 21.3),
        "boost": (20.2, 22.7),
    }
    lower, upper = bounds.get(heating_mode, (17.5, 22.7))
    return float(np.clip(setpoint, lower, upper))


def _align_room_temp_to_mode(room_temp: float, heating_mode: str) -> float:
    bounds = {
        "off": (17.0, 18.8),
        "eco": (18.0, 19.8),
        "comfort": (18.8, 21.0),
        "boost": (19.7, 22.4),
    }
    lower, upper = bounds.get(heating_mode, (16.0, 25.0))
    return float(np.clip(room_temp, lower, upper))
