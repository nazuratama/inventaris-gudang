"""Top-level API router registry."""

from fastapi import APIRouter

from app.api.routes.analytics import router as analytics_router
from app.api.routes.backups import router as backups_router
from app.api.routes.cloud_backup import router as cloud_backup_router
from app.api.routes.demo import router as demo_router
from app.api.routes.imports import router as imports_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.system import router as system_router
from app.api.routes.updates import router as updates_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(inventory_router)
api_router.include_router(analytics_router)
api_router.include_router(demo_router)
api_router.include_router(backups_router)
api_router.include_router(cloud_backup_router)
api_router.include_router(imports_router)
api_router.include_router(updates_router)
