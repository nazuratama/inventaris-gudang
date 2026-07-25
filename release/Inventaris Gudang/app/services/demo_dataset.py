"""Deterministic agricultural demonstration dataset generation."""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from uuid import UUID, uuid5

from app.utils import QUANTITY_SCALE

DEMO_SEED = 20260716
DEMO_VERSION = "agri-demo-1"
DEMO_NAMESPACE = UUID("4be2c7ac-9f98-4e98-a992-b9484e66c35d")

CATEGORY_SPECS = (
    (
        "Benih Sayuran",
        ("Cabai", "Tomat", "Sawi", "Bayam", "Kangkung", "Terong"),
        "Pack",
        18000,
        68000,
        "planting",
    ),
    (
        "Benih Tanaman Pangan",
        ("Padi", "Jagung", "Kedelai", "Kacang Tanah", "Sorgum", "Kacang Hijau"),
        "Kilogram",
        24000,
        135000,
        "planting",
    ),
    (
        "Benih Buah",
        ("Melon", "Semangka", "Pepaya", "Timun Suri", "Markisa", "Labu Madu"),
        "Pack",
        22000,
        92000,
        "planting",
    ),
    (
        "Pupuk Organik",
        ("Kompos", "Kascing", "Pupuk Kandang", "Humus", "Bokashi", "Guano"),
        "Bag",
        28000,
        145000,
        "fertilizer",
    ),
    (
        "Pupuk Anorganik",
        ("NPK", "Urea", "KCl", "SP-36", "ZA", "Pupuk Daun"),
        "Bag",
        65000,
        425000,
        "fertilizer",
    ),
    (
        "Insektisida",
        (
            "Pengendali Ulat",
            "Pengendali Kutu",
            "Pengendali Wereng",
            "Pengendali Lalat Buah",
            "Pengendali Trips",
            "Pengendali Kumbang",
        ),
        "Bottle",
        32000,
        285000,
        "pest",
    ),
    (
        "Fungisida",
        (
            "Pengendali Bercak",
            "Pengendali Busuk",
            "Pengendali Embun",
            "Pengendali Karat",
            "Pengendali Antraknosa",
            "Pengendali Layu",
        ),
        "Bottle",
        38000,
        315000,
        "rain",
    ),
    (
        "Herbisida",
        (
            "Pengendali Gulma Daun Lebar",
            "Pengendali Gulma Rumput",
            "Pengendali Alang-alang",
            "Herbisida Kontak",
            "Herbisida Sistemik",
            "Herbisida Pra Tumbuh",
        ),
        "Bottle",
        42000,
        340000,
        "pest",
    ),
    (
        "Pengendali Hama Hayati",
        (
            "Perangkap Serangga",
            "Agen Hayati",
            "Feromon",
            "Perekat Hama",
            "Pengendali Tikus",
            "Biopestisida",
        ),
        "Pack",
        18000,
        175000,
        "pest",
    ),
    (
        "Zat Pengatur Tumbuh",
        (
            "Perangsang Akar",
            "Perangsang Bunga",
            "Perangsang Buah",
            "Penguat Batang",
            "Pemulih Tanaman",
            "Perangsang Tunas",
        ),
        "Bottle",
        25000,
        190000,
        "fertilizer",
    ),
    (
        "Media Tanam",
        ("Cocopeat", "Sekam Bakar", "Rockwool", "Perlite", "Vermikulit", "Tanah Humus"),
        "Bag",
        12000,
        125000,
        "steady",
    ),
    (
        "Perlengkapan Pembibitan",
        ("Tray Semai", "Polybag", "Pot Bibit", "Label Tanaman", "Sungkup Bibit", "Wadah Semai"),
        "Tray",
        9000,
        165000,
        "planting",
    ),
    (
        "Alat Semprot",
        (
            "Sprayer Tangan",
            "Sprayer Punggung",
            "Nozel Semprot",
            "Pompa Semprot",
            "Lance Semprot",
            "Seal Sprayer",
        ),
        "Pcs",
        15000,
        1150000,
        "dry",
    ),
    (
        "Perlengkapan Irigasi",
        ("Selang Air", "Konektor Irigasi", "Dripper", "Pipa Mikro", "Filter Irigasi", "Katup Air"),
        "Roll",
        8000,
        650000,
        "dry",
    ),
    (
        "Alat Pertanian",
        ("Cangkul", "Sekop", "Sabit", "Gunting Pangkas", "Garpu Tanah", "Alat Ukur"),
        "Pcs",
        25000,
        850000,
        "slow",
    ),
    (
        "Perlengkapan Panen",
        (
            "Keranjang Panen",
            "Terpal",
            "Karung Panen",
            "Timbangan",
            "Pisau Panen",
            "Kontainer Hasil",
        ),
        "Pcs",
        12000,
        780000,
        "harvest",
    ),
    (
        "Alat Pelindung Diri",
        (
            "Sarung Tangan",
            "Masker",
            "Kacamata Pelindung",
            "Sepatu Bot",
            "Apron Kerja",
            "Pelindung Wajah",
        ),
        "Pair",
        9000,
        420000,
        "steady",
    ),
    (
        "Pembenah Tanah",
        ("Dolomit", "Kapur Pertanian", "Asam Humat", "Zeolit", "Biochar", "Gypsum Pertanian"),
        "Bag",
        22000,
        210000,
        "fertilizer",
    ),
)

LOCATIONS = (
    ("Gudang Benih A", "Benih dan perlengkapan pembibitan"),
    ("Gudang Pupuk B", "Pupuk dan pembenah tanah"),
    ("Gudang Proteksi C", "Produk perlindungan tanaman"),
    ("Rak Alat D", "Alat pertanian dan alat semprot"),
    ("Area Irigasi E", "Selang dan komponen irigasi"),
    ("Ruang APD F", "Perlengkapan keselamatan kerja"),
    ("Zona Karantina G", "Barang yang perlu pemeriksaan lebih lanjut"),
    ("Gudang Cadangan H", "Persediaan buffer dan produk lambat bergerak"),
)

VARIANTS = ("Ekonomis", "Standar", "Pilihan", "Intensif")
UNIT_OPTIONS = {
    "Benih Sayuran": ("Pack", "Sachet", "Gram"),
    "Benih Tanaman Pangan": ("Kilogram", "Bag", "Pack"),
    "Benih Buah": ("Pack", "Sachet", "Gram"),
    "Pupuk Organik": ("Bag", "Kilogram", "Pack"),
    "Pupuk Anorganik": ("Bag", "Kilogram", "Sachet"),
    "Insektisida": ("Bottle", "Liter", "Sachet"),
    "Fungisida": ("Bottle", "Liter", "Sachet"),
    "Herbisida": ("Bottle", "Liter", "Sachet"),
    "Pengendali Hama Hayati": ("Pack", "Bottle", "Pcs"),
    "Zat Pengatur Tumbuh": ("Bottle", "Liter", "Sachet"),
    "Media Tanam": ("Bag", "Kilogram", "Box"),
    "Perlengkapan Pembibitan": ("Tray", "Pack", "Pcs"),
    "Alat Semprot": ("Pcs", "Set", "Box"),
    "Perlengkapan Irigasi": ("Roll", "Pcs", "Set"),
    "Alat Pertanian": ("Pcs", "Set", "Pair"),
    "Perlengkapan Panen": ("Pcs", "Box", "Set"),
    "Alat Pelindung Diri": ("Pair", "Pcs", "Box"),
    "Pembenah Tanah": ("Bag", "Kilogram", "Sachet"),
}


def deterministic_id(kind: str, value: str) -> str:
    # Fake crops, real math.
    return str(uuid5(DEMO_NAMESPACE, f"{DEMO_VERSION}:{kind}:{value}"))


def iso_at(day: date, hour: int = 8, minute: int = 0) -> str:
    return (
        datetime.combine(day, time(hour, minute), UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def seasonal_factor(pattern: str, month: int) -> float:
    if pattern == "planting":
        return 1.65 if month in {9, 10, 11, 2, 3} else 0.85
    if pattern == "rain":
        return 1.75 if month in {11, 12, 1, 2, 3} else 0.72
    if pattern == "pest":
        return 1.55 if month in {1, 2, 3, 4, 8, 9} else 0.82
    if pattern == "dry":
        return 1.8 if month in {5, 6, 7, 8, 9} else 0.68
    if pattern == "fertilizer":
        return 1.45 if month in {2, 3, 9, 10, 11} else 0.9
    if pattern == "harvest":
        return 1.6 if month in {4, 5, 10, 11} else 0.75
    if pattern == "slow":
        return 0.55
    return 1.0


@dataclass(slots=True)
class DemoDataset:
    categories: list[dict[str, Any]]
    locations: list[dict[str, Any]]
    items: list[dict[str, Any]]
    movements: list[dict[str, Any]]
    generated_at: str

    @property
    def counts(self) -> dict[str, int]:
        return {
            "categories": len(self.categories),
            "locations": len(self.locations),
            "items": len(self.items),
            "movements": len(self.movements),
        }


def generate_agricultural_dataset(seed: int = DEMO_SEED) -> DemoDataset:
    randomizer = random.Random(seed)
    generated_at = "2026-07-16T00:00:00Z"
    end_day = date(2026, 7, 16)
    start_day = end_day - timedelta(days=548)

    categories = [
        {
            "id": deterministic_id("category", name),
            "name": name,
            "is_demo": 1,
            "created_at": iso_at(start_day),
            "updated_at": iso_at(start_day),
        }
        for name, *_ in CATEGORY_SPECS
    ]
    category_ids = {entry["name"]: entry["id"] for entry in categories}

    locations = [
        {
            "id": deterministic_id("location", name),
            "name": name,
            "description": description,
            "is_demo": 1,
            "created_at": iso_at(start_day),
            "updated_at": iso_at(start_day),
        }
        for name, description in LOCATIONS
    ]

    items: list[dict[str, Any]] = []
    movements: list[dict[str, Any]] = []
    item_index = 0

    for category_index, spec in enumerate(CATEGORY_SPECS):
        category_name, base_names, default_unit, low_price, high_price, pattern = spec
        for base_index, base_name in enumerate(base_names):
            for variant_index in range(2):
                variant = VARIANTS[(base_index + variant_index + category_index) % len(VARIANTS)]
                item_index += 1
                item_id = deterministic_id("item", f"{category_name}:{base_name}:{variant}")
                location = locations[
                    (category_index if category_index < 6 else category_index + base_index)
                    % len(locations)
                ]
                # Global warehouse threshold is used in the app; demo keeps a local
                # restock heuristic only (not persisted as per-item commercial fields).
                minimum_units = randomizer.randint(8, 55)
                opening_units = randomizer.randint(minimum_units * 2, minimum_units * 8)
                profile_roll = item_index % 10
                profile = (
                    "fast"
                    if profile_roll in {0, 1}
                    else "slow" if profile_roll in {8, 9} else "medium"
                )
                if item_index % 17 == 0:
                    profile = "none"
                outgoing_count = {
                    "fast": randomizer.randint(30, 38),
                    "medium": randomizer.randint(16, 24),
                    "slow": randomizer.randint(5, 9),
                    "none": 0,
                }[profile]
                stock = opening_units * QUANTITY_SCALE
                item_movements: list[dict[str, Any]] = []

                if stock > 0:
                    item_movements.append(
                        _movement(
                            item_id,
                            len(item_movements),
                            "IN",
                            stock,
                            0,
                            stock,
                            "Stok pembukaan data demonstrasi",
                            None,
                            iso_at(start_day, 7),
                        )
                    )

                outgoing_days = [
                    start_day + timedelta(days=offset)
                    for offset in sorted(randomizer.sample(range(7, 546), outgoing_count))
                ]
                last_restock = start_day
                for movement_day in outgoing_days:
                    factor = seasonal_factor(pattern, movement_day.month)
                    base_quantity = {
                        "fast": randomizer.randint(3, 13),
                        "medium": randomizer.randint(2, 9),
                        "slow": randomizer.randint(1, 5),
                        "none": 0,
                    }[profile]
                    outgoing_units = max(1, round(base_quantity * factor))
                    outgoing_raw = outgoing_units * QUANTITY_SCALE
                    restock_due = stock < outgoing_raw + minimum_units * QUANTITY_SCALE or (
                        movement_day - last_restock
                    ).days > randomizer.randint(45, 95)
                    if restock_due:
                        incoming_units = randomizer.randint(
                            max(minimum_units * 2, outgoing_units * 3),
                            max(minimum_units * 6, outgoing_units * 8),
                        )
                        incoming_raw = incoming_units * QUANTITY_SCALE
                        before = stock
                        stock += incoming_raw
                        item_movements.append(
                            _movement(
                                item_id,
                                len(item_movements),
                                "IN",
                                incoming_raw,
                                before,
                                stock,
                                "Penerimaan stok demonstrasi",
                                None,
                                iso_at(movement_day, 8),
                            )
                        )
                        last_restock = movement_day
                    outgoing_raw = min(outgoing_raw, stock)
                    if outgoing_raw <= 0:
                        continue
                    before = stock
                    stock -= outgoing_raw
                    item_movements.append(
                        _movement(
                            item_id,
                            len(item_movements),
                            "OUT",
                            outgoing_raw,
                            before,
                            stock,
                            "Pengeluaran stok toko pertanian demonstrasi",
                            None,
                            iso_at(movement_day, 14),
                        )
                    )

                # Reach varied end-stock profiles with IN/OUT only (no adjustments).
                target_stock = stock
                if item_index % 23 == 0:
                    target_stock = 0
                elif item_index % 11 == 0:
                    target_stock = (
                        randomizer.randint(1, max(1, minimum_units // 2)) * QUANTITY_SCALE
                    )
                elif item_index % 7 == 0:
                    target_stock = (
                        randomizer.randint(max(1, minimum_units // 2 + 1), minimum_units)
                        * QUANTITY_SCALE
                    )
                elif profile == "slow" and item_index % 2 == 0:
                    target_stock = (
                        randomizer.randint(minimum_units * 5, minimum_units * 10) * QUANTITY_SCALE
                    )
                if target_stock < stock:
                    before = stock
                    delta = stock - target_stock
                    stock = target_stock
                    item_movements.append(
                        _movement(
                            item_id,
                            len(item_movements),
                            "OUT",
                            delta,
                            before,
                            stock,
                            "Penyesuaian stok akhir (keluar) demonstrasi",
                            None,
                            iso_at(end_day - timedelta(days=1), 16),
                        )
                    )
                elif target_stock > stock:
                    before = stock
                    delta = target_stock - stock
                    stock = target_stock
                    item_movements.append(
                        _movement(
                            item_id,
                            len(item_movements),
                            "IN",
                            delta,
                            before,
                            stock,
                            "Penyesuaian stok akhir (masuk) demonstrasi",
                            None,
                            iso_at(end_day - timedelta(days=1), 16),
                        )
                    )

                item = {
                    "id": item_id,
                    "name": f"{base_name} {variant}",
                    "category_id": category_ids[category_name],
                    "category_name": category_name,
                    "location_id": location["id"],
                    "location_name": location["name"],
                    "unit": UNIT_OPTIONS.get(category_name, (default_unit,))[
                        (base_index + variant_index)
                        % len(UNIT_OPTIONS.get(category_name, (default_unit,)))
                    ],
                    "current_stock": stock,
                    "description": (
                        "Produk generik fiktif untuk demonstrasi toko pertanian."
                    ),
                    "is_active": 0 if item_index % 41 == 0 else 1,
                    "is_demo": 1,
                    "created_at": iso_at(start_day),
                    "updated_at": (
                        item_movements[-1]["created_at"] if item_movements else iso_at(start_day)
                    ),
                }
                items.append(item)
                movements.extend(item_movements)

    return DemoDataset(
        categories=categories,
        locations=locations,
        items=items,
        movements=sorted(movements, key=lambda row: (row["created_at"], row["id"])),
        generated_at=generated_at,
    )


def _movement(
    item_id: str,
    sequence: int,
    movement_type: str,
    quantity: int,
    stock_before: int,
    stock_after: int,
    note: str,
    reference: str,
    created_at: str,
) -> dict[str, Any]:
    return {
        "id": deterministic_id("movement", f"{item_id}:{sequence}:{movement_type}:{created_at}"),
        "item_id": item_id,
        "movement_type": movement_type,
        "quantity": quantity,
        "stock_before": stock_before,
        "stock_after": stock_after,
        "note": note,
        "reference_number": reference,
        "created_at": created_at,
        "is_demo": 1,
    }
