"""Model training and time-based validation."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .baselines import evaluate_baselines, regression_metrics
from .features import CATEGORICAL_FEATURES, FEATURE_COLUMNS, TARGET_COLUMN, available_feature_columns


@dataclass
class TrainedForecaster:
    model: Pipeline
    feature_columns: list[str]
    categorical_features: list[str]
    numeric_features: list[str]
    validation_metrics: dict[str, float]
    baseline_metrics: pd.DataFrame
    validation_cutoff: pd.Timestamp
    model_name: str


def train_forecaster(
    feature_frame: pd.DataFrame,
    validation_days: int = 60,
    max_train_rows: int | None = None,
    validation_cutoff_date: str | pd.Timestamp | None = None,
) -> TrainedForecaster:
    """Train a main ML forecaster using a strict time-based validation split."""

    model_frame = feature_frame.dropna(subset=[TARGET_COLUMN]).copy()
    feature_columns = available_feature_columns(model_frame)
    model_frame = model_frame.dropna(subset=feature_columns, how="all")
    if validation_cutoff_date is not None:
        cutoff = pd.Timestamp(validation_cutoff_date)
    else:
        cutoff = model_frame["date"].max() - pd.Timedelta(days=validation_days)

    train_df = model_frame[model_frame["date"] <= cutoff]
    validation_df = model_frame[model_frame["date"] > cutoff]
    if train_df.empty or validation_df.empty:
        raise ValueError("Not enough data for time-based train/validation split")
    train_df = _cap_rows(train_df, max_train_rows)

    categorical_features = [column for column in CATEGORICAL_FEATURES if column in feature_columns]
    numeric_features = [column for column in feature_columns if column not in categorical_features]
    model, model_name = build_model(categorical_features, numeric_features)

    model.fit(train_df[feature_columns], train_df[TARGET_COLUMN])
    validation_prediction = model.predict(validation_df[feature_columns]).clip(min=0)
    metrics = regression_metrics(validation_df[TARGET_COLUMN], pd.Series(validation_prediction))

    final_model_frame = _cap_rows(model_frame, max_train_rows)
    final_model, _ = build_model(categorical_features, numeric_features)
    final_model.fit(final_model_frame[feature_columns], final_model_frame[TARGET_COLUMN])

    return TrainedForecaster(
        model=final_model,
        feature_columns=feature_columns,
        categorical_features=categorical_features,
        numeric_features=numeric_features,
        validation_metrics=metrics,
        baseline_metrics=evaluate_baselines(validation_df),
        validation_cutoff=cutoff,
        model_name=model_name,
    )


def build_model(categorical_features: list[str], numeric_features: list[str]) -> tuple[Pipeline, str]:
    """Prefer XGBoost if installed; otherwise use a robust sklearn gradient boosting model."""

    try:
        from xgboost import XGBRegressor

        estimator = XGBRegressor(
            n_estimators=250,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=4,
        )
        model_name = "xgboost.XGBRegressor"
    except Exception:
        estimator = HistGradientBoostingRegressor(
            max_iter=180,
            learning_rate=0.05,
            max_leaf_nodes=31,
            l2_regularization=0.05,
            random_state=42,
        )
        model_name = "sklearn.HistGradientBoostingRegressor"

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", SimpleImputer(strategy="median"), numeric_features),
            ("cat", make_one_hot_encoder(), categorical_features),
        ],
        remainder="drop",
    )
    return Pipeline([("preprocess", preprocessor), ("model", estimator)]), model_name


def _cap_rows(frame: pd.DataFrame, max_rows: int | None) -> pd.DataFrame:
    if max_rows and len(frame) > max_rows:
        return frame.sort_values(["date", "series_id"]).tail(max_rows)
    return frame


def make_one_hot_encoder() -> Pipeline:
    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=False)
    return Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("encoder", encoder)])
