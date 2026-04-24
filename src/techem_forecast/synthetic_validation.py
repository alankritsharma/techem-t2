"""Validation utilities for the synthetic smart-building extension dataset."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .synthetic_generator import CSV_NAME, PARQUET_NAME


@dataclass
class SyntheticValidationConfig:
    input_path: str | None = None
    output_dir: str = "outputs/synthetic"
    spike_zscore_threshold: float = 4.5


def run_synthetic_validation(config: SyntheticValidationConfig) -> dict[str, object]:
    """Validate the generated synthetic dataset and persist report artifacts."""

    dataset_path = resolve_dataset_path(config.input_path, config.output_dir)
    dataset = load_synthetic_dataset(dataset_path)
    report = build_validation_report(dataset, dataset_path, config)
    write_validation_outputs(report, config.output_dir)
    return report


def resolve_dataset_path(input_path: str | None, output_dir: str | Path) -> Path:
    """Resolve the preferred generated dataset path."""

    if input_path:
        return Path(input_path)

    output_path = Path(output_dir)
    parquet_path = output_path / PARQUET_NAME
    csv_path = output_path / CSV_NAME
    if parquet_path.exists():
        return parquet_path
    if csv_path.exists():
        return csv_path
    raise FileNotFoundError(
        f"No synthetic dataset found in {output_path}. Expected {PARQUET_NAME} or {CSV_NAME}."
    )


def load_synthetic_dataset(path: str | Path) -> pd.DataFrame:
    """Load the generated dataset regardless of whether it is CSV or Parquet."""

    source_path = Path(path)
    if source_path.suffix == ".parquet":
        df = pd.read_parquet(source_path)
    else:
        df = pd.read_csv(source_path)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    return df


def build_validation_report(
    dataset: pd.DataFrame,
    dataset_path: str | Path,
    config: SyntheticValidationConfig,
) -> dict[str, object]:
    """Run the requested validation checks and structure the result."""

    expected_ranges = {
        "room_temperature_c": (16.0, 25.0),
        "humidity_pct": (28.0, 68.0),
        "radiator_valve_open_pct": (0.0, 100.0),
        "occupancy_proxy": (0.0, 1.0),
    }

    summary = {
        "row_count": int(len(dataset)),
        "property_count": int(dataset["property_id"].nunique()),
        "unit_count": int(dataset["unit_id"].nunique()),
        "start_date": dataset["date"].min().date().isoformat(),
        "end_date": dataset["date"].max().date().isoformat(),
    }

    ranges = {}
    range_passed = True
    for column, (expected_min, expected_max) in expected_ranges.items():
        observed_min = float(dataset[column].min())
        observed_max = float(dataset[column].max())
        passed = observed_min >= expected_min and observed_max <= expected_max
        range_passed = range_passed and passed
        ranges[column] = {
            "min": observed_min,
            "max": observed_max,
            "expected_min": expected_min,
            "expected_max": expected_max,
            "passed": passed,
        }

    missing_counts = dataset.isna().sum().sort_values(ascending=False)
    missing_report = {
        "total_missing_cells": int(missing_counts.sum()),
        "columns_with_missing": {
            key: int(value) for key, value in missing_counts[missing_counts > 0].to_dict().items()
        },
        "passed": int(missing_counts.sum()) == 0,
    }

    winter_mask = dataset["month"].isin([12, 1, 2])
    summer_mask = dataset["month"].isin([6, 7, 8])
    winter_energy = float(dataset.loc[winter_mask, "energy_usage_kwh"].mean())
    summer_energy = float(dataset.loc[summer_mask, "energy_usage_kwh"].mean())
    winter_temp = float(dataset.loc[winter_mask, "outside_temp_c"].mean())
    summer_temp = float(dataset.loc[summer_mask, "outside_temp_c"].mean())
    seasonality = {
        "winter_energy_mean_kwh": winter_energy,
        "summer_energy_mean_kwh": summer_energy,
        "winter_temp_mean_c": winter_temp,
        "summer_temp_mean_c": summer_temp,
        "energy_higher_in_winter": winter_energy > summer_energy,
        "temperature_lower_in_winter": winter_temp < summer_temp,
        "passed": (winter_energy > summer_energy) and (winter_temp < summer_temp),
    }

    temp_energy_corr = float(dataset["outside_temp_c"].corr(dataset["energy_usage_kwh"]))
    property_corrs = (
        dataset.groupby("property_id")
        .apply(lambda frame: frame["outside_temp_c"].corr(frame["energy_usage_kwh"]), include_groups=False)
        .replace([np.inf, -np.inf], np.nan)
        .dropna()
    )
    correlation = {
        "overall_temp_energy_corr": temp_energy_corr,
        "property_median_temp_energy_corr": float(property_corrs.median()) if not property_corrs.empty else np.nan,
        "negative_overall_correlation": temp_energy_corr < -0.1,
        "passed": temp_energy_corr < -0.1,
    }

    unit_summary = (
        dataset.groupby(["property_id", "unit_id"], as_index=False)
        .agg(
            mean_daily_energy_kwh=("energy_usage_kwh", "mean"),
            annualized_energy_kwh=("energy_usage_kwh", "sum"),
            living_space_m2=("living_space_m2", "first"),
            room_count=("room_count", "first"),
        )
        .sort_values(["property_id", "living_space_m2", "room_count"])
    )
    property_space_corr = (
        unit_summary.groupby("property_id")
        .apply(lambda frame: frame["living_space_m2"].corr(frame["mean_daily_energy_kwh"]), include_groups=False)
        .replace([np.inf, -np.inf], np.nan)
        .dropna()
    )
    size_consistency = {
        "space_energy_corr": float(unit_summary["living_space_m2"].corr(unit_summary["mean_daily_energy_kwh"])),
        "room_energy_corr": float(unit_summary["room_count"].corr(unit_summary["mean_daily_energy_kwh"])),
        "positive_property_share": float((property_space_corr > 0).mean()) if not property_space_corr.empty else 0.0,
        "passed": bool(
            (unit_summary["living_space_m2"].corr(unit_summary["mean_daily_energy_kwh"]) > 0.2)
            and ((unit_summary["room_count"].corr(unit_summary["mean_daily_energy_kwh"]) > 0.15))
        ),
    }

    outlier_report = _detect_outliers(dataset, threshold=config.spike_zscore_threshold)
    warnings = _collect_warnings(ranges, missing_report, seasonality, correlation, size_consistency, outlier_report)

    report = {
        "dataset_path": str(Path(dataset_path).resolve()),
        "config": asdict(config),
        "summary": summary,
        "ranges": ranges,
        "missing_values": missing_report,
        "seasonality": seasonality,
        "correlation": correlation,
        "size_consistency": size_consistency,
        "outliers": outlier_report,
        "warnings": warnings,
        "overall_passed": not warnings,
    }
    return report


def write_validation_outputs(report: dict[str, object], output_dir: str | Path) -> None:
    """Persist the JSON report and a flat CSV summary."""

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    report_path = output_path / "validation_report.json"
    summary_path = output_path / "validation_summary.csv"

    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, default=_json_default)

    summary_rows = [
        {
            "check_name": "ranges",
            "passed": _all_passed(report["ranges"]),
            "metric": "bounded_features",
            "value": len(report["ranges"]),
            "details": "Feature ranges remain inside requested bounds",
        },
        {
            "check_name": "missing_values",
            "passed": report["missing_values"]["passed"],
            "metric": "total_missing_cells",
            "value": report["missing_values"]["total_missing_cells"],
            "details": json.dumps(report["missing_values"]["columns_with_missing"], sort_keys=True),
        },
        {
            "check_name": "seasonality",
            "passed": report["seasonality"]["passed"],
            "metric": "winter_vs_summer_energy_delta_kwh",
            "value": report["seasonality"]["winter_energy_mean_kwh"]
            - report["seasonality"]["summer_energy_mean_kwh"],
            "details": "Winter energy should exceed summer energy and winter should be colder",
        },
        {
            "check_name": "correlation",
            "passed": report["correlation"]["passed"],
            "metric": "overall_temp_energy_corr",
            "value": report["correlation"]["overall_temp_energy_corr"],
            "details": "Outside temperature should be negatively correlated with energy usage",
        },
        {
            "check_name": "size_consistency",
            "passed": report["size_consistency"]["passed"],
            "metric": "space_energy_corr",
            "value": report["size_consistency"]["space_energy_corr"],
            "details": "Larger units should generally consume more than smaller ones",
        },
        {
            "check_name": "outliers",
            "passed": report["outliers"]["passed"],
            "metric": "spike_rate",
            "value": report["outliers"]["spike_rate"],
            "details": "Daily spikes should remain rare across unit series",
        },
    ]
    pd.DataFrame(summary_rows).to_csv(summary_path, index=False)


def _detect_outliers(dataset: pd.DataFrame, threshold: float) -> dict[str, object]:
    unit_daily = dataset.loc[:, ["unit_id", "date", "energy_usage_kwh"]].sort_values(["unit_id", "date"]).copy()
    stats = unit_daily.groupby("unit_id")["energy_usage_kwh"].agg(["median"])
    mad = (
        unit_daily.groupby("unit_id")["energy_usage_kwh"]
        .apply(lambda series: float(np.median(np.abs(series - np.median(series)))))
        .rename("mad")
    )
    stats = stats.join(mad)
    unit_daily = unit_daily.join(stats, on="unit_id")
    scale = (1.4826 * unit_daily["mad"]).replace(0, np.nan)
    robust_z = ((unit_daily["energy_usage_kwh"] - unit_daily["median"]).abs() / scale).replace(
        [np.inf, -np.inf], np.nan
    )
    spikes = robust_z > threshold
    spike_rows = unit_daily.loc[spikes.fillna(False), ["unit_id", "date", "energy_usage_kwh"]].head(25)
    spike_rate = float(spikes.fillna(False).mean())

    return {
        "threshold": threshold,
        "spike_count": int(spikes.fillna(False).sum()),
        "spike_rate": spike_rate,
        "sample_spikes": [
            {
                "unit_id": str(row.unit_id),
                "date": row.date.date().isoformat(),
                "energy_usage_kwh": float(row.energy_usage_kwh),
            }
            for row in spike_rows.itertuples(index=False)
        ],
        "passed": spike_rate <= 0.01,
    }


def _collect_warnings(
    ranges: dict[str, dict[str, object]],
    missing_report: dict[str, object],
    seasonality: dict[str, object],
    correlation: dict[str, object],
    size_consistency: dict[str, object],
    outliers: dict[str, object],
) -> list[str]:
    warnings: list[str] = []
    if not _all_passed(ranges):
        warnings.append("One or more bounded synthetic features fall outside the requested value range.")
    if not missing_report["passed"]:
        warnings.append("Synthetic dataset contains missing values.")
    if not seasonality["passed"]:
        warnings.append("Seasonal winter/summer behavior check failed.")
    if not correlation["passed"]:
        warnings.append("Overall outside temperature to energy correlation is not negative enough.")
    if not size_consistency["passed"]:
        warnings.append("Larger-unit consumption consistency is weaker than expected.")
    if not outliers["passed"]:
        warnings.append("Abnormal spike rate exceeds the validation threshold.")
    return warnings


def _all_passed(ranges: dict[str, dict[str, object]]) -> bool:
    return all(bool(item["passed"]) for item in ranges.values())


def _json_default(value: object) -> object:
    if isinstance(value, (np.floating, np.integer)):
        return value.item()
    if isinstance(value, Path):
        return str(value)
    return value
