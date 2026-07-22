"""Aggregate inventory-domain routers without changing public paths."""

from fastapi import APIRouter

from app.api.routes.catalogs import router as catalogs_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.items import router as items_router
from app.api.routes.settings import router as settings_router

router = APIRouter()
router.include_router(items_router)
router.include_router(catalogs_router)
router.include_router(dashboard_router)
router.include_router(settings_router)

