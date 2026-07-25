"""Persistence service for analytics and advanced application settings."""

from __future__ import annotations

import json
from typing import Any

from app.infrastructure.database import Database
from app.validation.analytics import AnalyticsSettingsUpdate
from app.services.analytics_config import (
    BOOL_SETTINGS,
    CHARTS,
    CHART_SETTING_KEYS,
    DEFAULT_SETTINGS,
    FLOAT_SETTINGS,
    INT_SETTINGS,
    SETTING_KEYS,
    SIMPLE_PRIMARY_CHARTS,
)
from app.utils import utc_now


class AnalyticsSettingsService:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get(self) -> dict[str, Any]:
        with self.database.connection() as connection:
            values = {
                row["key"]: row["value"]
                for row in connection.execute("SELECT key,value FROM app_settings").fetchall()
            }
        result = dict(DEFAULT_SETTINGS)
        visibility = dict(DEFAULT_SETTINGS["chart_visibility"])
        for chart_id, setting_key in CHART_SETTING_KEYS.items():
            visibility[chart_id] = _as_bool(
                values.get(setting_key),
                bool(DEFAULT_SETTINGS["chart_visibility"].get(chart_id, False)),
            )
        result["chart_visibility"] = visibility
        for name, setting_key in SETTING_KEYS.items():
            if setting_key not in values:
                continue
            raw = values[setting_key]
            if name in BOOL_SETTINGS:
                result[name] = _as_bool(raw, bool(DEFAULT_SETTINGS[name]))
            elif name in FLOAT_SETTINGS:
                result[name] = float(raw)
            elif name in INT_SETTINGS:
                result[name] = int(raw)
            elif name == "chart_order":
                result[name] = _normalize_chart_order(_parse_json_list(raw))
            else:
                result[name] = raw
        result["chart_order"] = _normalize_chart_order(result.get("chart_order"))
        # Drop retired charts still stored as keys in older DBs.
        retired = {"stock-risk"}
        result["chart_visibility"] = {
            chart_id: enabled
            for chart_id, enabled in result["chart_visibility"].items()
            if chart_id in CHARTS and chart_id not in retired
        }
        for chart_id in CHARTS:
            result["chart_visibility"].setdefault(
                chart_id, chart_id in SIMPLE_PRIMARY_CHARTS
            )
        result["chart_order"] = [
            chart_id
            for chart_id in _normalize_chart_order(result.get("chart_order"))
            if chart_id in CHARTS and chart_id not in retired
        ]
        if result.get("featured_chart") not in CHARTS:
            result["featured_chart"] = DEFAULT_SETTINGS["featured_chart"]
        if not result["chart_visibility"].get(result["featured_chart"], False):
            first_enabled = next(
                (chart_id for chart_id, enabled in result["chart_visibility"].items() if enabled),
                None,
            )
            if first_enabled:
                result["featured_chart"] = first_enabled
        # Coerce retired product options stored in older databases.
        result["include_demo"] = True
        result["show_demo_indicator"] = False
        result["count_adjustments"] = False
        return result

    def update(self, payload: AnalyticsSettingsUpdate) -> dict[str, Any]:
        values = payload.model_dump()
        visibility = values.pop("chart_visibility")
        timestamp = utc_now()
        with self.database.transaction() as connection:
            for name, value in values.items():
                setting_key = SETTING_KEYS[name]
                self._write(connection, setting_key, value, timestamp)
            for chart_id, enabled in visibility.items():
                self._write(
                    connection,
                    CHART_SETTING_KEYS[chart_id],
                    enabled,
                    timestamp,
                )
        return self.get()

    def restore_defaults(self) -> dict[str, Any]:
        validated = AnalyticsSettingsUpdate.model_validate(DEFAULT_SETTINGS)
        return self.update(validated)

    @staticmethod
    def _write(connection: Any, key: str, value: Any, timestamp: str) -> None:
        if isinstance(value, bool):
            serialized = "true" if value else "false"
        elif isinstance(value, (list, dict)):
            serialized = json.dumps(value, ensure_ascii=False)
        else:
            serialized = str(value)
        connection.execute(
            """
            INSERT INTO app_settings(key,value,updated_at) VALUES (?,?,?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value,
                                           updated_at=excluded.updated_at
            """,
            (key, serialized, timestamp),
        )


def _as_bool(value: Any, fallback: bool = False) -> bool:
    if value is None:
        return fallback
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_json_list(raw: Any) -> list[Any]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, list):
        return raw
    text = str(raw).strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Tolerate legacy Python-list style strings if ever written.
        return []
    return parsed if isinstance(parsed, list) else []


def _normalize_chart_order(order: Any) -> list[str]:
    known = list(CHARTS.keys())
    seen: set[str] = set()
    result: list[str] = []
    if isinstance(order, list):
        for item in order:
            chart_id = str(item)
            if chart_id in CHARTS and chart_id not in seen:
                result.append(chart_id)
                seen.add(chart_id)
    for chart_id in known:
        if chart_id not in seen:
            result.append(chart_id)
    return result
