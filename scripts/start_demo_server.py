#!/usr/bin/env python3
"""Generate demo outputs when needed and start the FastAPI server."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import uvicorn

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from techem_forecast.demo_api import REQUIRED_FILES, create_app
from techem_forecast.demo_exports import DemoExportConfig, run_demo_export, write_demo_outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start the demo API with auto-generated outputs.")
    parser.add_argument("--dataset-dir", default="dataset")
    parser.add_argument("--output-dir", default=os.getenv("DEMO_OUTPUT_DIR", "/tmp/techem-demo"))
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    parser.add_argument("--regenerate", action="store_true")
    parser.add_argument("--horizon-days", type=int, default=30)
    parser.add_argument("--validation-days", type=int, default=60)
    parser.add_argument("--price-eur-per-kwh", type=float, default=0.12)
    parser.add_argument("--landlord-count", type=int, default=5)
    parser.add_argument("--demo-password", default="Demo-Techem-2026!")
    return parser.parse_args()


def needs_generation(output_dir: Path) -> bool:
    return any(not (output_dir / name).exists() for name in REQUIRED_FILES)


def ensure_demo_outputs(args: argparse.Namespace) -> None:
    output_dir = Path(args.output_dir)
    if not args.regenerate and not needs_generation(output_dir):
        return

    config = DemoExportConfig(
        dataset_dir=args.dataset_dir,
        output_dir=args.output_dir,
        horizon_days=args.horizon_days,
        validation_days=args.validation_days,
        price_eur_per_kwh=args.price_eur_per_kwh,
        landlord_count=args.landlord_count,
        demo_password=args.demo_password,
    )
    outputs = run_demo_export(config)
    write_demo_outputs(outputs, config.output_dir)


def main() -> None:
    args = parse_args()
    ensure_demo_outputs(args)
    app = create_app(output_dir=args.output_dir)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
