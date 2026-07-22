"""Cross-record validation and normalization for staged imports."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.services.backup_excel import (
    CATEGORY_HEADERS,
    LOCATION_HEADERS,
)
from app.errors import AppError
from app.utils import normalize_text, quantity_to_raw, validate_uuid
from app.validation.analytics import AnalyticsSettingsUpdate


class ImportValidation:
    def _validate_parsed(self, parsed: dict[str, Any]) -> list[dict[str, Any]]:
        errors: list[dict[str, Any]] = []
        items = parsed.get("items", [])
        movements = parsed.get("movements", [])
        if len(items) > self.config.maximum_import_rows:
            errors.append(
                {
                    "code": "TOO_MANY_ROWS",
                    "message": f"Jumlah baris melebihi batas {self.config.maximum_import_rows}.",
                }
            )
            return errors
        seen_ids: set[str] = set()
        seen_item_keys: dict[tuple[str, str, str], int] = {}
        normalized_items: list[dict[str, Any]] = []
        for item in items:
            row_number = item.get("source_row")
            row_errors: list[str] = []
            if item.get("_invalid"):
                row_errors.append("Baris bukan objek barang yang valid.")
            name = normalize_text(item.get("name"), empty_to_none=True)
            unit = normalize_text(item.get("unit"), empty_to_none=True)
            if not name or len(name) > 150:
                row_errors.append("Nama barang wajib diisi dan maksimal 150 karakter.")
            if not unit or len(unit) > 32:
                row_errors.append("Satuan wajib diisi dan maksimal 32 karakter.")
            # SKU / prices / currency are no longer part of the product model.
            # Older workbooks may still include them; values are ignored.
            try:
                item_id = validate_uuid(str(item.get("id")), "Item ID")
            except AppError:
                row_errors.append("Item ID tidak valid.")
                item_id = str(item.get("id"))
            if item_id in seen_ids:
                row_errors.append("Item ID duplikat.")
            seen_ids.add(item_id)
            try:
                current_raw = quantity_to_raw(item.get("current_stock", 0), field="current_stock")
            except AppError as exc:
                row_errors.append(exc.message)
                current_raw = 0
            minimum_raw = 0
            purchase_price_raw = 0
            selling_price_raw = 0
            currency_code = "IDR"
            description = normalize_text(item.get("description"), empty_to_none=True)
            if description and len(description) > 1000:
                row_errors.append("Deskripsi maksimal 1000 karakter.")
            category = normalize_text(item.get("category"), empty_to_none=True)
            location = normalize_text(item.get("location"), empty_to_none=True)
            if category and len(category) > 100:
                row_errors.append("Nama kategori maksimal 100 karakter.")
            if location and len(location) > 100:
                row_errors.append("Nama lokasi maksimal 100 karakter.")
            item_key = (
                (name or "").casefold(),
                (category or "").casefold(),
                (location or "").casefold(),
            )
            if name and item_key in seen_item_keys:
                row_errors.append(f"Barang duplikat dengan baris {seen_item_keys[item_key]}.")
            elif name:
                seen_item_keys[item_key] = row_number
            # Archiving was removed; every imported product is active.
            is_active = True
            for timestamp_field in ("created_at", "updated_at"):
                if not self._valid_iso_timestamp(item.get(timestamp_field)):
                    row_errors.append(f"{timestamp_field} tidak valid.")
            if row_errors:
                errors.append(
                    {
                        "row": row_number,
                        "code": "INVALID_ITEM_ROW",
                        "message": " ".join(row_errors),
                    }
                )
            normalized_items.append(
                {
                    **item,
                    "id": item_id,
                    "sku": None,
                    "name": name,
                    "unit": unit,
                    "category": category,
                    "location": location,
                    "description": description,
                    "is_active": is_active,
                    "current_stock_raw": current_raw,
                    "minimum_stock_raw": 0,
                    "purchase_price_raw": 0,
                    "selling_price_raw": 0,
                    "currency_code": "IDR",
                    "is_demo": False,
                }
            )
        parsed["items"] = normalized_items

        if parsed.get("mode") == "IMPORT" and not errors:
            with self.database.connection() as connection:
                existing_item_keys = {
                    (
                        row["name"].casefold(),
                        (row["category_name"] or "").casefold(),
                        (row["location_name"] or "").casefold(),
                    )
                    for row in connection.execute("""
                        SELECT i.name, c.name AS category_name, l.name AS location_name
                        FROM items i
                        LEFT JOIN categories c ON c.id = i.category_id
                        LEFT JOIN locations l ON l.id = i.location_id
                        """).fetchall()
                }
            for item in normalized_items:
                key = (
                    (item["name"] or "").casefold(),
                    (item["category"] or "").casefold(),
                    (item["location"] or "").casefold(),
                )
                if key in existing_item_keys:
                    errors.append(
                        {
                            "row": item.get("source_row"),
                            "code": "DUPLICATE_ITEM",
                            "message": (
                                "Barang dengan nama, kategori, dan lokasi yang sama sudah ada."
                            ),
                        }
                    )

        if parsed.get("mode") == "RESTORE":
            self._validate_extended_records(parsed, normalized_items, errors)
            self._validate_movements(normalized_items, movements, errors)
        return errors

    def _validate_movements(
        self,
        items: list[dict[str, Any]],
        movements: list[dict[str, Any]],
        errors: list[dict[str, Any]],
    ) -> None:
        item_ids = {item["id"] for item in items}
        seen_movement_ids: set[str] = set()
        chains: dict[str, int] = {}
        for movement in movements:
            row = movement.get("source_row")
            try:
                movement_id = validate_uuid(str(movement.get("id")), "Movement ID")
                item_id = validate_uuid(str(movement.get("item_id")), "Item ID")
                if movement_id in seen_movement_ids:
                    raise ValueError("Movement ID duplikat.")
                seen_movement_ids.add(movement_id)
                if item_id not in item_ids:
                    raise ValueError("Movement merujuk barang yang tidak tersedia.")
                movement_type = str(movement.get("movement_type", "")).upper()
                if movement_type not in {"IN", "OUT", "ADJUSTMENT"}:
                    raise ValueError("Jenis movement tidak valid.")
                quantity = quantity_to_raw(movement.get("quantity"), allow_zero=False)
                before = quantity_to_raw(movement.get("stock_before"))
                after = quantity_to_raw(movement.get("stock_after"))
                expected_before = chains.get(item_id, 0)
                if before != expected_before:
                    raise ValueError("Rantai stok sebelum movement tidak konsisten.")
                if movement_type == "IN" and after != before + quantity:
                    raise ValueError("Nilai movement IN tidak konsisten.")
                if movement_type == "OUT" and after != before - quantity:
                    raise ValueError("Nilai movement OUT tidak konsisten.")
                if movement_type == "ADJUSTMENT" and abs(after - before) != quantity:
                    raise ValueError("Nilai movement ADJUSTMENT tidak konsisten.")
                note = normalize_text(movement.get("note"), empty_to_none=True)
                reference = normalize_text(movement.get("reference_number"), empty_to_none=True)
                if note and len(note) > 500:
                    raise ValueError("Catatan movement maksimal 500 karakter.")
                if reference and len(reference) > 100:
                    raise ValueError("Nomor referensi maksimal 100 karakter.")
                if movement_type == "ADJUSTMENT" and not note:
                    raise ValueError("Movement ADJUSTMENT wajib memiliki alasan.")
                if not self._valid_iso_timestamp(movement.get("created_at")):
                    raise ValueError("Timestamp movement tidak valid.")
                chains[item_id] = after
                movement.update(
                    {
                        "id": movement_id,
                        "item_id": item_id,
                        "movement_type": movement_type,
                        "quantity_raw": quantity,
                        "stock_before_raw": before,
                        "stock_after_raw": after,
                        "note": note,
                        "reference_number": None,
                        "is_demo": False,
                    }
                )
            except (AppError, ValueError) as exc:
                errors.append(
                    {
                        "row": row,
                        "code": "INVALID_MOVEMENT_ROW",
                        "message": exc.message if isinstance(exc, AppError) else str(exc),
                    }
                )
        for item in items:
            expected = chains.get(item["id"], 0)
            if expected != item["current_stock_raw"]:
                errors.append(
                    {
                        "row": item.get("source_row"),
                        "code": "STOCK_HISTORY_MISMATCH",
                        "message": "Stok akhir barang tidak sesuai dengan riwayat movement.",
                    }
                )

    def _validate_extended_records(
        self,
        parsed: dict[str, Any],
        items: list[dict[str, Any]],
        errors: list[dict[str, Any]],
    ) -> None:
        category_rows = parsed.get("categories", [])
        location_rows = parsed.get("locations", [])
        if category_rows and "values" in category_rows[0]:
            parsed["categories"] = self._normalize_catalog_rows(
                category_rows,
                "category",
                errors,
            )
        if location_rows and "values" in location_rows[0]:
            parsed["locations"] = self._normalize_catalog_rows(
                location_rows,
                "location",
                errors,
            )

        parsed["settings"] = self._validate_advanced_settings(
            parsed.get("settings", {}),
            errors,
        )

    def _normalize_catalog_rows(
        self,
        rows: list[dict[str, Any]],
        kind: str,
        errors: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        identifiers: set[str] = set()
        names: set[str] = set()
        for row in rows:
            values = row.get("values", [])
            headers = row.get("headers") or []
            row_number = row.get("source_row")
            row_errors: list[str] = []
            try:
                identifier = validate_uuid(
                    str(values[0]),
                    "Category ID" if kind == "category" else "Location ID",
                )
            except (AppError, IndexError):
                identifier = str(values[0] if values else "")
                row_errors.append("ID data referensi tidak valid.")
            name = normalize_text(
                values[1] if len(values) > 1 else None,
                empty_to_none=True,
            )
            if not name or len(name) > 100:
                row_errors.append("Nama data referensi wajib diisi dan maksimal 100 karakter.")
            if kind == "location":
                # New: id,name,desc,created,updated | Legacy: + data type before times
                simple = headers == LOCATION_HEADERS
                description = normalize_text(
                    values[2] if len(values) > 2 else None,
                    empty_to_none=True,
                )
                created_index = 3 if simple else 4
                updated_index = 4 if simple else 5
            else:
                simple = headers == CATEGORY_HEADERS
                description = None
                created_index = 2 if simple else 3
                updated_index = 3 if simple else 4
            if description and len(description) > 500:
                row_errors.append("Deskripsi lokasi maksimal 500 karakter.")
            created_at = values[created_index] if len(values) > created_index else None
            updated_at = values[updated_index] if len(values) > updated_index else None
            if not self._valid_iso_timestamp(created_at):
                row_errors.append("Waktu pembuatan data referensi tidak valid.")
            if not self._valid_iso_timestamp(updated_at):
                row_errors.append("Waktu pembaruan data referensi tidak valid.")
            if identifier in identifiers:
                row_errors.append("ID data referensi duplikat.")
            identifiers.add(identifier)
            name_key = (name or "").casefold()
            if name_key in names:
                row_errors.append("Nama data referensi duplikat.")
            names.add(name_key)
            if row_errors:
                errors.append(
                    {
                        "row": row_number,
                        "code": "INVALID_CATALOG_ROW",
                        "message": " ".join(row_errors),
                    }
                )
            normalized.append(
                {
                    "source_row": row_number,
                    "id": identifier,
                    "name": name,
                    "description": description,
                    "is_demo": False,
                    "created_at": created_at,
                    "updated_at": updated_at,
                }
            )
        return normalized

    def _validate_advanced_settings(
        self,
        settings: dict[str, Any],
        errors: list[dict[str, Any]],
    ) -> dict[str, str]:
        if not settings:
            return {}
        from app.services.analytics_config import (
            BOOL_SETTINGS,
            CHART_SETTING_KEYS,
            DEFAULT_SETTINGS,
            FLOAT_SETTINGS,
            INT_SETTINGS,
            SETTING_KEYS,
        )

        allowed = {
            *SETTING_KEYS.values(),
            *CHART_SETTING_KEYS.values(),
            "company_name",
            "demo.auto_load_disabled",
            "demo.dataset_version",
        }
        normalized = {key: str(value) for key, value in settings.items() if key in allowed}
        candidate = {
            **DEFAULT_SETTINGS,
            "chart_visibility": dict(DEFAULT_SETTINGS["chart_visibility"]),
            "chart_order": list(DEFAULT_SETTINGS["chart_order"]),
        }
        try:
            for name, setting_key in SETTING_KEYS.items():
                if setting_key not in normalized:
                    continue
                raw = normalized[setting_key]
                if name in BOOL_SETTINGS:
                    candidate[name] = raw.strip().lower() in {
                        "1",
                        "true",
                        "yes",
                        "on",
                    }
                elif name in FLOAT_SETTINGS:
                    candidate[name] = float(raw)
                elif name in INT_SETTINGS:
                    candidate[name] = int(raw)
                elif name == "chart_order":
                    try:
                        parsed = json.loads(raw)
                    except json.JSONDecodeError:
                        parsed = []
                    candidate[name] = parsed if isinstance(parsed, list) else []
                else:
                    candidate[name] = raw
            for chart_id, setting_key in CHART_SETTING_KEYS.items():
                if setting_key in normalized:
                    candidate["chart_visibility"][chart_id] = normalized[
                        setting_key
                    ].strip().lower() in {"1", "true", "yes", "on"}
            AnalyticsSettingsUpdate.model_validate(candidate)
            if len(normalized.get("company_name", "")) > 150:
                raise ValueError("Nama perusahaan terlalu panjang.")
            auto_load = normalized.get("demo.auto_load_disabled")
            if auto_load and auto_load.strip().lower() not in {
                "true",
                "false",
                "1",
                "0",
            }:
                raise ValueError("Pengaturan data demonstrasi tidak valid.")
        except (TypeError, ValueError) as exc:
            errors.append(
                {
                    "code": "INVALID_ADVANCED_SETTINGS",
                    "message": f"Pengaturan Lanjutan tidak valid: {exc}",
                }
            )
        return normalized

    @staticmethod
    def _valid_iso_timestamp(value: Any) -> bool:
        if not isinstance(value, str) or not value.strip():
            return False
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return False
        return parsed.tzinfo is not None
