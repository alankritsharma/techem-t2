"""Demo registry and JSON export helpers for the Techem hackathon flows."""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import pandas as pd

from .pipeline import ForecastRunConfig, run_forecast
from .data_loader import load_daily_history, load_dataset
from .preprocess import prepare_daily_data


DEMO_PASSWORD = "Demo-Techem-2026!"
LANDLORD_CONTACTS = [
    {"display_name": "Jan Peters", "company_name": "NordHaus Capital"},
    {"display_name": "Tim Woydt", "company_name": "RheinBlock Verwaltung"},
    {"display_name": "Sarah Keller", "company_name": "UrbanGrid Estates"},
    {"display_name": "Mila Hartmann", "company_name": "HelioLiving Group"},
    {"display_name": "Jonas Becker", "company_name": "MainWest Property"},
]
PROPERTY_NAMES = [
    "Axiom Heights",
    "Linden Court",
    "Harbor Point",
    "Cedar House",
    "Northgate Residences",
    "Riverside Lofts",
    "Willow Square",
    "Summit Gardens",
    "Aurora Park",
    "Maple Terrace",
    "Beacon Row",
    "Elm Quarter",
    "Parkside Court",
    "Atlas Residences",
    "Stonebridge Heights",
    "Skyline Court",
    "Juniper Place",
    "Westfield House",
    "Crown Terrace",
    "Oakline Residences",
]
TENANT_FIRST_NAMES = [
    "Emma",
    "Lena",
    "Noah",
    "Mia",
    "Ben",
    "Sofia",
    "Paul",
    "Clara",
    "Jonas",
    "Leonie",
    "Finn",
    "Nora",
    "Luca",
    "Hannah",
    "David",
    "Mila",
]
TENANT_LAST_NAMES = [
    "Wagner",
    "Hoffmann",
    "Schulz",
    "Becker",
    "Keller",
    "Hartmann",
    "Lehmann",
    "Richter",
    "Koch",
    "Wolf",
    "Schreiber",
    "Neumann",
    "Winter",
    "Lorenz",
    "Bauer",
    "Kruger",
]

VALUE_COLUMNS = [
    "predicted_energy_kwh",
    "predicted_cost_eur",
    "predicted_co2_kg",
]


@dataclass
class DemoExportConfig:
    dataset_dir: str = "dataset"
    output_dir: str = "outputs/demo"
    history_path: str | None = None
    horizon_days: int = 30
    validation_days: int = 60
    validation_cutoff_date: str | None = None
    max_train_rows: int | None = None
    price_eur_per_kwh: float = 0.12
    future_weather_csv: str | None = None
    landlord_count: int = 5
    demo_password: str = DEMO_PASSWORD


def run_demo_export(config: DemoExportConfig) -> dict[str, pd.DataFrame | dict | list]:
    """Generate demo registries and frontend-ready JSON payloads."""

    if config.history_path:
        unit_history = load_daily_history(config.history_path)
    else:
        raw = load_dataset(config.dataset_dir)
        unit_history = prepare_daily_data(raw, grain="unit")
    as_of_date = unit_history["date"].max().date().isoformat()

    forecast_outputs = run_forecast(
        ForecastRunConfig(
            dataset_dir=config.dataset_dir,
            output_dir=config.output_dir,
            grain="unit",
            history_path=config.history_path,
            horizon_days=config.horizon_days,
            validation_days=config.validation_days,
            validation_cutoff_date=config.validation_cutoff_date,
            max_train_rows=config.max_train_rows,
            price_eur_per_kwh=config.price_eur_per_kwh,
            future_weather_csv=config.future_weather_csv,
        )
    )

    daily_forecast = forecast_outputs["daily_forecast"].copy()
    monthly_summary = forecast_outputs["monthly_summary"].copy()
    annual_summary = forecast_outputs["annual_summary"].copy()
    metrics = dict(forecast_outputs["metrics"])

    registries = build_demo_registries(
        unit_history=unit_history,
        landlord_count=config.landlord_count,
        demo_password=config.demo_password,
    )
    properties = registries["properties"]
    units = registries["units"]
    landlords = registries["landlords"]
    tenants = registries["tenants"]

    property_summaries = build_property_summaries(daily_forecast, properties, as_of_date)
    unit_summaries = build_unit_summaries(daily_forecast, units, as_of_date)
    landlord_summaries = build_landlord_summaries(property_summaries, landlords, as_of_date)
    tenant_summaries = build_tenant_summaries(unit_summaries, tenants, as_of_date)

    property_monthly_summary = aggregate_property_periods(monthly_summary, "month")
    property_annual_summary = aggregate_property_periods(annual_summary, "year")
    landlord_monthly_summary = aggregate_landlord_periods(property_monthly_summary, properties, "month")
    landlord_annual_summary = aggregate_landlord_periods(property_annual_summary, properties, "year")
    tenant_monthly_summary = aggregate_tenant_periods(monthly_summary, units, "month")
    tenant_annual_summary = aggregate_tenant_periods(annual_summary, units, "year")

    demo_users = build_demo_users(landlords, tenants)

    contract_manifest = build_contract_manifest(
        as_of_date=as_of_date,
        forecast_start_date=daily_forecast["date"].min().date().isoformat(),
        forecast_end_date=daily_forecast["date"].max().date().isoformat(),
        model_name=metrics["model_name"],
    )

    metrics["demo_config"] = asdict(config)

    return {
        "demo_users": demo_users,
        "landlords": landlords,
        "tenants": tenants,
        "property_registry": properties,
        "unit_registry": units,
        "daily_forecast": daily_forecast,
        "monthly_summary": monthly_summary,
        "annual_summary": annual_summary,
        "property_summaries": property_summaries,
        "unit_summaries": unit_summaries,
        "property_monthly_summary": property_monthly_summary,
        "property_annual_summary": property_annual_summary,
        "landlord_summaries": landlord_summaries,
        "landlord_monthly_summary": landlord_monthly_summary,
        "landlord_annual_summary": landlord_annual_summary,
        "tenant_summaries": tenant_summaries,
        "tenant_monthly_summary": tenant_monthly_summary,
        "tenant_annual_summary": tenant_annual_summary,
        "metrics": metrics,
        "contract_manifest": contract_manifest,
    }


def build_demo_registries(
    unit_history: pd.DataFrame, landlord_count: int, demo_password: str
) -> dict[str, list[dict]]:
    """Create deterministic landlords, tenants, property metadata, and unit metadata."""

    unit_latest = (
        unit_history.sort_values(["series_id", "date"])
        .groupby("series_id", as_index=False)
        .tail(1)
        .copy()
    )
    unit_latest["property_number"] = unit_latest["property_id"].map(_property_number)
    unit_latest = unit_latest.sort_values(["property_number", "unit_number", "unit_id"]).reset_index(
        drop=True
    )

    property_frames = []
    for property_id, group in unit_latest.groupby("property_id", sort=False):
        property_frames.append(
            {
                "property_id": property_id,
                "property_number": _property_number(property_id),
                "display_name": PROPERTY_NAMES[(_property_number(property_id) - 1) % len(PROPERTY_NAMES)],
                "city": str(group["city"].iloc[0]),
                "zipcode": str(group["zipcode"].iloc[0]),
                "energy_source": str(group["energy_source"].iloc[0]),
                "living_space_m2": float(group["living_space_m2"].sum()),
                "unit_count": int(group["unit_id"].nunique()),
                "room_count": int(group["room_count"].sum()),
            }
        )

    property_frames = sorted(property_frames, key=lambda item: item["property_number"])
    properties_per_landlord = max(1, math.ceil(len(property_frames) / max(1, landlord_count)))

    landlords: list[dict] = []
    property_to_landlord: dict[str, str] = {}
    for landlord_index in range(landlord_count):
        landlord_id = f"landlord_{landlord_index + 1:02d}"
        contact = (
            LANDLORD_CONTACTS[landlord_index]
            if landlord_index < len(LANDLORD_CONTACTS)
            else {
                "display_name": f"Landlord {landlord_index + 1:02d}",
                "company_name": f"Demo Property Group {landlord_index + 1:02d}",
            }
        )
        username = f"landlord{landlord_index + 1:02d}"
        landlords.append(
            {
                "landlord_id": landlord_id,
                "display_name": contact["display_name"],
                "company_name": contact["company_name"],
                "username": username,
                "email": f"{username}@demo.techem.local",
                "password": demo_password,
                "property_ids": [],
            }
        )

    properties: list[dict] = []
    for property_index, property_meta in enumerate(property_frames):
        landlord_idx = min(property_index // properties_per_landlord, landlord_count - 1)
        landlord = landlords[landlord_idx]
        property_to_landlord[property_meta["property_id"]] = landlord["landlord_id"]
        landlord["property_ids"].append(property_meta["property_id"])
        properties.append(
            {
                **property_meta,
                "landlord_id": landlord["landlord_id"],
                "owner_display_name": landlord["display_name"],
                "owner_company_name": landlord["company_name"],
            }
        )

    tenants: list[dict] = []
    units: list[dict] = []
    for row in unit_latest.itertuples(index=False):
        property_number = _property_number(row.property_id)
        tenant_id = f"tenant_{row.unit_id}"
        username = f"tenant_p{property_number:02d}_u{int(row.unit_number):02d}"
        tenant_name = _tenant_display_name(property_number, int(row.unit_number))
        tenants.append(
            {
                "tenant_id": tenant_id,
                "display_name": tenant_name,
                "username": username,
                "email": f"{username}@demo.techem.local",
                "password": demo_password,
                "property_id": row.property_id,
                "unit_id": row.unit_id,
                "landlord_id": property_to_landlord[row.property_id],
            }
        )
        units.append(
            {
                "unit_id": row.unit_id,
                "property_id": row.property_id,
                "property_number": property_number,
                "display_name": f"Apartment {int(row.unit_number):02d}",
                "unit_number": int(row.unit_number),
                "city": str(row.city),
                "zipcode": str(row.zipcode),
                "energy_source": str(row.energy_source),
                "living_space_m2": float(row.living_space_m2),
                "room_count": int(row.room_count),
                "tenant_id": tenant_id,
                "landlord_id": property_to_landlord[row.property_id],
            }
        )

    return {
        "landlords": landlords,
        "properties": properties,
        "units": units,
        "tenants": tenants,
    }


def build_demo_users(landlords: list[dict], tenants: list[dict]) -> list[dict]:
    users = []
    for landlord in landlords:
        users.append(
            {
                "user_id": landlord["landlord_id"],
                "role": "landlord",
                "display_name": landlord["display_name"],
                "username": landlord["username"],
                "email": landlord["email"],
                "password": landlord["password"],
                "landlord_id": landlord["landlord_id"],
                "property_ids": landlord["property_ids"],
            }
        )
    for tenant in tenants:
        users.append(
            {
                "user_id": tenant["tenant_id"],
                "role": "tenant",
                "display_name": tenant["display_name"],
                "username": tenant["username"],
                "email": tenant["email"],
                "password": tenant["password"],
                "tenant_id": tenant["tenant_id"],
                "property_id": tenant["property_id"],
                "unit_id": tenant["unit_id"],
                "landlord_id": tenant["landlord_id"],
            }
        )
    return users


def build_property_summaries(
    daily_forecast: pd.DataFrame, properties: list[dict], as_of_date: str
) -> pd.DataFrame:
    summary = _sum_over_horizon(daily_forecast, ["property_id"])
    property_frame = pd.DataFrame(properties)
    summary = summary.merge(property_frame, on="property_id", how="left")
    summary["as_of_date"] = as_of_date
    return summary.sort_values("property_number").reset_index(drop=True)


def build_unit_summaries(daily_forecast: pd.DataFrame, units: list[dict], as_of_date: str) -> pd.DataFrame:
    summary = _sum_over_horizon(daily_forecast, ["property_id", "unit_id"])
    unit_frame = pd.DataFrame(units)
    summary = summary.merge(unit_frame, on=["property_id", "unit_id"], how="left")
    summary["as_of_date"] = as_of_date
    return summary.sort_values(["property_number", "unit_number"]).reset_index(drop=True)


def build_landlord_summaries(
    property_summaries: pd.DataFrame, landlords: list[dict], as_of_date: str
) -> pd.DataFrame:
    landlord_frame = pd.DataFrame(landlords)
    summary = _sum_over_horizon(property_summaries, ["landlord_id"])
    counts = (
        property_summaries.groupby("landlord_id", as_index=False)
        .agg(property_count=("property_id", "nunique"), unit_count=("unit_count", "sum"))
    )
    summary = summary.merge(counts, on="landlord_id", how="left")
    summary = summary.merge(
        landlord_frame[["landlord_id", "display_name", "company_name", "username", "email", "property_ids"]],
        on="landlord_id",
        how="left",
    )
    summary["as_of_date"] = as_of_date
    return summary.sort_values("landlord_id").reset_index(drop=True)


def build_tenant_summaries(
    unit_summaries: pd.DataFrame, tenants: list[dict], as_of_date: str
) -> pd.DataFrame:
    tenant_frame = pd.DataFrame(tenants).rename(
        columns={
            "display_name": "tenant_display_name",
            "username": "tenant_username",
            "email": "tenant_email",
            "password": "tenant_password",
        }
    )
    summary = unit_summaries.rename(columns={"display_name": "unit_display_name"}).merge(
        tenant_frame,
        on=["tenant_id", "property_id", "unit_id", "landlord_id"],
        how="left",
    )
    summary["as_of_date"] = as_of_date
    return summary.sort_values(["property_number", "unit_number"]).reset_index(drop=True)


def aggregate_property_periods(summary: pd.DataFrame, period_column: str) -> pd.DataFrame:
    result = (
        summary.groupby(["property_id", period_column], as_index=False)[VALUE_COLUMNS]
        .sum()
        .sort_values(["property_id", period_column])
        .reset_index(drop=True)
    )
    return result


def aggregate_landlord_periods(
    property_period_summary: pd.DataFrame, properties: list[dict], period_column: str
) -> pd.DataFrame:
    property_frame = pd.DataFrame(properties)[["property_id", "landlord_id"]]
    joined = property_period_summary.merge(property_frame, on="property_id", how="left")
    result = (
        joined.groupby(["landlord_id", period_column], as_index=False)[VALUE_COLUMNS]
        .sum()
        .sort_values(["landlord_id", period_column])
        .reset_index(drop=True)
    )
    return result


def aggregate_tenant_periods(summary: pd.DataFrame, units: list[dict], period_column: str) -> pd.DataFrame:
    unit_frame = pd.DataFrame(units)[["property_id", "unit_id", "tenant_id", "landlord_id"]]
    joined = summary.merge(unit_frame, on=["property_id", "unit_id"], how="left")
    result = (
        joined.groupby(["tenant_id", "property_id", "unit_id", "landlord_id", period_column], as_index=False)[VALUE_COLUMNS]
        .sum()
        .sort_values(["tenant_id", period_column])
        .reset_index(drop=True)
    )
    return result


def build_contract_manifest(
    as_of_date: str, forecast_start_date: str, forecast_end_date: str, model_name: str
) -> dict:
    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "as_of_date": as_of_date,
        "forecast_start_date": forecast_start_date,
        "forecast_end_date": forecast_end_date,
        "model_name": model_name,
        "date_format": "ISO-8601",
        "numeric_convention": "Raw numeric values only. Frontend formats currency/units.",
        "canonical_ids": {
            "property_id": "Backend property identifier derived from dataset filename.",
            "unit_id": "Backend unit identifier derived from property_id + unit_number.",
            "landlord_id": "Demo landlord identifier.",
            "tenant_id": "Demo tenant identifier mapped to a unit_id.",
        },
        "files": [
            {"name": "demo_users.json", "description": "Flattened demo user registry for fake login."},
            {"name": "landlords.json", "description": "Landlord registry with assigned property_ids."},
            {"name": "tenants.json", "description": "Tenant registry with assigned property_id and unit_id."},
            {"name": "property_registry.json", "description": "Canonical property metadata for the 20 demo properties."},
            {"name": "unit_registry.json", "description": "Canonical unit metadata and tenant assignments."},
            {"name": "daily_forecast.json", "description": "Unit-level daily forecast rows for the full portfolio."},
            {"name": "monthly_summary.json", "description": "Unit-level monthly forecast totals."},
            {"name": "annual_summary.json", "description": "Unit-level annual forecast totals."},
            {"name": "property_summaries.json", "description": "Property-level horizon totals joined to property metadata."},
            {"name": "landlord_summaries.json", "description": "Landlord-level horizon totals across assigned properties."},
            {"name": "tenant_summaries.json", "description": "Tenant-level horizon totals for assigned units."},
            {"name": "landlord_monthly_summary.json", "description": "Monthly totals aggregated by landlord_id."},
            {"name": "landlord_annual_summary.json", "description": "Annual totals aggregated by landlord_id."},
            {"name": "tenant_monthly_summary.json", "description": "Monthly totals aggregated by tenant_id."},
            {"name": "tenant_annual_summary.json", "description": "Annual totals aggregated by tenant_id."},
            {"name": "metrics.json", "description": "Model, validation, and export configuration metadata."},
        ],
    }


def write_demo_outputs(outputs: dict[str, pd.DataFrame | dict | list], output_dir: str | Path) -> None:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for name, value in outputs.items():
        target = output_path / f"{name}.json"
        if isinstance(value, pd.DataFrame):
            value.to_json(target, orient="records", date_format="iso", indent=2)
        else:
            with target.open("w", encoding="utf-8") as handle:
                json.dump(value, handle, indent=2, ensure_ascii=False, default=str)


def _sum_over_horizon(frame: pd.DataFrame, group_columns: list[str]) -> pd.DataFrame:
    result = (
        frame.groupby(group_columns, as_index=False)[VALUE_COLUMNS]
        .sum()
        .sort_values(group_columns)
        .reset_index(drop=True)
    )
    return result


def _property_number(property_id: str) -> int:
    suffix = str(property_id).split("_")[-1]
    return int(suffix) if suffix.isdigit() else 0


def _tenant_display_name(property_number: int, unit_number: int) -> str:
    index = ((property_number - 1) * 17) + max(0, unit_number - 1)
    first = TENANT_FIRST_NAMES[index % len(TENANT_FIRST_NAMES)]
    last = TENANT_LAST_NAMES[(index // len(TENANT_FIRST_NAMES)) % len(TENANT_LAST_NAMES)]
    return f"{first} {last}"
