"""Compatibility exports for demo dataset generation and lifecycle services."""

from app.services.demo_data import DemoDataService
from app.services.demo_dataset import (
    CATEGORY_SPECS,
    DEMO_NAMESPACE,
    DEMO_SEED,
    DEMO_VERSION,
    LOCATIONS,
    UNIT_OPTIONS,
    VARIANTS,
    DemoDataset,
    deterministic_id,
    generate_agricultural_dataset,
    iso_at,
    seasonal_factor,
)
from app.services.demo_workbook import write_demo_workbook

__all__ = [
    "CATEGORY_SPECS",
    "DEMO_NAMESPACE",
    "DEMO_SEED",
    "DEMO_VERSION",
    "LOCATIONS",
    "UNIT_OPTIONS",
    "VARIANTS",
    "DemoDataService",
    "DemoDataset",
    "deterministic_id",
    "generate_agricultural_dataset",
    "iso_at",
    "seasonal_factor",
    "write_demo_workbook",
]
