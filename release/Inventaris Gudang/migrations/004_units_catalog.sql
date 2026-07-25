-- Master unit data, selectable in the same way as categories.
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(name) BETWEEN 1 AND 32),
    CHECK (is_demo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS ix_units_name ON units(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS ix_units_demo ON units(is_demo);

-- Seed common agricultural / warehouse units (idempotent).
INSERT OR IGNORE INTO units(id, name, is_demo, created_at, updated_at)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'Pcs', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000002', 'Box', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000003', 'Pack', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000004', 'Kilogram', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000005', 'Gram', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000006', 'Liter', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000007', 'Bottle', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000008', 'Bag', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-000000000009', 'Sachet', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000a', 'Roll', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000b', 'Set', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000c', 'Pair', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000d', 'Tray', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000e', 'Karung', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ('00000000-0000-4000-8000-00000000000f', 'Rim', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

-- Import any unit names already used by items that are not in the seed list.
INSERT OR IGNORE INTO units(id, name, is_demo, created_at, updated_at)
SELECT
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
    trim(i.unit),
    0,
    COALESCE(MIN(i.created_at), '2026-01-01T00:00:00.000Z'),
    COALESCE(MAX(i.updated_at), '2026-01-01T00:00:00.000Z')
FROM items i
WHERE i.unit IS NOT NULL
  AND length(trim(i.unit)) BETWEEN 1 AND 32
  AND NOT EXISTS (
      SELECT 1 FROM units u WHERE u.name = trim(i.unit) COLLATE NOCASE
  )
GROUP BY trim(i.unit);
