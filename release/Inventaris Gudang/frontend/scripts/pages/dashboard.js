import { getDashboard } from "../api/dashboard-api.js";
import {
  getAnalyticsOverview,
  getFeaturedAnalytics,
} from "../api/analytics-api.js";
import { createAnalyticsChartCard } from "../components/analytics-chart.js?v=20260722-ui14";
import { createDashboardCalendar } from "../components/dashboard-calendar.js";
import { openItemDrawer } from "../components/item-drawer.js";
import { createEmptyState, createErrorState, createPageLoading } from "../components/states.js";
import { appState } from "../state/app-state.js";
import { button, element, icon, replace } from "../utils/dom.js";
import {
  formatDateTime,
  formatNumber,
  movementLabel,
} from "../utils/formatting.js";
import { getCollection, getItemName, pickNumber } from "../utils/data.js";
import { openDashboardMetricWindow } from "./dashboard/metric-window.js";

export async function mountDashboard(context) {
  replace(context.container, createPageLoading());

  try {
    const [dashboard, analyticsOverview] = await Promise.all([
      getDashboard({ signal: context.signal }),
      getAnalyticsOverview({ signal: context.signal }).catch(() => null),
    ]);
    const featuredChartId = analyticsOverview?.settings?.featured_chart;
    const featuredData =
      featuredChartId && analyticsOverview?.settings?.analytics_enabled
        ? await getFeaturedAnalytics(
            featuredFilters(featuredChartId, analyticsOverview.settings),
            { signal: context.signal },
          ).catch(() => null)
        : null;
    if (context.signal.aborted) {
      return;
    }
    appState.set("backup", dashboard?.backup_state || dashboard?.backup || null);
    const rendered = renderDashboard(
      dashboard || {},
      context,
      analyticsOverview,
      featuredData,
    );
    replace(context.container, rendered.element);
    rendered.featured?.load();
    return () => rendered.featured?.destroy();
  } catch (error) {
    if (error?.name !== "AbortError") {
      replace(
        context.container,
        element("div", {
          className: "page-container",
          children: [createErrorState(error, context.refresh)],
        }),
      );
    }
  }
  return undefined;
}

function renderDashboard(data, context, analyticsOverview, featuredData) {
  const summary = data.summary || data;
  const recentMovements = getCollection(data, ["recent_movements", "movements"]);

  const totalActive = pickNumber(summary, ["total_active_items", "total_items", "active_items"]);
  const totalStock = pickNumber(summary, ["total_stock", "stock_total"]);
  const lowStock = pickNumber(summary, ["low_stock_items", "low_stock_count", "low_stock"]);
  const outOfStock = pickNumber(summary, [
    "out_of_stock_items",
    "out_of_stock_count",
    "out_of_stock",
  ]);

  const container = element("div", {
    className: ["page-container", "page-stack", "app-page", "dashboard-page"],
  });

  let featured = null;
  let featuredSection = null;
  const analyticsSettings = analyticsOverview?.settings;
  if (analyticsSettings?.analytics_enabled && featuredData) {
    const chart = (analyticsOverview.charts || []).find(
      (entry) => entry.chart_id === analyticsSettings.featured_chart,
    );
    if (chart) {
      let initialData = featuredData;
      featured = createAnalyticsChartCard({
        chart,
        settings: {
          ...analyticsSettings,
          // The dashboard grid owns the height so the chart fills the viewport.
          plot_layout: "fill",
          chart_height: 420,
        },
        filters: featuredFilters(chart.chart_id, analyticsSettings),
        loadData: async (filters, signal, force) => {
          if (initialData && !force) {
            const data = initialData;
            initialData = null;
            return data;
          }
          return getFeaturedAnalytics(filters, { signal });
        },
        onDrilldown: (row) => {
          if (row.item_id) {
            openItemDrawer(row.item_id, {
              onChanged: context.refresh,
            });
          }
        },
      });
      featured.element.classList.add("featured-analytics-card");
      // Keep "Buka ruang analitik" inside chart footer so side panel bottom
      // Keep export actions aligned with the updated-at control row.
      const chartFooter = featured.element.querySelector(".chart-card-footer");
      if (chartFooter) {
        chartFooter.append(
          element("a", {
            className: ["button", "button-quiet", "button-compact", "featured-analytics-link"],
            attributes: { href: "#/analytics", title: "Buka ruang analitik" },
            children: [icon("chart"), element("span", { text: "Analitik" })],
          }),
        );
      }
      featuredSection = featured.element;
    }
  }

  // Operational side rail: calendar context above the latest stock activity.
  const heroSide = element("div", {
    className: "dashboard-hero-side",
    children: [
      createDashboardCalendar({ recentMovements }),
      createRecentMovementsCard(recentMovements),
    ],
  });

  const heroBand = featuredSection
    ? element("section", {
        className: "dashboard-hero",
        attributes: { "aria-label": "Grafik, kalender, dan pergerakan stok terbaru" },
        children: [
          element("div", {
            className: "dashboard-hero-chart",
            children: [featuredSection],
          }),
          heroSide,
        ],
      })
    : element("section", {
        className: "dashboard-hero dashboard-hero-plain",
        attributes: { "aria-label": "Kalender dan pergerakan stok terbaru" },
        children: [heroSide],
      });

  container.append(
    element("section", {
      className: "summary-grid",
      attributes: { "aria-label": "Ringkasan inventaris" },
      children: [
        createSummaryCard({
          metric: "active",
          label: "Barang aktif",
          value: totalActive,
          note: "Jenis barang yang dikelola",
          iconName: "package",
          context,
        }),
        createSummaryCard({
          metric: "total_stock",
          label: "Total stok",
          value: totalStock,
          note: "Gabungan seluruh satuan",
          iconName: "warehouse",
          tone: "success",
          context,
        }),
        createSummaryCard({
          metric: "low",
          label: "Stok menipis",
          value: lowStock,
          note: "Perlu dijadwalkan pengadaan",
          iconName: "alert-triangle",
          tone: "warning",
          context,
        }),
        createSummaryCard({
          metric: "out",
          label: "Stok habis",
          value: outOfStock,
          note: "Perlu tindakan segera",
          iconName: "box-open",
          tone: "danger",
          context,
        }),
      ],
    }),
    heroBand,
  );
  return { element: container, featured };
}

function featuredFilters(chartId, settings) {
  const filters = {
    date_range: settings.default_date_range,
    top_n: settings.default_top_n,
    ranking: "highest",
    movement_scope: "both",
    metric: "",
    aggregation: settings.default_aggregation,
    show_net: false,
    data_scope: "all",
  };
  if (chartId === "inventory-movement-velocity") {
    filters.metric = "all";
    filters.date_range = settings.movement_default_period || filters.date_range;
  } else if (chartId === "stock-by-category" || chartId === "stock-by-location") {
    filters.metric = "quantity";
  }
  return filters;
}

function createSummaryCard(options) {
  return element("button", {
    className: [
      "card",
      "summary-card",
      "summary-card-interactive",
      `summary-card-${options.tone || "primary"}`,
    ],
    attributes: {
      type: "button",
      title: `Lihat daftar ${options.label.toLowerCase()}`,
      "aria-label": `Buka ${options.label}: ${formatNumber(options.value)}`,
    },
    events: {
      click: (event) =>
        openDashboardMetricWindow(options.metric, {
          trigger: event.currentTarget,
          context: options.context,
          summaryValue: options.value,
        }),
    },
    children: [
      element("span", {
        className: [
          "summary-icon",
          options.tone ? `summary-icon-${options.tone}` : "",
        ],
        children: [icon(options.iconName)],
      }),
      element("div", {
        className: "summary-card-copy",
        children: [
          element("div", { className: "summary-label", text: options.label }),
          element("div", {
            className: "summary-value number",
            text: formatNumber(options.value),
          }),
          element("div", {
            className: "summary-note",
            text: options.note,
          }),
        ],
      }),
      element("span", {
        className: "summary-card-chevron",
        attributes: { "aria-hidden": "true" },
        children: [icon("chevron-right")],
      }),
    ],
  });
}

/**
 * Floating (settings-style) window listing items for a dashboard KPI card.
 */

function createRecentMovementsCard(movements) {
  const body =
    movements.length > 0
      ? element("div", {
          className: "timeline-list",
          children: movements.slice(0, 8).map((movement) => {
            const type = String(movement.movement_type || movement.type || "").toUpperCase();
            const quantity =
              type === "ADJUSTMENT"
                ? `${formatNumber(movement.stock_before)} → ${formatNumber(movement.stock_after)}`
                : `${type === "IN" ? "+" : "−"}${formatNumber(movement.quantity)}`;
            return element("div", {
              className: "timeline-item",
              children: [
                element("span", {
                  className: ["movement-icon", `movement-${type.toLowerCase()}`],
                  children: [
                    icon(type === "IN" ? "arrow-up" : type === "OUT" ? "arrow-down" : "adjust"),
                  ],
                }),
                element("div", {
                  className: "list-copy",
                  children: [
                    element("strong", { text: getItemName(movement) }),
                    element("small", {
                      text: `${movementLabel(type)} · ${formatDateTime(movement.created_at)}`,
                    }),
                  ],
                }),
                element("span", { className: "list-value number", text: quantity }),
              ],
            });
          }),
        })
      : createEmptyState({
          iconName: "history",
          title: "Belum ada pergerakan stok",
          message: "Barang masuk dan barang keluar akan tercatat di sini.",
        });

  return element("section", {
    className: ["card", "dashboard-ops-card", "dashboard-recent-card"],
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Pergerakan stok terbaru" }),
              element("p", { text: "Jejak perubahan paling baru" }),
            ],
          }),
          element("a", {
            className: ["button", "button-quiet", "button-compact"],
            attributes: {
              href: "#/inventory",
              title: "Lihat seluruh pergerakan stok",
            },
            children: [element("span", { text: "Lihat semua" }), icon("chevron-right")],
          }),
        ],
      }),
      element("div", { className: "card-body dashboard-ops-body", children: [body] }),
    ],
  });
}
