"""Public inventory service composed from focused operation mixins."""

from app.infrastructure.database import Database
from app.services.inventory_items import InventoryItemOperations
from app.services.inventory_movements import StockMovementOperations
from app.services.inventory_support import (
    DEFAULT_GLOBAL_MINIMUM,
    GLOBAL_MINIMUM_SETTING_KEY,
    WAREHOUSE_TZ,
    _category_exists,
    _global_minimum_raw,
    _item_from_row,
    _local_day_start_utc,
    _location_exists,
    _movement_from_row,
    _resolve_unit_name,
)


class InventoryService(InventoryItemOperations, StockMovementOperations):
    def __init__(self, database: Database) -> None:
        self.database = database


__all__ = ["InventoryService"]
