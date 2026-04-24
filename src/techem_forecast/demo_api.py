"""Thin FastAPI layer over generated demo JSON outputs."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware


DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

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


class DemoDataStore:
    """Loads and serves the generated JSON payloads from outputs/demo."""

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

    def get(self, filename: str) -> Any:
        return self._cache[filename]


@dataclass
class DemoSession:
    user: dict[str, Any]


def create_app(output_dir: str | Path = "outputs/demo") -> FastAPI:
    store = DemoDataStore(output_dir)

    app = FastAPI(title="Techem Demo API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=DEFAULT_ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.demo_store = store
    app.state.output_dir = str(Path(output_dir).resolve())

    def _unauthorized(message: str = "Unauthorized") -> HTTPException:
        return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)

    def _forbidden(message: str = "Forbidden") -> HTTPException:
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)

    def get_store() -> DemoDataStore:
        return app.state.demo_store

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


def _assert_landlord_has_property(user: dict[str, Any], property_id: str) -> None:
    if property_id not in set(user.get("property_ids", [])):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Property not assigned")


def _find_one(items: list[dict[str, Any]], predicate, not_found_message: str) -> dict[str, Any]:
    for item in items:
        if predicate(item):
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_message)
