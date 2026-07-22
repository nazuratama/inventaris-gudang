import { createEmptyState } from "../states.js";
import { element } from "../../utils/dom.js";
import { formatNumber } from "../../utils/formatting.js";

export function formatCompactCurrency(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1)}M`;
  }
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}jt`;
  }
  if (Math.abs(number) >= 1_000) {
    return `${(number / 1_000).toFixed(0)}rb`;
  }
  return formatNumber(number);
}

/** Short currency for donut center (avoids "Rp 21.xxx.xxx" overflow). */
export function formatCenterCurrency(value, currency = "IDR") {
  const number = Number(value || 0);
  const compact = formatCompactCurrency(number);
  if (currency === "IDR" || !currency) {
    if (Math.abs(number) >= 1000) {
      return `Rp ${compact}`;
    }
    return formatCurrency(number, "IDR");
  }
  return `${currency} ${compact}`;
}

/** Escape dynamic inventory text before embedding in ECharts HTML tooltips. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function textualSummary(chartId, data) {
  const summary = data?.summary || {};
  if (chartId === "stock-movement-ranking") {
    return `${formatNumber(summary.item_count || 0)} barang dibandingkan; total masuk ${formatNumber(summary.total_incoming || 0)} dan keluar ${formatNumber(summary.total_outgoing || 0)}.`;
  }
  if (chartId === "stock-movement-trend") {
    return `${formatNumber(summary.period_count || 0)} periode ditampilkan dengan agregasi ${summary.aggregation || "harian"}.`;
  }
  if (chartId === "stock-by-location") {
    return `${formatNumber(summary.location_count || 0)} lokasi ditampilkan; total stok ${formatNumber(summary.total_stock || 0)}.`;
  }
  if (chartId === "inventory-value-by-category") {
    return `Nilai beli ${formatCurrency(summary.purchase_value, summary.currency)}; estimasi margin ${formatCurrency(summary.gross_margin, summary.currency)}.`;
  }
  if (chartId === "stock-risk" || chartId === "risk-funnel") {
    return `${formatNumber(summary.at_risk || 0)} barang berada pada kondisi menipis, kritis, atau habis.`;
  }
  if (chartId === "inventory-movement-velocity") {
    return summary.method || "Klasifikasi dihitung dari transaksi keluar pada periode aktif.";
  }
  if (chartId === "stock-treemap") {
    return `${formatNumber(summary.category_count || 0)} kategori dengan total stok ${formatNumber(summary.total_stock || 0)}. Klik blok untuk daftar barang.`;
  }
  if (chartId === "top-value-items") {
    return `${formatNumber(summary.item_count || 0)} barang bernilai tertinggi; total ${formatCurrency(summary.total_purchase_value, summary.currency)}.`;
  }
  if (chartId === "movement-by-category") {
    return `${formatNumber(summary.category_count || 0)} kategori; masuk ${formatNumber(summary.total_incoming || 0)}, keluar ${formatNumber(summary.total_outgoing || 0)}.`;
  }
  if (chartId === "movement-heatmap") {
    return `Hari tersibuk: ${summary.busiest_day || "—"}; total ${formatNumber(summary.total_transactions || 0)} transaksi.`;
  }
  if (chartId === "category-radar") {
    return `${formatNumber(summary.category_count || 0)} kategori utama dibandingkan pada lima dimensi performa.`;
  }
  if (chartId === "abc-analysis") {
    const counts = summary.class_counts || {};
    return `Kelas A ${formatNumber(counts.A || 0)}, B ${formatNumber(counts.B || 0)}, C ${formatNumber(counts.C || 0)}; nilai total ${formatCurrency(summary.total_purchase_value, summary.currency)}.`;
  }
  if (chartId === "stock-vs-minimum") {
    return `${formatNumber(summary.below_minimum || 0)} dari ${formatNumber(summary.item_count || 0)} barang di bawah minimum.`;
  }
  if (chartId === "outgoing-pareto") {
    return `${formatNumber(summary.item_count || 0)} barang keluar; porsi teratas ${formatNumber(summary.top_share || 0, 1)}%.`;
  }
  if (chartId === "monthly-net-flow") {
    return `${formatNumber(summary.period_count || 0)} bulan; bersih kumulatif akhir ${formatNumber(summary.final_running_net || 0)}.`;
  }
  if (chartId === "stock-health-gauge") {
    return `Skor kesehatan ${formatNumber(summary.score || 0, 1)} dari 100; ${formatNumber(summary.at_risk || 0)} barang berisiko.`;
  }
  return `${formatNumber(summary.category_count || 0)} kategori ditampilkan sesuai filter aktif.`;
}

export function createDataTable(rows) {
  if (!rows.length) {
    return createEmptyState({
      iconName: "file",
      title: "Tidak ada data tabel",
      message: "Ubah filter atau rentang tanggal lalu coba kembali.",
    });
  }
  const headers = Object.keys(rows[0]);
  return element("div", {
    className: "table-scroll",
    children: [
      element("table", {
        className: "data-table",
        children: [
          element("thead", {
            children: [
              element("tr", {
                children: headers.map((header) =>
                  element("th", {
                    text: humanize(header),
                    attributes: { scope: "col" },
                  }),
                ),
              }),
            ],
          }),
          element("tbody", {
            children: rows.map((row) =>
              element("tr", {
                children: headers.map((header) =>
                  element("td", {
                    text:
                      typeof row[header] === "number"
                        ? formatNumber(row[header])
                        : row[header] ?? "—",
                  }),
                ),
              }),
            ),
          }),
        ],
      }),
    ],
  });
}

function humanize(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCurrency(value, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(Number(value || 0));
}

export function exportFilters(filters) {
  const allowed = [
    "date_range",
    "date_from",
    "date_to",
    "category_id",
    "location_id",
    "include_archived",
    "include_demo",
    "data_scope",
    "aggregation",
    "top_n",
    "ranking",
    "movement_scope",
    "metric",
    "show_net",
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => filters[key] !== undefined && filters[key] !== "")
      .map((key) => [key, filters[key]]),
  );
}
