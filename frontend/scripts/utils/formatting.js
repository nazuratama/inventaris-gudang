const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

const compactNumberFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const numericDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});
let configuredDateFormat = "DD MMM YYYY";

export function configureFormatting(settings = {}) {
  if (["DD MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].includes(settings.date_format)) {
    configuredDateFormat = settings.date_format;
  }
}

/**
 * Format a number for display (id-ID).
 *
 * Second argument is overloaded for historical call sites:
 * - string fallback when value is not finite, e.g. formatNumber(x, "—")
 * - max fraction digits 0–6 when a number, e.g. formatNumber(x, precision)
 *   (charts pass decimal_precision here; it is NOT a fallback)
 */
export function formatNumber(value, second = "0") {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    if (typeof second === "number" && Number.isInteger(second) && second >= 0 && second <= 6) {
      return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: second,
      }).format(parsed);
    }
    return numberFormatter.format(parsed);
  }
  // Invalid input: numeric second arg was precision, not a fallback label.
  if (typeof second === "number") {
    return "0";
  }
  return second;
}

export function formatCompactNumber(value, fallback = "0") {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? compactNumberFormatter.format(parsed) : fallback;
}

export function formatCurrency(value, currency = "IDR", fallback = "Rp0") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(parsed);
}

export function formatDate(value, fallback = "—") {
  const parsed = parseDate(value);
  return parsed ? formattedDatePart(parsed) : fallback;
}

export function formatDateTime(value, fallback = "—") {
  const parsed = parseDate(value);
  if (!parsed) {
    return fallback;
  }
  if (configuredDateFormat === "DD MMM YYYY") {
    return dateTimeFormatter.format(parsed);
  }
  return `${formattedDatePart(parsed)} ${timeFormatter.format(parsed)}`;
}

export function formatTime(value, fallback = "—") {
  const parsed = parseDate(value);
  return parsed ? timeFormatter.format(parsed) : fallback;
}

export function formatRelativeTime(value, fallback = "Belum tersedia") {
  const parsed = parseDate(value);
  if (!parsed) {
    return fallback;
  }

  const differenceMs = Date.now() - parsed.getTime();
  const absoluteMs = Math.abs(differenceMs);
  if (absoluteMs < 60_000) {
    return "baru saja";
  }
  if (absoluteMs < 3_600_000) {
    return `${Math.max(1, Math.round(absoluteMs / 60_000))} menit lalu`;
  }
  if (absoluteMs < 86_400_000) {
    return `${Math.max(1, Math.round(absoluteMs / 3_600_000))} jam lalu`;
  }
  return formatDateTime(parsed);
}

export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) {
    return "—";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export function normalizeOptionalText(value) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

export function movementLabel(type) {
  const labels = {
    IN: "Barang masuk",
    OUT: "Barang keluar",
    // Historical records may still exist; new adjustments are no longer created.
    ADJUSTMENT: "Catatan lama",
  };
  return labels[String(type || "").toUpperCase()] || "Pergerakan stok";
}

export function backupStatusLabel(status) {
  const labels = {
    PENDING: "Menunggu backup",
    RUNNING: "Mencadangkan…",
    SUCCESS: "Backup berhasil",
    FAILED: "Backup gagal",
    IDLE: "Tersimpan",
    HEALTHY: "Tersimpan",
  };
  return labels[String(status || "").toUpperCase()] || "Status belum tersedia";
}

export function backupStatusTone(status) {
  const value = String(status || "").toUpperCase();
  if (["SUCCESS", "IDLE", "HEALTHY"].includes(value)) {
    return "success";
  }
  if (value === "FAILED") {
    return "danger";
  }
  if (["PENDING", "RUNNING"].includes(value)) {
    return "running";
  }
  return "neutral";
}

export function parseDate(value) {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function safeFileName(value, fallback = "unduhan") {
  const baseName = String(value || fallback)
    .split(/[\\/]/)
    .pop()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim();
  return baseName || fallback;
}

function formattedDatePart(value) {
  if (configuredDateFormat === "DD/MM/YYYY") {
    return numericDateFormatter.format(value);
  }
  if (configuredDateFormat === "YYYY-MM-DD") {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateFormatter.format(value);
}
