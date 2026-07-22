"""Aggregate analytics endpoints while preserving their public paths."""

from fastapi import APIRouter

from app.api.routes.analytics_core import router as core_router
from app.api.routes.analytics_export import router as export_router

router = APIRouter()
router.include_router(core_router)
router.include_router(export_router)

