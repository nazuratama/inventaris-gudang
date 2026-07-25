export function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return cellFromDate(date, date.getMonth() !== month);
  });
}

function cellFromDate(date, outside) {
  const key = toDateKey(date);
  return {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
    key,
    outside,
    blank: false,
    label: new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

/**
 * API date range padded ±1 day so UTC-stored timestamps near midnight still
 * come back; callers must filter with filterMovementsForLocalDay().
 */
export function localDayApiQuery(dateKey) {
  const start = localDayStart(dateKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const padFrom = new Date(start);
  padFrom.setDate(padFrom.getDate() - 1);
  const padTo = new Date(end);
  padTo.setDate(padTo.getDate() + 1);
  return {
    date_from: toDateKey(padFrom),
    date_to: toDateKey(padTo),
  };
}

export function monthQueryRange(year, month) {
  // Pad month edges so local-midnight-near-UTC movements are included.
  const from = new Date(year, month, 1);
  from.setDate(from.getDate() - 1);
  const to = new Date(year, month + 1, 1);
  to.setDate(to.getDate() + 1);
  return {
    date_from: toDateKey(from),
    date_to: toDateKey(to),
  };
}

function localDayStart(dateKey) {
  // Parse as local calendar midnight (not UTC).
  const [year, month, day] = String(dateKey)
    .split("-")
    .map((part) => Number(part));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function filterMovementsForLocalDay(movements, dateKey) {
  const start = localDayStart(dateKey).getTime();
  const end = start + 86_400_000;
  return (movements || []).filter((movement) => {
    const parsed = new Date(movement.created_at);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }
    const stamp = parsed.getTime();
    return stamp >= start && stamp < end;
  });
}

export function buildActivityMap(movements) {
  const map = new Map();
  for (const movement of movements || []) {
    const key = toDateKey(movement.created_at);
    if (!key) {
      continue;
    }
    const type = String(movement.movement_type || movement.type || "").toUpperCase();
    const entry = map.get(key) || { in: 0, out: 0 };
    if (type === "IN") {
      entry.in += 1;
    } else if (type === "OUT") {
      entry.out += 1;
    }
    map.set(key, entry);
  }
  return map;
}

export function toDateKey(value) {
  const parsed = value instanceof Date ? value : value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTodayKey(dateKey) {
  return dateKey === toDateKey(new Date());
}

export function capitalize(value) {
  const text = String(value || "");
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

