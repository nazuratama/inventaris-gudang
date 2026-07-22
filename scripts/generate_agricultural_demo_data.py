"""Generate the deterministic offline agricultural demonstration workbook."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.demo_data import (  # noqa: E402
    DEMO_SEED,
    generate_agricultural_dataset,
    write_demo_workbook,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("sample_data/agricultural_inventory_demo.xlsx"),
    )
    args = parser.parse_args()
    dataset = generate_agricultural_dataset(DEMO_SEED)
    destination = args.output.resolve()
    write_demo_workbook(dataset, destination)
    print(
        json.dumps(
            {
                "success": True,
                "output": str(destination),
                "seed": DEMO_SEED,
                "counts": dataset.counts,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
