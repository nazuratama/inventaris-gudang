import { appState } from "../state/app-state.js";

export function getCollection(data, preferredKeys = []) {
  if (Array.isArray(data)) {
    return data;
  }
  for (const key of preferredKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }
  return [];
}

export function getCategoryName(item) {
  return item?.category?.name || item?.category_name || item?.category || "Tanpa kategori";
}

export function getLocationName(item) {
  return item?.location?.name || item?.location_name || item?.location || "Belum ditentukan";
}

export function getItemName(movement) {
  return movement?.item?.name || movement?.item_name || movement?.name || "Barang";
}

export function getItemSku(movement) {
  return movement?.item?.sku || movement?.item_sku || movement?.sku || null;
}

/**
 * Global warehouse minimum stock threshold from settings/session.
 * Applies to every item for stock color (green / yellow / red).
 */
export function getGlobalMinimumStock() {
  const session = appState.get("session") || {};
  const raw =
    session.default_minimum_stock ??
    session.defaultMinimumStock ??
    10;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
}

export function getStockStatus(item, minimumOverride) {
  const explicit = String(item?.stock_status || "").toLowerCase();
  // Prefer live global threshold so UI reacts immediately after settings change.
  const minimum =
    minimumOverride !== undefined && minimumOverride !== null
      ? Number(minimumOverride)
      : getGlobalMinimumStock();
  const stock = Number(item?.current_stock ?? 0);

  if (stock <= 0) {
    return "out";
  }
  if (stock <= minimum) {
    return "low";
  }
  // Keep server enum only when it cannot be derived (should be rare).
  if (["normal", "low", "out"].includes(explicit) && minimumOverride === undefined) {
    // still use computed above; ignore explicit for global threshold consistency
  }
  return "normal";
}

export function stockStatusPresentation(item, minimumOverride) {
  const status = getStockStatus(item, minimumOverride);
  const presentations = {
    normal: {
      label: "Stok aman",
      tone: "success",
      className: "stock-level-ok",
    },
    low: {
      label: "Stok menipis",
      tone: "warning",
      className: "stock-level-low",
    },
    out: {
      label: "Stok habis",
      tone: "danger",
      className: "stock-level-out",
    },
  };
  return presentations[status];
}

export function normalizePagination(data, fallbackPage = 1, fallbackPageSize = 25) {
  const source = data?.pagination || data || {};
  const page = positiveInteger(source.page, fallbackPage);
  const pageSize = positiveInteger(source.page_size, fallbackPageSize);
  const total = nonNegativeInteger(source.total, 0);
  const totalPages = Math.max(
    1,
    positiveInteger(source.total_pages, Math.ceil(total / pageSize) || 1),
  );
  return { page, pageSize, total, totalPages };
}

export function pickNumber(source, keys, fallback = 0) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

export function pickValue(source, keys, fallback = null) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return fallback;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
