"""Business calculations derived from predicted energy."""

from __future__ import annotations

import pandas as pd


def add_cost_and_emissions(
    forecast: pd.DataFrame, price_eur_per_kwh: float, energy_column: str = "predicted_energy_kwh"
) -> pd.DataFrame:
    """Derive cost and CO2 from predicted kWh."""

    result = forecast.copy()
    result["price_eur_per_kwh"] = float(price_eur_per_kwh)
    result["predicted_cost_eur"] = result[energy_column] * result["price_eur_per_kwh"]
    result["predicted_co2_kg"] = (
        result[energy_column] * result["emission_factor_g_per_kwh"] / 1000.0
    )
    result["predicted_energy_per_m2_kwh"] = result[energy_column] / result[
        "living_space_m2"
    ].replace(0, pd.NA)
    return result
