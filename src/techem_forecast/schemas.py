"""Column schema and validation helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


RAW_COLUMN_MAP = {
    "date": "date",
    "zipcode": "zipcode",
    "energysource": "energy_source",
    "city": "city",
    "energyusage [kWh]": "energy_usage_kwh",
    "livingspace [m2]": "living_space_m2",
    "livingspace [m²]": "living_space_m2",
    "mean outside temperature [C]": "outside_temp_c",
    "mean outside temperature [°C]": "outside_temp_c",
    "roomnumber": "room_number",
    "emission factor [g/kWh]": "emission_factor_g_per_kwh",
    "unitnumber": "unit_number",
}

REQUIRED_COLUMNS = {
    "date",
    "zipcode",
    "energy_source",
    "city",
    "energy_usage_kwh",
    "living_space_m2",
    "outside_temp_c",
    "room_number",
    "emission_factor_g_per_kwh",
    "unit_number",
    "property_id",
}

NUMERIC_COLUMNS = [
    "energy_usage_kwh",
    "living_space_m2",
    "outside_temp_c",
    "room_number",
    "emission_factor_g_per_kwh",
    "unit_number",
]


@dataclass(frozen=True)
class SchemaReport:
    """Simple validation result that can be logged or returned to a caller."""

    rows: int
    columns: list[str]
    missing_columns: list[str]

    @property
    def is_valid(self) -> bool:
        return not self.missing_columns


def normalize_column_name(name: str) -> str:
    return " ".join(str(name).strip().split())


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize challenge CSV columns into stable backend names."""

    rename_map = {}
    for column in df.columns:
        normalized = normalize_column_name(column)
        rename_map[column] = RAW_COLUMN_MAP.get(normalized, normalized)
    return df.rename(columns=rename_map)


def validate_columns(df: pd.DataFrame, required: Iterable[str] = REQUIRED_COLUMNS) -> SchemaReport:
    missing = sorted(set(required) - set(df.columns))
    return SchemaReport(rows=len(df), columns=list(df.columns), missing_columns=missing)


def require_valid_schema(df: pd.DataFrame) -> None:
    report = validate_columns(df)
    if not report.is_valid:
        missing = ", ".join(report.missing_columns)
        raise ValueError(f"Dataset is missing required columns: {missing}")
