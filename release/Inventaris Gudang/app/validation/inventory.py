"""Inventory, movement, and catalog request schemas."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import Field

from app.validation.base import StrictModel


class ItemCreate(StrictModel):
    """Product create payload aligned with the simplified inventory UI."""

    name: str = Field(min_length=1, max_length=150)
    category_id: str | None = Field(default=None)
    location_id: str | None = Field(default=None)
    unit: str = Field(default="Pcs", min_length=1, max_length=32)
    current_stock: Decimal = Field(default=Decimal("0"), ge=0.0)
    description: str | None = Field(default=None, max_length=1000)


class ItemUpdate(StrictModel):
    """Product update payload aligned with the simplified inventory UI."""

    name: str = Field(min_length=1, max_length=150)
    category_id: str | None = Field(default=None)
    location_id: str | None = Field(default=None)
    unit: str = Field(min_length=1, max_length=32)
    description: str | None = Field(default=None, max_length=1000)


class DeleteConfirmation(StrictModel):
    confirmation: str = Field(min_length=1, max_length=150)


class MovementCreate(StrictModel):
    item_id: str
    movement_type: Literal["IN", "OUT"]
    quantity: Decimal = Field(gt=0.0)
    note: str | None = Field(default=None, max_length=500)


class CategoryCreate(StrictModel):
    name: str = Field(min_length=1, max_length=100)


class LocationCreate(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class UnitCreate(StrictModel):
    name: str = Field(min_length=1, max_length=32)


class CategoryUpdate(CategoryCreate):
    name: str = Field(min_length=1, max_length=100)


class LocationUpdate(LocationCreate):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class UnitUpdate(UnitCreate):
    name: str = Field(min_length=1, max_length=32)
