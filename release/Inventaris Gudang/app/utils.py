"""Small shared utilities for identifiers, timestamps, text, and quantities."""

from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.errors import AppError

QUANTITY_SCALE = 1000
MONEY_SCALE = 100
MAX_QUANTITY_RAW = 9_000_000_000_000_000
MAX_MONEY_RAW = 9_000_000_000_000_000
_WHITESPACE = re.compile(r"\s+")


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def new_id() -> str:
    return str(uuid4())


def validate_uuid(value: str, field_name: str = "ID") -> str:
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise AppError(
            "INVALID_IDENTIFIER",
            f"{field_name} tidak valid.",
            status_code=422,
        ) from exc


def normalize_text(value: str | None, *, empty_to_none: bool = False) -> str | None:
    if value is None:
        return None
    normalized = _WHITESPACE.sub(" ", unicodedata.normalize("NFKC", value)).strip()
    if not normalized and empty_to_none:
        return None
    return normalized


def normalize_sku(value: str | None) -> str | None:
    normalized = normalize_text(value, empty_to_none=True)
    return normalized.upper() if normalized else None


def quantity_to_raw(value: Any, *, allow_zero: bool = True, field: str = "quantity") -> int:
    """Convert a public quantity to exact integer thousandths."""

    if isinstance(value, bool):
        raise AppError("INVALID_QUANTITY", "Jumlah tidak valid.", status_code=422)
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise AppError("INVALID_QUANTITY", "Jumlah tidak valid.", status_code=422) from exc
    if not decimal_value.is_finite():
        raise AppError("INVALID_QUANTITY", "Jumlah tidak valid.", status_code=422)
    scaled = decimal_value * QUANTITY_SCALE
    rounded = scaled.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    if scaled != rounded:
        raise AppError(
            "QUANTITY_PRECISION_EXCEEDED",
            "Jumlah hanya boleh memiliki maksimal tiga angka desimal.",
            status_code=422,
            details={"field": field},
        )
    raw = int(rounded)
    minimum = 0 if allow_zero else 1
    if raw < minimum:
        message = "Jumlah tidak boleh negatif." if allow_zero else "Jumlah harus lebih dari nol."
        raise AppError("INVALID_QUANTITY", message, status_code=422, details={"field": field})
    if raw > MAX_QUANTITY_RAW:
        raise AppError(
            "QUANTITY_TOO_LARGE",
            "Jumlah melebihi batas yang didukung.",
            status_code=422,
            details={"field": field},
        )
    return raw


def raw_to_quantity(value: int) -> int | float:
    if value % QUANTITY_SCALE == 0:
        return value // QUANTITY_SCALE
    result = value / QUANTITY_SCALE
    if not math.isfinite(result):
        raise ValueError("Invalid stored quantity")
    return result


def money_to_raw(value: Any, *, field: str = "price") -> int:
    """Convert a public monetary value to exact integer hundredths."""

    if isinstance(value, bool):
        raise AppError("INVALID_MONEY", "Nilai harga tidak valid.", status_code=422)
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise AppError("INVALID_MONEY", "Nilai harga tidak valid.", status_code=422) from exc
    if not decimal_value.is_finite() or decimal_value < 0:
        raise AppError("INVALID_MONEY", "Nilai harga tidak boleh negatif.", status_code=422)
    scaled = decimal_value * MONEY_SCALE
    rounded = scaled.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    if scaled != rounded:
        raise AppError(
            "MONEY_PRECISION_EXCEEDED",
            "Harga hanya boleh memiliki maksimal dua angka desimal.",
            status_code=422,
            details={"field": field},
        )
    raw = int(rounded)
    if raw > MAX_MONEY_RAW:
        raise AppError(
            "MONEY_TOO_LARGE",
            "Nilai harga melebihi batas yang didukung.",
            status_code=422,
            details={"field": field},
        )
    return raw


def raw_to_money(value: int) -> int | float:
    if value % MONEY_SCALE == 0:
        return value // MONEY_SCALE
    return value / MONEY_SCALE


def inventory_value_raw(quantity_raw: int, unit_price_raw: int) -> int:
    """Return monetary hundredths using integer half-up rounding."""

    numerator = quantity_raw * unit_price_raw
    return (numerator + QUANTITY_SCALE // 2) // QUANTITY_SCALE


def stock_status(current: int, minimum: int) -> str:
    if current == 0:
        return "OUT"
    if current <= minimum:
        return "LOW"
    return "NORMAL"


def excel_safe_text(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    if value.startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def bytes_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_file_name(value: str) -> str:
    """Discard any supplied path components and control characters."""

    name = Path(value.replace("\\", "/")).name
    name = "".join(character for character in name if character.isprintable())
    normalized = normalize_text(name, empty_to_none=True)
    if not normalized or len(normalized) > 180:
        raise AppError("INVALID_FILE_NAME", "Nama file tidak valid.", status_code=422)
    return normalized
