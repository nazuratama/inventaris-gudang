"""Analytics query value objects."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class AnalyticsFilters:
    date_from: str | None
    date_to: str | None
    category_id: str | None
    location_id: str | None
    include_archived: bool
    include_demo: bool
    data_scope: Literal["all", "demo", "real"]
    aggregation: Literal["daily", "weekly", "monthly"]
    top_n: int
    ranking: Literal["highest", "lowest"]
    movement_scope: Literal["both", "in", "out"]
    metric: str
    show_net: bool
