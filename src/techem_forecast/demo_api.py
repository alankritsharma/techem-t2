"""Thin FastAPI layer over generated demo JSON outputs plus deterministic live simulation."""

from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware


DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
LOCAL_NETWORK_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost|127\.0\.0\.1|"
    r"10(?:\.\d{1,3}){3}|"
    r"192\.168(?:\.\d{1,3}){2}|"
    r"172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}"
    r")(?::\d+)?$"
)

REQUIRED_FILES = [
    "demo_users.json",
    "landlord_summaries.json",
    "property_summaries.json",
    "property_monthly_summary.json",
    "tenant_summaries.json",
    "tenant_monthly_summary.json",
    "daily_forecast.json",
    "contract_manifest.json",
]

LIVE_SCENARIOS = {"normal", "cold_snap", "high_usage", "eco_mode"}

TENANT_ROOM_TEMP_BOUNDS = {
    "off": (17.0, 18.5),
    "eco": (18.0, 19.5),
    "comfort": (19.0, 21.0),
    "boost": (20.0, 22.5),
}


class DemoDataStore:
    """Loads and serves the generated JSON payloads from outputs/demo-like folders."""

    def __init__(self, output_dir: str | Path):
        self.output_dir = Path(output_dir)
        self._cache: dict[str, Any] = {}
        self.reload()

    def reload(self) -> None:
        missing = [name for name in REQUIRED_FILES if not (self.output_dir / name).exists()]
        if missing:
            raise FileNotFoundError(
                f"Missing required demo output files in {self.output_dir}: {', '.join(missing)}"
            )

        self._cache = {}
        for path in sorted(self.output_dir.glob("*.json")):
            with path.open(encoding="utf-8") as handle:
                self._cache[path.name] = json.load(handle)

        self._build_indexes()

    def get(self, filename: str) -> Any:
        return self._cache[filename]

    def get_unit_forecast(self, unit_id: str) -> list[dict[str, Any]]:
        return list(self._unit_forecast_index.get(unit_id, []))

    def get_property_forecast(self, property_id: str) -> list[dict[str, Any]]:
        return list(self._property_forecast_index.get(property_id, []))

    def get_tenant_summary(self, tenant_id: str) -> dict[str, Any]:
        return self._tenant_summary_index[tenant_id]

    def get_unit_summary(self, unit_id: str) -> dict[str, Any]:
        return self._unit_summary_index[unit_id]

    def get_property_summary(self, property_id: str) -> dict[str, Any]:
        return self._property_summary_index[property_id]

    def get_property_units(self, property_id: str) -> list[dict[str, Any]]:
        return list(self._property_units_index.get(property_id, []))

    def get_unit_registry(self, unit_id: str) -> dict[str, Any]:
        return self._unit_registry_index[unit_id]

    def _build_indexes(self) -> None:
        self._tenant_summary_index = {
            item["tenant_id"]: item for item in self._cache.get("tenant_summaries.json", [])
        }
        self._unit_summary_index = {
            item["unit_id"]: item for item in self._cache.get("tenant_summaries.json", [])
        }
        self._property_summary_index = {
            item["property_id"]: item for item in self._cache.get("property_summaries.json", [])
        }
        self._unit_registry_index = {
            item["unit_id"]: item for item in self._cache.get("unit_registry.json", [])
        }
        self._property_units_index: dict[str, list[dict[str, Any]]] = {}
        for item in self._cache.get("tenant_summaries.json", []):
            self._property_units_index.setdefault(item.get("property_id", ""), []).append(item)
        self._unit_forecast_index: dict[str, list[dict[str, Any]]] = {}
        self._property_forecast_index: dict[str, list[dict[str, Any]]] = {}
        for row in self._cache.get("daily_forecast.json", []):
            self._unit_forecast_index.setdefault(row.get("unit_id", ""), []).append(row)
            self._property_forecast_index.setdefault(row.get("property_id", ""), []).append(row)


@dataclass
class DemoSession:
    user: dict[str, Any]


class LiveSimulationStore:
    """Small in-memory live simulation store derived from demo forecast payloads."""

    def __init__(self, data_store: DemoDataStore):
        self.data_store = data_store
        self.global_scenario = "normal"
        self._tenant_sessions: dict[str, dict[str, Any]] = {}
        self._landlord_sessions: dict[str, dict[str, Any]] = {}

    def start_tenant(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        session = self._build_tenant_session(tenant_user, self.global_scenario)
        self._tenant_sessions[tenant_id] = session
        return session

    def get_tenant(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        if tenant_id not in self._tenant_sessions:
            return self._build_inactive_tenant_session(tenant_user)
        return self._build_tenant_session(tenant_user, self._tenant_sessions[tenant_id]["scenario"])

    def stop_tenant(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        session = self._tenant_sessions.pop(tenant_id, None)
        return {
            "status": "stopped",
            "scope": "tenant",
            "tenant_id": tenant_id,
            "had_active_session": session is not None,
            "source": "synthetic_live_simulation",
        }

    def start_landlord(self, landlord_user: dict[str, Any]) -> dict[str, Any]:
        landlord_id = str(landlord_user["landlord_id"])
        session = self._build_landlord_session(landlord_user, self.global_scenario)
        self._landlord_sessions[landlord_id] = session
        return session

    def get_landlord(self, landlord_user: dict[str, Any]) -> dict[str, Any]:
        landlord_id = str(landlord_user["landlord_id"])
        if landlord_id not in self._landlord_sessions:
            return self._build_inactive_landlord_session(landlord_user)
        return self._build_landlord_session(landlord_user, self._landlord_sessions[landlord_id]["scenario"])

    def stop_landlord(self, landlord_user: dict[str, Any]) -> dict[str, Any]:
        landlord_id = str(landlord_user["landlord_id"])
        session = self._landlord_sessions.pop(landlord_id, None)
        return {
            "status": "stopped",
            "scope": "landlord",
            "landlord_id": landlord_id,
            "had_active_session": session is not None,
            "source": "synthetic_live_simulation",
        }

    def update_scenario(self, user: dict[str, Any], scenario: str) -> dict[str, Any]:
        scenario_name = str(scenario).strip().lower()
        if scenario_name not in LIVE_SCENARIOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Scenario must be one of: {', '.join(sorted(LIVE_SCENARIOS))}",
            )
        self.global_scenario = scenario_name

        if user.get("role") == "tenant":
            tenant_id = str(user["tenant_id"])
            if tenant_id in self._tenant_sessions:
                self._tenant_sessions[tenant_id]["scenario"] = scenario_name
        if user.get("role") == "landlord":
            landlord_id = str(user["landlord_id"])
            if landlord_id in self._landlord_sessions:
                self._landlord_sessions[landlord_id]["scenario"] = scenario_name

        return {
            "status": "updated",
            "scenario": scenario_name,
            "updated_by": user.get("user_id"),
            "active_tenant_sessions": len(self._tenant_sessions),
            "active_landlord_sessions": len(self._landlord_sessions),
            "source": "synthetic_live_simulation",
        }

    def status(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "scenario": self.global_scenario,
            "active_tenant_sessions": len(self._tenant_sessions),
            "active_landlord_sessions": len(self._landlord_sessions),
            "supported_scenarios": sorted(LIVE_SCENARIOS),
            "source": "synthetic_live_simulation",
        }

    def tenant_advice(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        live = self.get_tenant(tenant_user)
        if live.get("status") != "active":
            return {
                "tenant_id": str(tenant_user["tenant_id"]),
                "scenario": self.global_scenario,
                "advice": [],
                "source": "synthetic_live_simulation",
            }
        state = live["live_state"]
        advice: list[dict[str, Any]] = []

        if state["projected_end_of_day_kwh"] > live["baseline"]["predicted_energy_kwh"] * 1.08:
            advice.append(
                {
                    "priority": "high",
                    "title": "Projected usage is above forecast",
                    "message": "Lower the setpoint slightly or switch to eco mode to bring usage back toward baseline.",
                }
            )
        if state["window_open_risk"] >= 0.5:
            advice.append(
                {
                    "priority": "medium",
                    "title": "Window-open risk is elevated",
                    "message": "Check for open windows or over-ventilation while heating is active.",
                }
            )
        if state["radiator_valve_open_pct"] >= 85:
            advice.append(
                {
                    "priority": "medium",
                    "title": "Radiator valve is working hard",
                    "message": "A small setpoint reduction could cut live demand without a sharp comfort drop.",
                }
            )
        if not advice:
            advice.append(
                {
                    "priority": "low",
                    "title": "Live status is stable",
                    "message": "Current simulated values are close to the synthetic forecast baseline.",
                }
            )

        return {
            "tenant_id": tenant_user["tenant_id"],
            "scenario": live["scenario"],
            "advice": advice,
            "source": "synthetic_live_simulation",
        }

    def tenant_prediction(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        summary = self.data_store.get_tenant_summary(tenant_id)
        unit_id = str(summary["unit_id"])
        forecasts = self.data_store.get_unit_forecast(unit_id)
        return {
            "tenant_id": tenant_id,
            "unit_id": unit_id,
            "scenario": self._tenant_sessions.get(tenant_id, {}).get("scenario", self.global_scenario),
            "prediction_totals": _prediction_totals(forecasts),
            "source": "synthetic_live_simulation",
        }

    def landlord_risk(self, landlord_user: dict[str, Any]) -> dict[str, Any]:
        live = self.get_landlord(landlord_user)
        state = live["live_state"]
        risk_level = "low"
        if state["portfolio_projected_end_of_day_kwh"] > state["portfolio_baseline_day_kwh"] * 1.12:
            risk_level = "high"
        elif state["portfolio_projected_end_of_day_kwh"] > state["portfolio_baseline_day_kwh"] * 1.05:
            risk_level = "medium"

        return {
            "landlord_id": landlord_user["landlord_id"],
            "scenario": live["scenario"],
            "risk_level": risk_level,
            "portfolio_baseline_day_kwh": state["portfolio_baseline_day_kwh"],
            "portfolio_projected_end_of_day_kwh": state["portfolio_projected_end_of_day_kwh"],
            "risk_flags": state["risk_flags"],
            "property_rollup": live["property_live"],
            "source": "synthetic_live_simulation",
        }

    def _build_inactive_tenant_session(self, tenant_user: dict[str, Any]) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        summary = self.data_store.get_tenant_summary(tenant_id)
        unit_id = str(summary["unit_id"])
        registry = self.data_store.get_unit_registry(unit_id)
        forecasts = self.data_store.get_unit_forecast(unit_id)
        baseline = forecasts[0] if forecasts else {
            "date": None,
            "predicted_energy_kwh": 0.0,
            "predicted_cost_eur": 0.0,
            "predicted_co2_kg": 0.0,
        }
        return {
            "status": "inactive",
            "scope": "tenant",
            "scenario": self.global_scenario,
            "tenant_id": tenant_id,
            "unit_id": unit_id,
            "property_id": summary["property_id"],
            "simulated_progress_pct": 0.0,
            "baseline": {
                "date": baseline["date"],
                "predicted_energy_kwh": _round3(float(baseline["predicted_energy_kwh"])),
                "predicted_cost_eur": _round3(float(baseline["predicted_cost_eur"])),
                "predicted_co2_kg": _round3(float(baseline["predicted_co2_kg"])),
            },
            "live_state": {
                "live_consumption_so_far_kwh": 0.0,
                "projected_end_of_day_kwh": _round3(float(baseline["predicted_energy_kwh"])),
                "room_temperature_c": float(baseline.get("room_temperature_c", 19.5) or 19.5),
                "heater_setpoint_c": float(baseline.get("heater_setpoint_c", 20.0) or 20.0),
                "radiator_valve_open_pct": float(baseline.get("radiator_valve_open_pct", 0.0) or 0.0),
                "humidity_pct": float(baseline.get("humidity_pct", 45.0) or 45.0),
                "occupancy_proxy": float(baseline.get("occupancy_proxy", 0.0) or 0.0),
                "window_open_risk": float(baseline.get("window_open_risk", 0.0) or 0.0),
                "heating_mode": str(baseline.get("heating_mode", "comfort") or "comfort"),
            },
            "unit_registry": registry,
            "prediction_totals": _prediction_totals(forecasts),
            "source": "synthetic_live_simulation",
        }

    def _build_inactive_landlord_session(self, landlord_user: dict[str, Any]) -> dict[str, Any]:
        landlord_id = str(landlord_user["landlord_id"])
        property_ids = list(landlord_user.get("property_ids", []))
        unit_live = self._build_landlord_unit_live(property_ids, self.global_scenario, active=False)
        property_live = self._rollup_property_live(unit_live)
        baseline_day_total = _round3(sum(float(item["baseline_day_kwh"]) for item in property_live))

        for item in property_live:
            item["live_consumption_so_far_kwh"] = 0.0

        return {
            "status": "inactive",
            "scope": "landlord",
            "scenario": self.global_scenario,
            "landlord_id": landlord_id,
            "property_ids": property_ids,
            "live_state": {
                "portfolio_baseline_day_kwh": _round3(baseline_day_total),
                "portfolio_live_consumption_so_far_kwh": 0.0,
                "portfolio_projected_end_of_day_kwh": _round3(baseline_day_total),
                "risk_flags": [],
            },
            "property_live": property_live,
            "unit_live": unit_live,
            "source": "synthetic_live_simulation",
        }

    def _build_tenant_session(self, tenant_user: dict[str, Any], scenario: str) -> dict[str, Any]:
        tenant_id = str(tenant_user["tenant_id"])
        summary = self.data_store.get_tenant_summary(tenant_id)
        unit_id = str(summary["unit_id"])
        registry = self.data_store.get_unit_registry(unit_id)
        forecasts = self.data_store.get_unit_forecast(unit_id)
        if not forecasts:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No unit forecast rows found")

        baseline = forecasts[0]
        progress = _progress_fraction(tenant_id, scenario)
        modifiers = _scenario_modifiers(scenario)
        projected_end = _round3(float(baseline["predicted_energy_kwh"]) * modifiers["energy_multiplier"])
        live_so_far = _round3(projected_end * progress)
        heating_mode = _scenario_mode(str(baseline.get("heating_mode", "comfort")), scenario)
        heater_setpoint = _align_setpoint_to_mode(
            float(baseline.get("heater_setpoint_c", 20.0)) + modifiers["setpoint_delta_c"],
            heating_mode,
        )
        room_temperature = _align_room_temp_to_mode(
            float(baseline.get("room_temperature_c", 19.5))
            + modifiers["room_temp_delta_c"]
            + _oscillation(tenant_id, scenario, "room", amplitude=0.25),
            heating_mode,
        )
        radiator_valve = _clamp(
            float(baseline.get("radiator_valve_open_pct", 35.0)) + modifiers["valve_delta_pct"],
            0.0,
            100.0,
        )
        humidity = _clamp(
            float(baseline.get("humidity_pct", 48.0))
            + modifiers["humidity_delta_pct"]
            + _oscillation(tenant_id, scenario, "humidity", amplitude=1.5),
            28.0,
            68.0,
        )
        occupancy = _clamp(
            float(baseline.get("occupancy_proxy", 0.5)) + modifiers["occupancy_delta"],
            0.0,
            1.0,
        )
        window_open_risk = _clamp(
            float(baseline.get("window_open_risk", 0.2)) + modifiers["window_risk_delta"],
            0.0,
            1.0,
        )

        return {
            "status": "active",
            "scope": "tenant",
            "scenario": scenario,
            "tenant_id": tenant_id,
            "unit_id": unit_id,
            "property_id": summary["property_id"],
            "simulated_progress_pct": _round3(progress * 100.0),
            "baseline": {
                "date": baseline["date"],
                "predicted_energy_kwh": _round3(float(baseline["predicted_energy_kwh"])),
                "predicted_cost_eur": _round3(float(baseline["predicted_cost_eur"])),
                "predicted_co2_kg": _round3(float(baseline["predicted_co2_kg"])),
            },
            "live_state": {
                "live_consumption_so_far_kwh": live_so_far,
                "projected_end_of_day_kwh": projected_end,
                "room_temperature_c": room_temperature,
                "heater_setpoint_c": heater_setpoint,
                "radiator_valve_open_pct": _round3(radiator_valve),
                "humidity_pct": _round3(humidity),
                "occupancy_proxy": _round4(occupancy),
                "window_open_risk": _round4(window_open_risk),
                "heating_mode": heating_mode,
            },
            "unit_registry": registry,
            "prediction_totals": _prediction_totals(forecasts),
            "source": "synthetic_live_simulation",
        }

    def _build_landlord_unit_live(
        self, property_ids: list[str], scenario: str, active: bool
    ) -> list[dict[str, Any]]:
        unit_live: list[dict[str, Any]] = []

        for property_id in property_ids:
            property_summary = self.data_store.get_property_summary(property_id)
            for unit_summary in self.data_store.get_property_units(property_id):
                unit_id = str(unit_summary["unit_id"])
                forecasts = self.data_store.get_unit_forecast(unit_id)
                if not forecasts:
                    continue

                baseline = forecasts[0]
                progress = _progress_fraction(unit_id, scenario) if active else 0.0
                modifiers = _scenario_modifiers(scenario)
                projected_end = _round3(
                    float(baseline["predicted_energy_kwh"])
                    * (modifiers["energy_multiplier"] if active else 1.0)
                )
                live_so_far = _round3(projected_end * progress)
                heating_mode = _scenario_mode(
                    str(baseline.get("heating_mode", "comfort")),
                    scenario if active else "normal",
                )
                heater_setpoint = _align_setpoint_to_mode(
                    float(baseline.get("heater_setpoint_c", 20.0))
                    + (modifiers["setpoint_delta_c"] if active else 0.0),
                    heating_mode,
                )
                room_temperature = _align_room_temp_to_mode(
                    float(baseline.get("room_temperature_c", 19.5))
                    + (modifiers["room_temp_delta_c"] if active else 0.0)
                    + (_oscillation(unit_id, scenario, "room", amplitude=0.25) if active else 0.0),
                    heating_mode,
                )
                radiator_valve = _clamp(
                    float(baseline.get("radiator_valve_open_pct", 35.0))
                    + (modifiers["valve_delta_pct"] if active else 0.0),
                    0.0,
                    100.0,
                )
                humidity = _clamp(
                    float(baseline.get("humidity_pct", 48.0))
                    + (modifiers["humidity_delta_pct"] if active else 0.0)
                    + (_oscillation(unit_id, scenario, "humidity", amplitude=1.5) if active else 0.0),
                    28.0,
                    68.0,
                )
                occupancy = _clamp(
                    float(baseline.get("occupancy_proxy", 0.5))
                    + (modifiers["occupancy_delta"] if active else 0.0),
                    0.0,
                    1.0,
                )
                window_open_risk = _clamp(
                    float(baseline.get("window_open_risk", 0.2))
                    + (modifiers["window_risk_delta"] if active else 0.0),
                    0.0,
                    1.0,
                )

                unit_live.append(
                    {
                        "property_id": property_id,
                        "property_display_name": property_summary["display_name"],
                        "city": property_summary["city"],
                        "tenant_id": unit_summary["tenant_id"],
                        "unit_id": unit_id,
                        "unit_display_name": unit_summary["unit_display_name"],
                        "unit_number": unit_summary["unit_number"],
                        "tenant_display_name": unit_summary["tenant_display_name"],
                        "baseline_day_kwh": _round3(float(baseline["predicted_energy_kwh"])),
                        "live_consumption_so_far_kwh": live_so_far,
                        "projected_end_of_day_kwh": projected_end,
                        "prediction_totals": _prediction_totals(forecasts),
                        "live_state": {
                            "room_temperature_c": room_temperature,
                            "heater_setpoint_c": heater_setpoint,
                            "radiator_valve_open_pct": _round3(radiator_valve),
                            "humidity_pct": _round3(humidity),
                            "occupancy_proxy": _round4(occupancy),
                            "window_open_risk": _round4(window_open_risk),
                            "heating_mode": heating_mode,
                        },
                    }
                )

        return sorted(
            unit_live,
            key=lambda item: (
                item.get("property_display_name", ""),
                item.get("unit_number", 0),
                item.get("unit_id", ""),
            ),
        )

    def _rollup_property_live(self, unit_live: list[dict[str, Any]]) -> list[dict[str, Any]]:
        property_map: dict[str, dict[str, Any]] = {}
        for item in unit_live:
            property_id = str(item["property_id"])
            current = property_map.get(property_id)
            if current is None:
                current = {
                    "property_id": property_id,
                    "display_name": item["property_display_name"],
                    "city": item["city"],
                    "baseline_day_kwh": 0.0,
                    "live_consumption_so_far_kwh": 0.0,
                    "projected_end_of_day_kwh": 0.0,
                    "prediction_totals": {
                        "2d": {"predicted_energy_kwh": 0.0, "predicted_cost_eur": 0.0, "predicted_co2_kg": 0.0},
                        "3d": {"predicted_energy_kwh": 0.0, "predicted_cost_eur": 0.0, "predicted_co2_kg": 0.0},
                        "7d": {"predicted_energy_kwh": 0.0, "predicted_cost_eur": 0.0, "predicted_co2_kg": 0.0},
                    },
                }
                property_map[property_id] = current

            current["baseline_day_kwh"] = _round3(
                current["baseline_day_kwh"] + float(item["baseline_day_kwh"])
            )
            current["live_consumption_so_far_kwh"] = _round3(
                current["live_consumption_so_far_kwh"] + float(item["live_consumption_so_far_kwh"])
            )
            current["projected_end_of_day_kwh"] = _round3(
                current["projected_end_of_day_kwh"] + float(item["projected_end_of_day_kwh"])
            )
            for window in ["2d", "3d", "7d"]:
                for metric in ["predicted_energy_kwh", "predicted_cost_eur", "predicted_co2_kg"]:
                    current["prediction_totals"][window][metric] = _round3(
                        current["prediction_totals"][window][metric]
                        + float(item["prediction_totals"][window][metric])
                    )

        return sorted(property_map.values(), key=lambda item: item["display_name"])

    def _build_landlord_session(self, landlord_user: dict[str, Any], scenario: str) -> dict[str, Any]:
        landlord_id = str(landlord_user["landlord_id"])
        property_ids = list(landlord_user.get("property_ids", []))
        unit_live = self._build_landlord_unit_live(property_ids, scenario, active=True)
        property_live = self._rollup_property_live(unit_live)
        baseline_day_total = 0.0
        live_so_far_total = 0.0
        projected_day_total = 0.0
        risk_flags: list[dict[str, Any]] = []

        for property_payload in property_live:
            property_id = str(property_payload["property_id"])
            baseline_day = float(property_payload["baseline_day_kwh"])
            live_so_far = float(property_payload["live_consumption_so_far_kwh"])
            projected_day = float(property_payload["projected_end_of_day_kwh"])
            baseline_day_total += baseline_day
            live_so_far_total += live_so_far
            projected_day_total += projected_day

            if projected_day > baseline_day * 1.12:
                risk_flags.append(
                    {
                        "property_id": property_id,
                        "severity": "high",
                        "message": "Simulated live demand is materially above the synthetic baseline.",
                    }
                )
            elif projected_day > baseline_day * 1.05:
                risk_flags.append(
                    {
                        "property_id": property_id,
                        "severity": "medium",
                        "message": "Simulated live demand is moderately above the synthetic baseline.",
                    }
                )

        return {
            "status": "active",
            "scope": "landlord",
            "scenario": scenario,
            "landlord_id": landlord_id,
            "property_ids": property_ids,
            "live_state": {
                "portfolio_baseline_day_kwh": _round3(baseline_day_total),
                "portfolio_live_consumption_so_far_kwh": _round3(live_so_far_total),
                "portfolio_projected_end_of_day_kwh": _round3(projected_day_total),
                "risk_flags": risk_flags,
            },
            "property_live": property_live,
            "unit_live": unit_live,
            "source": "synthetic_live_simulation",
        }


def create_app(output_dir: str | Path = "outputs/demo") -> FastAPI:
    store = DemoDataStore(output_dir)
    live_store = LiveSimulationStore(store)

    app = FastAPI(title="Techem Demo API", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=DEFAULT_ALLOWED_ORIGINS,
        allow_origin_regex=LOCAL_NETWORK_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.demo_store = store
    app.state.live_store = live_store
    app.state.output_dir = str(Path(output_dir).resolve())

    def _unauthorized(message: str = "Unauthorized") -> HTTPException:
        return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)

    def _forbidden(message: str = "Forbidden") -> HTTPException:
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)

    def get_store() -> DemoDataStore:
        return app.state.demo_store

    def get_live_store() -> LiveSimulationStore:
        return app.state.live_store

    def get_session(
        authorization: str | None = Header(default=None),
        store: DemoDataStore = Depends(get_store),
    ) -> DemoSession:
        if not authorization or not authorization.startswith("Bearer "):
            raise _unauthorized("Missing bearer token")
        token = authorization.removeprefix("Bearer ").strip()
        user = _decode_demo_token(token, store)
        if not user:
            raise _unauthorized("Invalid demo token")
        return DemoSession(user=user)

    def require_landlord(session: DemoSession = Depends(get_session)) -> DemoSession:
        if session.user.get("role") != "landlord":
            raise _forbidden("Landlord role required")
        return session

    def require_tenant(session: DemoSession = Depends(get_session)) -> DemoSession:
        if session.user.get("role") != "tenant":
            raise _forbidden("Tenant role required")
        return session

    @app.get("/health")
    def health(store: DemoDataStore = Depends(get_store)) -> dict[str, Any]:
        manifest = store.get("contract_manifest.json")
        return {
            "status": "ok",
            "output_dir": app.state.output_dir,
            "generated_at": manifest.get("generated_at"),
            "forecast_start_date": manifest.get("forecast_start_date"),
            "forecast_end_date": manifest.get("forecast_end_date"),
        }

    @app.post("/auth/login")
    def login(payload: dict[str, str], store: DemoDataStore = Depends(get_store)) -> dict[str, Any]:
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        user = _find_user_by_credentials(username, password, store)
        if not user:
            raise _unauthorized("Invalid demo credentials")
        token = _encode_demo_token(user)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _public_user(user),
        }

    @app.get("/auth/me")
    def me(session: DemoSession = Depends(get_session)) -> dict[str, Any]:
        return _public_user(session.user)

    @app.get("/landlord/dashboard")
    def landlord_dashboard(
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> dict[str, Any]:
        summary = _find_one(
            store.get("landlord_summaries.json"),
            lambda item: item["landlord_id"] == session.user["landlord_id"],
            "Landlord summary not found",
        )
        return summary

    @app.get("/landlord/properties")
    def landlord_properties(
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        landlord_id = session.user["landlord_id"]
        return [
            item
            for item in store.get("property_summaries.json")
            if item.get("landlord_id") == landlord_id
        ]

    @app.get("/properties/{property_id}")
    def property_detail(
        property_id: str,
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> dict[str, Any]:
        _assert_landlord_has_property(session.user, property_id)
        return _find_one(
            store.get("property_summaries.json"),
            lambda item: item["property_id"] == property_id,
            "Property summary not found",
        )

    @app.get("/properties/{property_id}/daily")
    def property_daily(
        property_id: str,
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        _assert_landlord_has_property(session.user, property_id)
        return [
            item
            for item in store.get("daily_forecast.json")
            if item.get("property_id") == property_id
        ]

    @app.get("/properties/{property_id}/monthly")
    def property_monthly(
        property_id: str,
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        _assert_landlord_has_property(session.user, property_id)
        return [
            item
            for item in store.get("property_monthly_summary.json")
            if item.get("property_id") == property_id
        ]

    @app.get("/properties/{property_id}/units")
    def property_units(
        property_id: str,
        session: DemoSession = Depends(require_landlord),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        _assert_landlord_has_property(session.user, property_id)
        units = sorted(
            store.get_property_units(property_id),
            key=lambda item: (item.get("unit_number") is None, item.get("unit_number", 0), item.get("unit_id", "")),
        )
        return [_public_unit_summary(item) for item in units]

    @app.get("/tenant/dashboard")
    def tenant_dashboard(
        session: DemoSession = Depends(require_tenant),
        store: DemoDataStore = Depends(get_store),
    ) -> dict[str, Any]:
        tenant_id = session.user["tenant_id"]
        return _find_one(
            store.get("tenant_summaries.json"),
            lambda item: item["tenant_id"] == tenant_id,
            "Tenant summary not found",
        )

    @app.get("/tenant/daily")
    def tenant_daily(
        session: DemoSession = Depends(require_tenant),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        unit_id = session.user["unit_id"]
        return [
            item
            for item in store.get("daily_forecast.json")
            if item.get("unit_id") == unit_id
        ]

    @app.get("/tenant/monthly")
    def tenant_monthly(
        session: DemoSession = Depends(require_tenant),
        store: DemoDataStore = Depends(get_store),
    ) -> list[dict[str, Any]]:
        tenant_id = session.user["tenant_id"]
        return [
            item
            for item in store.get("tenant_monthly_summary.json")
            if item.get("tenant_id") == tenant_id
        ]

    @app.post("/tenant/live/start")
    def tenant_live_start(
        session: DemoSession = Depends(require_tenant),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.start_tenant(session.user)

    @app.get("/tenant/live")
    def tenant_live(
        session: DemoSession = Depends(require_tenant),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.get_tenant(session.user)

    @app.post("/tenant/live/stop")
    def tenant_live_stop(
        session: DemoSession = Depends(require_tenant),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.stop_tenant(session.user)

    @app.get("/tenant/advice")
    def tenant_advice(
        session: DemoSession = Depends(require_tenant),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.tenant_advice(session.user)

    @app.get("/tenant/prediction")
    def tenant_prediction(
        session: DemoSession = Depends(require_tenant),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.tenant_prediction(session.user)

    @app.post("/landlord/live/start")
    def landlord_live_start(
        session: DemoSession = Depends(require_landlord),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.start_landlord(session.user)

    @app.get("/landlord/live")
    def landlord_live(
        session: DemoSession = Depends(require_landlord),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.get_landlord(session.user)

    @app.post("/landlord/live/stop")
    def landlord_live_stop(
        session: DemoSession = Depends(require_landlord),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.stop_landlord(session.user)

    @app.get("/landlord/risk")
    def landlord_risk(
        session: DemoSession = Depends(require_landlord),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.landlord_risk(session.user)

    @app.post("/live/scenario")
    def live_scenario(
        payload: dict[str, str],
        session: DemoSession = Depends(get_session),
        live_store: LiveSimulationStore = Depends(get_live_store),
    ) -> dict[str, Any]:
        return live_store.update_scenario(session.user, payload.get("scenario", ""))

    @app.get("/live/status")
    def live_status(live_store: LiveSimulationStore = Depends(get_live_store)) -> dict[str, Any]:
        return live_store.status()

    return app


def _find_user_by_credentials(
    username: str, password: str, store: DemoDataStore
) -> dict[str, Any] | None:
    for user in store.get("demo_users.json"):
        if user.get("username") == username and user.get("password") == password:
            return user
    return None


def _encode_demo_token(user: dict[str, Any]) -> str:
    return f"demo-token:{user['user_id']}"


def _decode_demo_token(token: str, store: DemoDataStore) -> dict[str, Any] | None:
    prefix = "demo-token:"
    if not token.startswith(prefix):
        return None
    user_id = token[len(prefix) :]
    for user in store.get("demo_users.json"):
        if user.get("user_id") == user_id:
            return user
    return None


def _public_user(user: dict[str, Any]) -> dict[str, Any]:
    public = {key: value for key, value in user.items() if key != "password"}
    public["demo_token_hint"] = _encode_demo_token(user)
    return public


def _public_unit_summary(unit: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in unit.items()
        if key not in {"tenant_password", "password"}
    }


def _assert_landlord_has_property(user: dict[str, Any], property_id: str) -> None:
    if property_id not in set(user.get("property_ids", [])):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Property not assigned")


def _find_one(items: list[dict[str, Any]], predicate, not_found_message: str) -> dict[str, Any]:
    for item in items:
        if predicate(item):
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_message)


def _prediction_totals(rows: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    sorted_rows = _aggregate_daily_rows(rows)
    totals = {}
    for days in [2, 3, 7]:
        window = sorted_rows[:days]
        totals[f"{days}d"] = {
            "predicted_energy_kwh": _round3(sum(float(item.get("predicted_energy_kwh", 0.0)) for item in window)),
            "predicted_cost_eur": _round3(sum(float(item.get("predicted_cost_eur", 0.0)) for item in window)),
            "predicted_co2_kg": _round3(sum(float(item.get("predicted_co2_kg", 0.0)) for item in window)),
        }
    return totals


def _aggregate_daily_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_date: dict[str, dict[str, Any]] = {}
    for row in rows:
        date = str(row["date"])
        current = by_date.get(date)
        if current is None:
            current = {
                "date": date,
                "predicted_energy_kwh": 0.0,
                "predicted_cost_eur": 0.0,
                "predicted_co2_kg": 0.0,
            }
            by_date[date] = current
        current["predicted_energy_kwh"] += float(row.get("predicted_energy_kwh", 0.0))
        current["predicted_cost_eur"] += float(row.get("predicted_cost_eur", 0.0))
        current["predicted_co2_kg"] += float(row.get("predicted_co2_kg", 0.0))

    return [by_date[key] for key in sorted(by_date)]


def _scenario_modifiers(scenario: str) -> dict[str, float]:
    mapping = {
        "normal": {
            "energy_multiplier": 1.0,
            "setpoint_delta_c": 0.0,
            "room_temp_delta_c": 0.0,
            "valve_delta_pct": 0.0,
            "humidity_delta_pct": 0.0,
            "occupancy_delta": 0.0,
            "window_risk_delta": 0.0,
        },
        "cold_snap": {
            "energy_multiplier": 1.14,
            "setpoint_delta_c": 0.25,
            "room_temp_delta_c": -0.25,
            "valve_delta_pct": 14.0,
            "humidity_delta_pct": -1.0,
            "occupancy_delta": 0.02,
            "window_risk_delta": -0.05,
        },
        "high_usage": {
            "energy_multiplier": 1.18,
            "setpoint_delta_c": 0.5,
            "room_temp_delta_c": 0.35,
            "valve_delta_pct": 12.0,
            "humidity_delta_pct": 0.6,
            "occupancy_delta": 0.08,
            "window_risk_delta": 0.12,
        },
        "eco_mode": {
            "energy_multiplier": 0.88,
            "setpoint_delta_c": -0.9,
            "room_temp_delta_c": -0.45,
            "valve_delta_pct": -18.0,
            "humidity_delta_pct": 0.8,
            "occupancy_delta": -0.04,
            "window_risk_delta": -0.04,
        },
    }
    return mapping[scenario]


def _scenario_mode(baseline_mode: str, scenario: str) -> str:
    if scenario == "eco_mode":
        if baseline_mode == "boost":
            return "comfort"
        if baseline_mode == "comfort":
            return "eco"
    if scenario == "high_usage" and baseline_mode in {"off", "eco"}:
        return "comfort"
    if scenario == "cold_snap" and baseline_mode != "boost":
        return "boost" if baseline_mode == "comfort" else "comfort"
    return baseline_mode


def _progress_fraction(entity_id: str, scenario: str) -> float:
    value = _stable_fraction(entity_id, scenario, "progress")
    return 0.22 + (0.46 * value)


def _oscillation(entity_id: str, scenario: str, channel: str, amplitude: float) -> float:
    return amplitude * ((_stable_fraction(entity_id, scenario, channel) * 2.0) - 1.0)


def _stable_fraction(*parts: object) -> float:
    digest = sha256("::".join(str(part) for part in parts).encode("utf-8")).hexdigest()
    return int(digest[:12], 16) / float(16**12 - 1)


def _align_setpoint_to_mode(setpoint: float, heating_mode: str) -> float:
    bounds = {
        "off": (17.5, 19.4),
        "eco": (18.3, 20.1),
        "comfort": (19.2, 21.2),
        "boost": (20.1, 22.6),
    }
    lower, upper = bounds.get(heating_mode, (17.5, 22.6))
    return _round3(_clamp(setpoint, lower, upper))


def _align_room_temp_to_mode(room_temp: float, heating_mode: str) -> float:
    lower, upper = TENANT_ROOM_TEMP_BOUNDS.get(heating_mode, (17.0, 22.5))
    return _round3(_clamp(room_temp, lower, upper))


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _round3(value: float) -> float:
    return round(float(value), 3)


def _round4(value: float) -> float:
    return round(float(value), 4)
