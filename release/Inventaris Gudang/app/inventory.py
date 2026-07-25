"""Compatibility facade for inventory-domain services and routes."""

from app.api.dependencies import get_database as _database
from app.api.dependencies import schedule_backup as _schedule_backup
from app.api.routes.catalogs import (
    create_category,
    create_location,
    create_unit,
    delete_category,
    delete_location,
    delete_unit,
    list_categories,
    list_locations,
    list_units,
    update_category,
    update_location,
    update_unit,
)
from app.api.routes.dashboard import dashboard
from app.api.routes.inventory import router
from app.api.routes.items import (
    create_item,
    create_movement,
    delete_item,
    delete_movement,
    get_item,
    item_movements,
    list_items,
    list_movements,
    update_item,
)
from app.api.routes.settings import (
    delete_branding_image,
    get_branding_image,
    get_settings,
    update_settings,
    upload_branding_image,
)
from app.services.catalogs import (
    _create_catalog,
    _delete_catalog,
    _list_catalog,
    _update_catalog,
)
from app.services.dashboard import _dashboard
from app.services.inventory import (
    DEFAULT_GLOBAL_MINIMUM,
    GLOBAL_MINIMUM_SETTING_KEY,
    InventoryService,
    WAREHOUSE_TZ,
    _category_exists,
    _global_minimum_raw,
    _item_from_row,
    _local_day_start_utc,
    _location_exists,
    _movement_from_row,
    _resolve_unit_name,
)
from app.services.settings import (
    BRANDING_KINDS,
    BRANDING_MAX_BYTES,
    DEFAULT_OWNER_NAME,
    _branding_paths,
    _branding_urls,
    _decode_branding_image,
    _get_settings,
    _settings_map,
    _update_settings,
    _write_setting,
)

__all__ = [
    "BRANDING_KINDS",
    "BRANDING_MAX_BYTES",
    "DEFAULT_GLOBAL_MINIMUM",
    "DEFAULT_OWNER_NAME",
    "GLOBAL_MINIMUM_SETTING_KEY",
    "WAREHOUSE_TZ",
    "InventoryService",
    "create_category",
    "create_item",
    "create_location",
    "create_movement",
    "create_unit",
    "dashboard",
    "delete_branding_image",
    "delete_category",
    "delete_item",
    "delete_location",
    "delete_movement",
    "delete_unit",
    "get_branding_image",
    "get_item",
    "get_settings",
    "item_movements",
    "list_categories",
    "list_items",
    "list_locations",
    "list_movements",
    "list_units",
    "router",
    "update_category",
    "update_item",
    "update_location",
    "update_settings",
    "update_unit",
    "upload_branding_image",
]
