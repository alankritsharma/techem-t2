#!/usr/bin/env python3
"""Generate demo registries and JSON forecast payloads for the Techem hackathon."""

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

from techem_forecast.demo_exports import DemoExportConfig, run_demo_export, write_demo_outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate demo JSON payloads for landlord/tenant flows.")
    parser.add_argument("--config", type=str, help="Optional JSON config file.")
    parser.add_argument("--dataset-dir", default=None)
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--history-path", default=None)
    parser.add_argument("--horizon-days", type=int, default=None)
    parser.add_argument("--validation-days", type=int, default=None)
    parser.add_argument("--validation-cutoff-date", default=None)
    parser.add_argument("--max-train-rows", type=int, default=None)
    parser.add_argument("--price-eur-per-kwh", type=float, default=None)
    parser.add_argument("--future-weather-csv", default=None)
    parser.add_argument("--landlord-count", type=int, default=None)
    parser.add_argument("--demo-password", default=None)
    return parser.parse_args()


def load_config(args: argparse.Namespace) -> DemoExportConfig:
    values = {}
    if args.config:
        with open(args.config, encoding="utf-8") as file:
            values.update(json.load(file))

    valid_fields = {field.name for field in fields(DemoExportConfig)}
    for key, value in vars(args).items():
        if key == "config" or value is None:
            continue
        if key in valid_fields:
            values[key] = value

    return DemoExportConfig(**values)


def main() -> None:
    config = load_config(parse_args())
    outputs = run_demo_export(config)
    write_demo_outputs(outputs, config.output_dir)

    landlords = outputs["landlords"]
    tenants = outputs["tenants"]
    metrics = outputs["metrics"]

    sample_landlord = landlords[0] if landlords else None
    sample_tenant = tenants[0] if tenants else None

    print("Demo export complete")
    print(f"Model: {metrics['model_name']}")
    print(f"Output directory: {Path(config.output_dir).resolve()}")
    print(f"Landlords: {len(landlords)}")
    print(f"Tenants: {len(tenants)}")
    if sample_landlord:
        print(
            "Sample landlord login: "
            f"{sample_landlord['username']} / {sample_landlord['password']} "
            f"({sample_landlord['display_name']})"
        )
    if sample_tenant:
        print(
            "Sample tenant login: "
            f"{sample_tenant['username']} / {sample_tenant['password']} "
            f"({sample_tenant['display_name']})"
        )


if __name__ == "__main__":
    main()
