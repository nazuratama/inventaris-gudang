import { badge, element, icon } from "../../utils/dom.js";
import {
  backupStatusTone,
  formatNumber,
  formatRelativeTime,
} from "../../utils/formatting.js";
import { pickNumber, pickValue } from "../../utils/data.js";

export function createInsightsCard(context) {
  const insights = buildDashboardInsights(context);
  const list =
    insights.length > 0
      ? element("div", {
          className: "insight-list",
          children: insights.map((insight) => createInsightRow(insight)),
        })
      : element("div", {
          className: "inline-alert inline-alert-success",
          children: [
            icon("check-circle"),
            element("div", {
              children: [
                element("strong", { text: "Gudang dalam kondisi stabil" }),
                element("span", {
                  text: "Belum ada sinyal khusus. Lanjutkan pencatatan stok harian.",
                }),
              ],
            }),
          ],
        });

  return element("section", {
    className: ["card", "dashboard-insights-card"],
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Insight gudang" }),
              element("p", { text: "Sinyal operasional dari data lokal" }),
            ],
          }),
          badge(`${insights.length} poin`, insights.length ? "info" : "success"),
        ],
      }),
      element("div", {
        className: "card-body dashboard-insights-body",
        children: [list],
      }),
    ],
  });
}

function createInsightRow(insight) {
  const toneClass =
    insight.tone === "danger"
      ? "insight-row-danger"
      : insight.tone === "warning"
        ? "insight-row-warning"
        : insight.tone === "success"
          ? "insight-row-success"
          : "insight-row-info";

  const copyChildren = [
    element("strong", { text: insight.title }),
    insight.detail ? element("small", { text: insight.detail }) : null,
  ];

  if (Array.isArray(insight.metrics) && insight.metrics.length > 0) {
    copyChildren.push(
      element("div", {
        className: "insight-metric-row",
        children: insight.metrics.map((metric) =>
          element("div", {
            className: ["insight-metric", metric.tone ? `insight-metric-${metric.tone}` : null],
            children: [
              element("span", { className: "insight-metric-value", text: formatNumber(metric.value) }),
              element("span", { className: "insight-metric-label", text: metric.label }),
            ],
          }),
        ),
      }),
    );
  }

  const content = [
    element("span", {
      className: ["movement-icon", insightIconTone(insight.tone)],
      children: [icon(insight.iconName || "info")],
    }),
    element("div", {
      className: "list-copy",
      children: copyChildren,
    }),
  ];

  if (insight.href) {
    return element("a", {
      className: [
        "insight-row",
        toneClass,
        "insight-row-link",
        insight.metrics ? "insight-row-rich" : null,
      ],
      attributes: {
        href: insight.href,
        title: insight.title,
      },
      children: content,
    });
  }

  return element("div", {
    className: ["insight-row", toneClass, insight.metrics ? "insight-row-rich" : null],
    children: content,
  });
}

function insightIconTone(tone) {
  if (tone === "danger") {
    return "movement-out";
  }
  if (tone === "warning") {
    return "movement-adjustment";
  }
  if (tone === "success") {
    return "movement-in";
  }
  return "movement-adjustment";
}

function buildDashboardInsights({
  categories,
  locations,
  recentMovements,
  backup,
}) {
  // Show all available insights so the side card can fill to the bottom (no hard cap of 4).
  // Stock KPIs → summary cards; priority items → "Perlu diperhatikan".
  const insights = [];

  const topCategory = topShareEntry(categories);
  if (topCategory) {
    insights.push({
      tone: topCategory.share >= 0.45 ? "warning" : "info",
      iconName: "category",
      title: `Kategori terpadat: ${topCategory.name}`,
      detail: `${formatNumber(topCategory.count)} jenis · ${formatPercent(topCategory.share)} inventaris aktif.`,
      href: "#/inventory?active=true&scope=categories",
    });
  }

  const topLocation = topShareEntry(locations);
  if (topLocation) {
    insights.push({
      tone: topLocation.share >= 0.5 ? "warning" : "info",
      iconName: "location",
      title: `Lokasi terpadat: ${topLocation.name}`,
      detail: `${formatNumber(topLocation.count)} jenis · ${formatPercent(topLocation.share)} konsentrasi barang.`,
      href: "#/inventory?active=true&scope=locations",
    });
  }

  const movementInsight = summarizeRecentMovements(recentMovements);
  if (movementInsight) {
    insights.push(movementInsight);
  }

  const backupInsight = summarizeBackupInsight(backup);
  if (backupInsight) {
    insights.push(backupInsight);
  }

  return insights;
}

function topShareEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }
  const rows = entries.map((entry) => ({
    name: pickValue(entry, ["name", "category_name", "location_name"], "Tanpa nama"),
    count: pickNumber(entry, ["item_count", "count", "total_items"]),
  }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) {
    return null;
  }
  rows.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "id"));
  const top = rows[0];
  return {
    name: top.name,
    count: top.count,
    share: top.count / total,
  };
}

function summarizeRecentMovements(movements) {
  if (!Array.isArray(movements) || movements.length === 0) {
    return {
      tone: "info",
      iconName: "history",
      title: "Belum ada jejak pergerakan",
      detail: "Catat barang masuk/keluar agar insight aktivitas muncul di sini.",
      href: "#/inventory",
    };
  }

  let incoming = 0;
  let outgoing = 0;
  for (const movement of movements) {
    const type = String(movement.movement_type || movement.type || "").toUpperCase();
    if (type === "IN") {
      incoming += 1;
    } else if (type === "OUT") {
      outgoing += 1;
    }
  }

  const total = movements.length;
  let tone = "info";
  let title = "Aktivitas stok terbaru seimbang";
  if (outgoing > incoming) {
    tone = "warning";
    title = "Keluar lebih dominan di jejak terbaru";
  } else if (incoming > outgoing) {
    tone = "success";
    title = "Masuk lebih dominan di jejak terbaru";
  }

  const parts = [
    `${formatNumber(incoming)} masuk`,
    `${formatNumber(outgoing)} keluar`,
  ];

  return {
    tone,
    iconName: "history",
    title,
    detail: `${parts.join(" · ")} dari ${formatNumber(total)} catatan terbaru.`,
    href: "#/inventory",
  };
}

function summarizeBackupInsight(backup) {
  const status = pickValue(backup, ["status", "backup_status"], "IDLE");
  const tone = backupStatusTone(status);
  const lastSuccess =
    backup?.last_success?.created_at ||
    pickValue(backup || {}, ["last_success_at", "last_successful_backup", "created_at"]) ||
    backup?.last_backup?.created_at;

  if (tone === "danger") {
    return {
      tone: "danger",
      iconName: "alert-triangle",
      title: "Backup terakhir bermasalah",
      detail: "Periksa folder cadangan dan jalankan backup manual.",
      href: "#/backups",
    };
  }

  if (!lastSuccess) {
    return {
      tone: "warning",
      iconName: "backup",
      title: "Belum ada backup berhasil",
      detail: "Buat cadangan Excel pertama agar data siap dipulihkan.",
      href: "#/backups",
    };
  }

  return {
    tone: "success",
    iconName: "backup",
    title: "Cadangan data tersedia",
    detail: `Terakhir berhasil ${formatRelativeTime(lastSuccess)}.`,
    href: "#/backups",
  };
}

function formatPercent(ratio) {
  const value = Number(ratio);
  if (!Number.isFinite(value) || value < 0) {
    return "0%";
  }
  const percent = value * 100;
  if (percent > 0 && percent < 1) {
    return "<1%";
  }
  return `${Math.round(percent)}%`;
}

