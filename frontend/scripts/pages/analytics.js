import {
  getAnalyticsOverview,
  updateAnalyticsSettings,
} from "../api/analytics-api.js";
import { createAnalyticsChartCard } from "../components/analytics-chart.js?v=20260722-ui14";
import { createErrorState, createPageLoading } from "../components/states.js";
import { showApiError, showToast } from "../components/toast.js";
import { loadCatalogs } from "../utils/catalogs.js";
import { button, element, icon, replace, runWithButtonBusy } from "../utils/dom.js";
import { formatDateTime } from "../utils/formatting.js";
import {
  chartInitialFilters,
  mergeEnabledOrderIntoFull,
  normalizeChartOrder,
  sortChartsByOrder,
} from "./analytics/chart-config.js";
import { drillDown } from "./analytics/drilldown.js";

const DEFAULT_FILTERS = Object.freeze({
  date_range: "30d",
  category_id: "",
  location_id: "",
  data_scope: "all",
  // Archiving was removed, so every product remains in scope.
  include_archived: true,
});

export async function mountAnalytics(context) {
  replace(context.container, createPageLoading(0));
  try {
    const [overview, catalogs] = await Promise.all([
      getAnalyticsOverview({ signal: context.signal }),
      loadCatalogs({ signal: context.signal }),
    ]);
    if (context.signal.aborted) {
      return undefined;
    }
    return renderAnalytics(overview, catalogs, context);
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
    return undefined;
  }
}

function renderAnalytics(overview, catalogs, context) {
  const settings = { ...(overview.settings || {}) };
  const filters = {
    ...DEFAULT_FILTERS,
    date_range: settings.default_date_range || DEFAULT_FILTERS.date_range,
    include_archived: true,
  };
  const controllers = [];
  const lastUpdated = element("span", {
    className: "subtle",
    text: `Data dimuat ${formatDateTime(overview.generated_at)}`,
  });
  let observer = null;
  let refreshTimer = null;
  let layoutEditMode = false;
  let dragSourceId = null;
  const fullOrder = normalizeChartOrder(
    settings.chart_order,
    (overview.charts || []).map((chart) => chart.chart_id),
  );
  settings.chart_order = fullOrder;

  const layoutBanner = element("div", {
    className: ["inline-alert", "inline-alert-info", "chart-layout-banner"],
    attributes: { hidden: true },
  });
  const layoutStatus = element("span", {
    className: "subtle",
    text: "",
  });

  const page = element("div", {
    className: ["page-container", "page-stack", "app-page", "analytics-page"],
  });
  page.append(
    element("div", {
      className: ["page-toolbar", "page-toolbar-actions-only", "analytics-actionbar"],
      children: [
        element("div", {
          className: "toolbar-actions",
          children: [
            lastUpdated,
            button("Atur posisi", {
              className: "button-secondary",
              iconName: "adjust",
              onClick: () => setLayoutEditMode(!layoutEditMode),
            }),
            button("Perbarui", {
              variant: "button-primary",
              iconName: "refresh",
              onClick: () => refreshAll(true),
            }),
          ],
        }),
      ],
    }),
  );

  if (!settings.analytics_enabled) {
    page.append(
      element("section", {
        className: "card",
        children: [
          element("div", {
            className: "empty-state",
            children: [
              element("div", {
                className: "empty-state-content",
                children: [
                  element("span", {
                    className: "empty-state-icon",
                    children: [icon("chart")],
                  }),
                  element("h3", { text: "Analitik dinonaktifkan" }),
                  element("p", {
                    text: "Aktifkan kembali melalui Pengaturan Lanjutan.",
                  }),
                  element("a", {
                    className: ["button", "button-primary"],
                    attributes: { href: "#/settings" },
                    text: "Buka Pengaturan",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    replace(context.container, page);
    return undefined;
  }

  page.append(createGlobalFilters(filters, catalogs, refreshAll, resetFilters));
  page.append(layoutBanner);
  renderLayoutBanner();

  const grid = element("section", {
    className: [
      "analytics-grid",
      settings.spacing === "compact" ? "analytics-grid-compact" : null,
    ],
    attributes: { "aria-label": "Grafik analitik inventaris" },
  });
  const enabledCharts = sortChartsByOrder(
    (overview.charts || []).filter((chart) => chart.enabled),
    fullOrder,
  );
  for (const chart of enabledCharts) {
    const controller = createAnalyticsChartCard({
      chart,
      settings,
      filters: chartInitialFilters(chart.chart_id, filters, settings),
      onDrilldown: (row) => drillDown(row, context),
    });
    controllers.push(controller);
    grid.append(wrapChartCard(controller, chart));
  }
  page.append(grid);
  replace(context.container, page);
  setupGridDragAndDrop();
  syncLayoutUi();

  if (settings.lazy_rendering && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const controller = controllers.find(
            (candidate) => candidate.element === entry.target,
          );
          controller?.load();
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "180px" },
    );
    controllers.forEach((controller) => observer.observe(controller.element));
  } else {
    controllers.forEach((controller) => controller.load());
  }

  if (settings.refresh_enabled) {
    refreshTimer = window.setInterval(
      () => refreshAll(false),
      Math.max(30, Number(settings.refresh_interval_seconds || 120)) * 1000,
    );
  }

  function wrapChartCard(controller, chart) {
    const shell = element("div", {
      className: "analytics-card-shell",
      dataset: { chartId: chart.chart_id },
      attributes: {
        draggable: "false",
      },
    });
    const reorderBar = element("div", {
      className: "chart-reorder-bar",
      attributes: { hidden: true },
      children: [
        element("button", {
          className: ["button", "button-compact", "chart-drag-handle"],
          attributes: {
            type: "button",
            "aria-label": `Seret ${chart.title}`,
            title: "Seret untuk memindahkan",
          },
          children: [icon("menu"), element("span", { text: "Seret" })],
        }),
        element("div", {
          className: "chart-reorder-actions",
          children: [
            button("", {
              className: "button-compact",
              iconName: "arrow-up",
              ariaLabel: `Naikkan ${chart.title}`,
              onClick: () => moveChart(chart.chart_id, -1),
            }),
            button("", {
              className: "button-compact",
              iconName: "arrow-down",
              ariaLabel: `Turunkan ${chart.title}`,
              onClick: () => moveChart(chart.chart_id, 1),
            }),
          ],
        }),
        element("span", {
          className: "chart-reorder-label subtle",
          text: "Mode atur posisi",
        }),
      ],
    });
    shell.append(reorderBar, controller.element);
    controller.shell = shell;
    controller.reorderBar = reorderBar;
    return shell;
  }

  function setupGridDragAndDrop() {
    grid.addEventListener("dragstart", (event) => {
      if (!layoutEditMode) {
        event.preventDefault();
        return;
      }
      const shell = event.target.closest?.(".analytics-card-shell");
      if (!shell) {
        return;
      }
      dragSourceId = shell.dataset.chartId;
      shell.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragSourceId);
    });
    grid.addEventListener("dragend", () => {
      grid.querySelectorAll(".analytics-card-shell").forEach((node) => {
        node.classList.remove("is-dragging", "is-drop-target");
      });
      dragSourceId = null;
    });
    grid.addEventListener("dragover", (event) => {
      if (!layoutEditMode || !dragSourceId) {
        return;
      }
      event.preventDefault();
      const shell = event.target.closest?.(".analytics-card-shell");
      if (!shell || shell.dataset.chartId === dragSourceId) {
        return;
      }
      grid.querySelectorAll(".analytics-card-shell.is-drop-target").forEach((node) => {
        if (node !== shell) {
          node.classList.remove("is-drop-target");
        }
      });
      shell.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "move";
    });
    grid.addEventListener("drop", (event) => {
      if (!layoutEditMode) {
        return;
      }
      event.preventDefault();
      const shell = event.target.closest?.(".analytics-card-shell");
      const sourceId = dragSourceId || event.dataTransfer.getData("text/plain");
      const targetId = shell?.dataset?.chartId;
      grid.querySelectorAll(".analytics-card-shell").forEach((node) => {
        node.classList.remove("is-dragging", "is-drop-target");
      });
      if (!sourceId || !targetId || sourceId === targetId) {
        return;
      }
      reorderEnabledCharts(sourceId, targetId);
      dragSourceId = null;
    });
  }

  function currentEnabledOrder() {
    return [...grid.querySelectorAll(".analytics-card-shell")].map(
      (node) => node.dataset.chartId,
    );
  }

  function moveChart(chartId, delta) {
    if (!layoutEditMode) {
      return;
    }
    const order = currentEnabledOrder();
    const index = order.indexOf(chartId);
    if (index < 0) {
      return;
    }
    const next = index + delta;
    if (next < 0 || next >= order.length) {
      return;
    }
    const swapped = [...order];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    applyEnabledOrder(swapped);
  }

  function reorderEnabledCharts(sourceId, targetId) {
    const order = currentEnabledOrder();
    const from = order.indexOf(sourceId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) {
      return;
    }
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    applyEnabledOrder(next);
  }

  function applyEnabledOrder(enabledOrder) {
    const shellById = new Map(
      [...grid.querySelectorAll(".analytics-card-shell")].map((node) => [
        node.dataset.chartId,
        node,
      ]),
    );
    for (const chartId of enabledOrder) {
      const shell = shellById.get(chartId);
      if (shell) {
        grid.append(shell);
      }
    }
    settings.chart_order = mergeEnabledOrderIntoFull(fullOrder, enabledOrder);
    fullOrder.splice(0, fullOrder.length, ...settings.chart_order);
    layoutStatus.textContent = "Urutan diubah (belum disimpan).";
    controllers.forEach((controller) => controller.resize?.());
  }

  function setLayoutEditMode(enabled) {
    layoutEditMode = Boolean(enabled);
    syncLayoutUi();
  }

  function syncLayoutUi() {
    page.classList.toggle("analytics-layout-editing", layoutEditMode);
    grid.classList.toggle("analytics-grid-editing", layoutEditMode);
    layoutBanner.hidden = !layoutEditMode;
    for (const controller of controllers) {
      const shell = controller.shell;
      const bar = controller.reorderBar;
      if (!shell || !bar) {
        continue;
      }
      bar.hidden = !layoutEditMode;
      shell.setAttribute("draggable", layoutEditMode ? "true" : "false");
      shell.classList.toggle("is-editable", layoutEditMode);
    }
    if (!layoutEditMode) {
      layoutStatus.textContent = "";
    } else {
      layoutStatus.textContent =
        "Seret kartu atau gunakan tombol naik/turun, lalu simpan.";
    }
  }

  function renderLayoutBanner() {
    replace(
      layoutBanner,
      element("div", {
        className: "chart-layout-banner-inner",
        children: [
          element("div", {
            children: [
              element("strong", { text: "Mode atur posisi grafik" }),
              element("p", {
                className: "muted",
                text: "Pindahkan grafik ke posisi mana pun (naik/turun atau seret-lepas). Perubahan disimpan ke pengaturan lokal.",
              }),
              layoutStatus,
            ],
          }),
          element("div", {
            className: "chart-layout-banner-actions",
            children: [
              button("Batal", {
                className: "button-secondary",
                onClick: () => {
                  setLayoutEditMode(false);
                  context.refresh();
                },
              }),
              button("Simpan urutan", {
                variant: "button-primary",
                iconName: "save",
                onClick: (event) =>
                  runWithButtonBusy(event.currentTarget, "Menyimpan…", () =>
                    saveChartOrder(),
                  ),
              }),
            ],
          }),
        ],
      }),
    );
  }

  async function saveChartOrder() {
    const enabledOrder = currentEnabledOrder();
    const nextOrder = mergeEnabledOrderIntoFull(fullOrder, enabledOrder);
    const payload = {
      ...settings,
      chart_order: nextOrder,
      chart_visibility: settings.chart_visibility,
    };
    try {
      const result = await updateAnalyticsSettings(payload);
      settings.chart_order = result.chart_order || nextOrder;
      fullOrder.splice(0, fullOrder.length, ...settings.chart_order);
      showToast({
        type: "success",
        title: "Urutan grafik disimpan",
        message: "Posisi grafik di ruang kerja analitik telah diperbarui.",
      });
      setLayoutEditMode(false);
      context.refresh();
    } catch (error) {
      showApiError(error, "Urutan grafik belum dapat disimpan");
    }
  }

  function refreshAll(force) {
    for (const controller of controllers) {
      Object.assign(controller.filters, filters);
      if (controller.hasLoaded()) {
        controller.load(force);
      }
    }
    lastUpdated.textContent = `Diperbarui ${formatDateTime(new Date())}`;
  }

  function resetFilters() {
    Object.assign(filters, {
      ...DEFAULT_FILTERS,
      date_range: settings.default_date_range || "90d",
    });
    context.refresh();
  }

  return () => {
    observer?.disconnect();
    window.clearInterval(refreshTimer);
    controllers.forEach((controller) => controller.destroy());
  };
}

function createGlobalFilters(filters, catalogs, refreshAll, resetFilters) {
  const range = filterSelect(
    "Rentang tanggal",
    [
      ["7d", "7 hari terakhir"],
      ["30d", "30 hari terakhir"],
      ["90d", "90 hari terakhir"],
      ["12m", "12 bulan terakhir"],
      ["all", "Semua data"],
    ],
    filters.date_range,
    (value) => {
      filters.date_range = value;
      refreshAll(true);
    },
  );
  const category = filterSelect(
    "Kategori",
    [
      ["", "Semua kategori"],
      ...catalogs.categories.map((entry) => [entry.id, entry.name]),
    ],
    filters.category_id,
    (value) => {
      filters.category_id = value;
      refreshAll(true);
    },
  );
  const location = filterSelect(
    "Lokasi",
    [
      ["", "Semua lokasi"],
      ...catalogs.locations.map((entry) => [entry.id, entry.name]),
    ],
    filters.location_id,
    (value) => {
      filters.location_id = value;
      refreshAll(true);
    },
  );
  return element("section", {
    className: "analytics-filter-bar",
    attributes: { "aria-label": "Filter global analitik" },
    children: [
      range,
      category,
      location,
      button("Reset filter", {
        iconName: "refresh",
        onClick: resetFilters,
      }),
    ],
  });
}

function filterSelect(label, options, value, onChange) {
  return element("label", {
    className: "compact-field",
    children: [
      element("span", { text: label }),
      element("select", {
        className: "filter-control",
        attributes: { "aria-label": label },
        events: { change: (event) => onChange(event.currentTarget.value) },
        children: options.map(([optionValue, optionLabel]) =>
          element("option", {
            text: optionLabel,
            attributes: { value: optionValue },
            properties: { selected: String(optionValue) === String(value) },
          }),
        ),
      }),
    ],
  });
}
