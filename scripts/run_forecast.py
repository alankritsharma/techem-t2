#!/usr/bin/env python3
"""Run the Techem forecasting backend MVP from the command line."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import fields
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from techem_forecast.pipeline import ForecastRunConfig, run_forecast, write_outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and run daily energy forecasts.")
    parser.add_argument("--config", type=str, help="Optional JSON config file.")
    parser.add_argument("--dataset-dir", default=None)
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--grain", choices=["unit", "property"], default=None)
    parser.add_argument("--horizon-days", type=int, default=None)
    parser.add_argument("--validation-days", type=int, default=None)
    parser.add_argument("--max-train-rows", type=int, default=None)
    parser.add_argument("--price-eur-per-kwh", type=float, default=None)
    parser.add_argument("--property-id", default=None)
    parser.add_argument("--unit-id", default=None)
    parser.add_argument("--future-weather-csv", default=None)
    return parser.parse_args()


def load_config(args: argparse.Namespace) -> ForecastRunConfig:
    values = {}
    if args.config:
        with open(args.config, encoding="utf-8") as file:
            values.update(json.load(file))

    valid_fields = {field.name for field in fields(ForecastRunConfig)}
    for key, value in vars(args).items():
        if key == "config" or value is None:
            continue
        if key in valid_fields:
            values[key] = value

    return ForecastRunConfig(**values)


def main() -> None:
    config = load_config(parse_args())
    outputs = run_forecast(config)
    write_outputs(outputs, config.output_dir)

    metrics = outputs["metrics"]
    print("Forecast run complete")
    print(f"Model: {metrics['model_name']}")
    print(f"Forecast rows: {metrics['forecast_rows']}")
    print(f"Validation metrics: {json.dumps(metrics['validation_metrics'], indent=2)}")
    print(f"Outputs written to: {Path(config.output_dir).resolve()}")


if __name__ == "__main__":
    main()
