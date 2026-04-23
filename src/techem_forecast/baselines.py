"""Baseline forecasting models for sanity checks and demo comparisons."""

from __future__ import annotations

import numpy as np
import pandas as pd


def evaluate_baselines(validation_df: pd.DataFrame) -> pd.DataFrame:
    """Evaluate simple baselines on a validation feature frame."""

    rows = []
    candidates = {
        "lag_1_naive": validation_df["lag_1"],
        "lag_7_seasonal": validation_df["lag_7"],
        "rolling_7_mean": validation_df["rolling_mean_7"],
        "rolling_14_mean": validation_df["rolling_mean_14"],
    }
    actual = validation_df["energy_usage_kwh"]
    for name, prediction in candidates.items():
        mask = actual.notna() & prediction.notna()
        if not mask.any():
            continue
        rows.append({"model": name, **regression_metrics(actual[mask], prediction[mask])})
    return pd.DataFrame(rows).sort_values("mae").reset_index(drop=True)


def regression_metrics(actual: pd.Series, prediction: pd.Series) -> dict[str, float]:
    actual_array = actual.to_numpy(dtype=float)
    prediction_array = prediction.to_numpy(dtype=float)
    errors = actual_array - prediction_array
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors**2)))
    denominator = np.where(np.abs(actual_array) < 1e-6, np.nan, np.abs(actual_array))
    mape = float(np.nanmean(np.abs(errors) / denominator) * 100)
    if np.isnan(mape):
        mape = 0.0
    return {"mae": mae, "rmse": rmse, "mape_pct": mape}
