"""End-to-end orchestration for the forecasting backend MVP."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import pandas as pd

from .aggregate import annual_totals, monthly_totals, portfolio_annual_totals, portfolio_monthly_totals
from .business_logic import add_cost_and_emissions
from .data_loader import load_daily_history, load_dataset, load_future_weather
from .features import make_modeling_frame
from .predict import forecast_daily
from .preprocess import prepare_daily_data
from .train import train_forecaster


@dataclass
class ForecastRunConfig:
    dataset_dir: str = "dataset"
    output_dir: str = "outputs"
    grain: str = "unit"
    history_path: str | None = None
    horizon_days: int = 30
    validation_days: int = 60
    validation_cutoff_date: str | None = None
    max_train_rows: int | None = None
    price_eur_per_kwh: float = 0.12
    property_id: str | None = None
    unit_id: str | None = None
    future_weather_csv: str | None = None


def run_forecast(config: ForecastRunConfig) -> dict[str, pd.DataFrame | dict]:
    if config.history_path:
        daily = load_daily_history(config.history_path)
    else:
        raw = load_dataset(config.dataset_dir)
        daily = prepare_daily_data(raw, grain=config.grain)
    features = make_modeling_frame(daily)
    forecaster = train_forecaster(
        features,
        validation_days=config.validation_days,
        max_train_rows=config.max_train_rows,
        validation_cutoff_date=config.validation_cutoff_date,
    )
    future_weather = load_future_weather(config.future_weather_csv)
    daily_forecast = forecast_daily(
        daily,
        forecaster,
        horizon_days=config.horizon_days,
        property_id=config.property_id,
        unit_id=config.unit_id,
        future_weather=future_weather,
    )
    daily_forecast = add_cost_and_emissions(daily_forecast, config.price_eur_per_kwh)
    monthly = monthly_totals(daily_forecast)
    annual = annual_totals(daily_forecast)
    portfolio_monthly = portfolio_monthly_totals(daily_forecast)
    portfolio_annual = portfolio_annual_totals(daily_forecast)

    metrics = {
        "model_name": forecaster.model_name,
        "validation_cutoff": forecaster.validation_cutoff.date().isoformat(),
        "validation_metrics": forecaster.validation_metrics,
        "baseline_metrics": forecaster.baseline_metrics.to_dict(orient="records"),
        "config": asdict(config),
        "training_rows": int(len(features)),
        "forecast_rows": int(len(daily_forecast)),
    }

    return {
        "daily_forecast": daily_forecast,
        "monthly_summary": monthly,
        "annual_summary": annual,
        "portfolio_monthly_summary": portfolio_monthly,
        "portfolio_annual_summary": portfolio_annual,
        "metrics": metrics,
    }


def write_outputs(outputs: dict[str, pd.DataFrame | dict], output_dir: str | Path) -> None:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for name, value in outputs.items():
        if isinstance(value, pd.DataFrame):
            csv_path = output_path / f"{name}.csv"
            json_path = output_path / f"{name}.json"
            value.to_csv(csv_path, index=False)
            value.to_json(json_path, orient="records", date_format="iso", indent=2)
        else:
            with (output_path / f"{name}.json").open("w", encoding="utf-8") as file:
                json.dump(value, file, indent=2, default=str)
