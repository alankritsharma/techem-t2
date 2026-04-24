#!/usr/bin/env python3.11
"""Generate the synthetic smart-building extension dataset."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from techem_forecast.synthetic_generator import (
    DEFAULT_END_DATE,
    DEFAULT_SEED,
    DEFAULT_START_DATE,
    SyntheticGenerationConfig,
    generate_synthetic_extension,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a deterministic synthetic smart-building extension based on Techem patterns."
    )
    parser.add_argument("--dataset-dir", default="dataset")
    parser.add_argument("--output-dir", default="outputs/synthetic")
    parser.add_argument("--start-date", default=DEFAULT_START_DATE)
    parser.add_argument("--end-date", default=DEFAULT_END_DATE)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = generate_synthetic_extension(
        SyntheticGenerationConfig(
            dataset_dir=args.dataset_dir,
            output_dir=args.output_dir,
            start_date=args.start_date,
            end_date=args.end_date,
            seed=args.seed,
        )
    )
    summary = result["summary"]
    output_paths = result["output_paths"]

    print("Synthetic smart-building extension generation complete")
    print(f"Rows: {summary['row_count']}")
    print(f"Properties: {summary['property_count']}")
    print(f"Units: {summary['unit_count']}")
    print(f"Date range: {summary['start_date']} to {summary['end_date']}")
    print(f"Temperature vs energy correlation: {summary['temperature_energy_correlation']:.4f}")
    print(f"Output dataset: {output_paths['dataset']}")
    if "fallback_reason" in output_paths:
        print(f"Output note: {output_paths['fallback_reason']}")
    print("Feature ranges:")
    print(json.dumps(summary["feature_ranges"], indent=2))


if __name__ == "__main__":
    main()
