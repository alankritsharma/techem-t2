#!/usr/bin/env python3.11
"""Validate the synthetic smart-building extension dataset."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from techem_forecast.synthetic_validation import SyntheticValidationConfig, run_synthetic_validation


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate the synthetic smart-building extension dataset.")
    parser.add_argument("--input-path", default=None)
    parser.add_argument("--output-dir", default="outputs/synthetic")
    parser.add_argument("--spike-zscore-threshold", type=float, default=4.5)
    parser.add_argument(
        "--fail-on-warning",
        action="store_true",
        help="Exit with code 1 when validation warnings are present.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = run_synthetic_validation(
        SyntheticValidationConfig(
            input_path=args.input_path,
            output_dir=args.output_dir,
            spike_zscore_threshold=args.spike_zscore_threshold,
        )
    )

    print("Synthetic smart-building extension validation complete")
    print(f"Overall passed: {report['overall_passed']}")
    print(f"Dataset: {report['dataset_path']}")
    print("Summary:")
    print(json.dumps(report["summary"], indent=2))
    print("Seasonality:")
    print(json.dumps(report["seasonality"], indent=2))
    print("Correlation:")
    print(json.dumps(report["correlation"], indent=2))
    print("Size consistency:")
    print(json.dumps(report["size_consistency"], indent=2))
    print("Outliers:")
    print(json.dumps(report["outliers"], indent=2))
    print(f"Warnings: {json.dumps(report['warnings'], indent=2)}")
    print(f"Validation report: {Path(args.output_dir).resolve() / 'validation_report.json'}")
    print(f"Validation summary: {Path(args.output_dir).resolve() / 'validation_summary.csv'}")

    if args.fail_on_warning and not report["overall_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
