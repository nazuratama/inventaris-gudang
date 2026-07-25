import { exportAnalyticsData, getAnalyticsChart } from "../api/analytics-api.js";
import { closeModal, openModal } from "./modal.js";
import { createEmptyState } from "./states.js";
import { showApiError, showToast } from "./toast.js";
import { badge, button, element, icon, replace, runWithButtonBusy } from "../utils/dom.js";
import { formatDateTime } from "../utils/formatting.js";
import { loadEcharts } from "../utils/echarts-loader.js";
import { createLocalControls } from "./analytics-chart/controls.js";
import { createChartOption } from "./analytics-chart/options.js";
import {
  createDataTable,
  exportFilters,
  textualSummary,
} from "./analytics-chart/presentation.js";

export function createAnalyticsChartCard(options) {
  const chart = options.chart;
  const settings = options.settings;
  const filters = { ...options.filters };
  let echartsApi = null;
  let chartInstance = null;
  let rendered = false;
  let currentData = null;
  let activeController = null;
  let resizeObserver = null;
  let expandedInstance = null;

  const plot = element("div", {
    className: "analytics-plot",
    attributes: {
      role: "img",
      "aria-label": chart.title,
    },
  });
  const state = element("div", {
    className: "chart-state",
    attributes: { "aria-live": "polite" },
  });
  const summary = element("p", {
    className: "chart-text-summary",
    text: chart.description,
  });
  const updated = element("small", {
    className: "subtle",
    text: "Belum diperbarui",
  });
  const localControls = createLocalControls(chart.chart_id, filters, (patch) => {
    Object.assign(filters, patch);
    load(true);
  });
  const menu = element("div", {
    className: "chart-actions",
    children: [
      button("", {
        className: "button-compact",
        iconName: "refresh",
        ariaLabel: `Perbarui ${chart.title}`,
        onClick: (event) =>
          runWithButtonBusy(event.currentTarget, "Memuat…", () => load(true)),
      }),
      button("", {
        className: "button-compact",
        iconName: "adjust",
        ariaLabel: "Reset tampilan grafik",
        onClick: () => resetView(),
      }),
      button("", {
        className: "button-compact",
        iconName: "file",
        ariaLabel: "Lihat tabel data",
        onClick: (event) => openTable(event.currentTarget),
      }),
      button("", {
        className: "button-compact",
        iconName: "more",
        ariaLabel: "Perbesar grafik",
        onClick: (event) => openExpanded(event.currentTarget),
      }),
      settings.png_export_enabled
        ? button("", {
            className: "button-compact",
            iconName: "download",
            ariaLabel: "Ekspor grafik PNG",
            onClick: () => exportPng(),
          })
        : null,
    ],
  });
  const exportActions = settings.data_export_enabled
    ? element("div", {
        className: "chart-export-actions",
        children: [
          button("CSV", {
            className: "button-compact",
            onClick: () => exportData("csv"),
          }),
          button("Excel", {
            className: "button-compact",
            onClick: () => exportData("xlsx"),
          }),
        ],
      })
    : null;

  const card = element("article", {
    className: ["card", "analytics-card"],
    dataset: { chartId: chart.chart_id },
    children: [
      element("header", {
        className: "card-header chart-card-header",
        children: [
          element("div", {
            children: [
              element("div", {
                className: "chart-title-row",
                children: [
                  element("h2", { text: chart.title }),
                  chart.enabled === false ? badge("Dinonaktifkan", "neutral") : null,
                ],
              }),
              element("p", { text: chart.description }),
            ],
          }),
          menu,
        ],
      }),
      localControls
        ? element("div", {
            className: "chart-local-controls",
            children: [localControls],
          })
        : null,
      element("div", {
        className: "card-body chart-card-body",
        children: [state, plot, summary],
      }),
      element("footer", {
        className: "card-footer chart-card-footer",
        children: [updated, exportActions],
      }),
    ],
  });
  const layoutChangeHandler = () => window.requestAnimationFrame(() => resize());
  window.addEventListener("resize", layoutChangeHandler);
  document.addEventListener("inventory:layout-change", layoutChangeHandler);

  async function load(force = false) {
    activeController?.abort();
    activeController = new AbortController();
    renderLoading();
    try {
      const [library, data] = await Promise.all([
        loadEcharts(),
        options.loadData
          ? options.loadData(filters, activeController.signal, force)
          : getAnalyticsChart(chart.chart_id, filters, {
              signal: activeController.signal,
            }),
      ]);
      if (activeController.signal.aborted) {
        return;
      }
      echartsApi = library;
      currentData = data;
      renderData();
    } catch (error) {
      if (error?.name !== "AbortError") {
        renderError(error);
      }
    }
  }

  function renderLoading() {
    plot.hidden = true;
    summary.hidden = true;
    replace(
      state,
      element("div", {
        className: "chart-loading",
        children: [
          element("span", {
            className: "spinner",
            attributes: { "aria-hidden": "true" },
          }),
          element("span", { text: "Menyiapkan grafik…" }),
        ],
      }),
    );
    state.hidden = false;
  }

  function renderError(error) {
    plot.hidden = true;
    summary.hidden = true;
    replace(
      state,
      element("div", {
        className: "chart-error",
        children: [
          icon("alert-triangle"),
          element("strong", { text: "Grafik belum dapat dimuat" }),
          element("p", {
            text: error?.message || "Terjadi gangguan saat mengambil data analitik.",
          }),
          button("Coba lagi", {
            iconName: "refresh",
            onClick: () => load(true),
          }),
        ],
      }),
    );
    state.hidden = false;
  }

  function renderData() {
    const option = createChartOption(chart.chart_id, currentData, settings);
    if (!option || option.empty) {
      disposeChart();
      rendered = false;
      plot.hidden = true;
      summary.hidden = true;
      replace(
        state,
        createEmptyState({
          iconName: "chart",
          title: "Data belum cukup",
          message: "Belum ada transaksi yang cukup untuk menampilkan grafik ini.",
        }),
      );
      state.hidden = false;
      return;
    }
    state.hidden = true;
    plot.hidden = false;
    summary.hidden = false;
    ensureInstance(plot);
    applyPlotSize();
    applyChartOption(chartInstance, option);
    chartInstance.resize();
    rendered = true;
    installClickHandler(chartInstance);
    summary.textContent = textualSummary(chart.chart_id, currentData);
    updated.textContent = `Diperbarui ${formatDateTime(currentData.generated_at)}`;
    resizeObserver ??= new ResizeObserver(() => resize());
    resizeObserver.observe(card);
    resizeObserver.observe(plot);
    // The dashboard grid may finish stretching after the data state is painted.
    // Re-measure once that layout has settled so the ECharts canvas follows it.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resize());
    });
  }

  function ensureInstance(container) {
    if (!echartsApi) {
      return null;
    }
    if (!chartInstance || chartInstance.isDisposed?.()) {
      chartInstance = echartsApi.init(container, null, {
        renderer: "canvas",
        useDirtyRect: true,
      });
    }
    return chartInstance;
  }

  function disposeChart() {
    if (chartInstance && !chartInstance.isDisposed?.()) {
      chartInstance.dispose();
    }
    chartInstance = null;
  }

  function installClickHandler(instance) {
    if (!instance) {
      return;
    }
    // Charts that only show trends/intensity — no floating drilldown.
    const nonDrillable = new Set([
      "stock-movement-trend",
      "movement-heatmap",
      "monthly-net-flow",
    ]);
    instance.off("click");
    instance.on("click", (params) => {
      if (nonDrillable.has(chart.chart_id)) {
        return;
      }
      const pointIndex = Number.isInteger(params?.dataIndex) ? params.dataIndex : null;
      let label =
        params?.name ||
        (Array.isArray(params?.value) ? params.value[0] : undefined) ||
        currentData?.categories?.[pointIndex];
      // Treemap / nested nodes may expose path name
      if (!label && params?.treePathInfo?.length) {
        label = params.treePathInfo[params.treePathInfo.length - 1]?.name;
      }
      // Heatmap-style [x,y,value] is non-drillable above; skip dual-axis noise
      if (Array.isArray(params?.value) && params.value.length >= 3 && chart.chart_id === "movement-heatmap") {
        return;
      }

      const drilldown = currentData?.drilldown || {};
      const itemsByKey = drilldown.items_by_key || {};
      let row =
        pointIndex != null ? currentData?.table_rows?.[pointIndex] : undefined;

      if (
        chart.chart_id === "inventory-movement-velocity" ||
        chart.chart_id === "top-value-items" ||
        chart.chart_id === "stock-vs-minimum" ||
        chart.chart_id === "outgoing-pareto" ||
        chart.chart_id === "stock-movement-ranking"
      ) {
        row =
          (pointIndex != null ? drilldown.ranked_rows?.[pointIndex] : null) ||
          currentData?.table_rows?.find((entry) => entry.item_name === label) ||
          row;
      } else if (
        chart.chart_id === "stock-risk" ||
        chart.chart_id === "risk-funnel" ||
        chart.chart_id === "stock-health-gauge"
      ) {
        let key = label || params?.name;
        let items = itemsByKey[key] || [];
        // Gauge click is on the score, not a status slice — show all at-risk items.
        if (chart.chart_id === "stock-health-gauge" && !items.length) {
          key = "Barang berisiko";
          items = [
            ...(itemsByKey["Stok habis"] || []),
            ...(itemsByKey["Kritis"] || []),
            ...(itemsByKey["Menipis"] || []),
          ];
        }
        row = {
          group_label: key,
          items,
          drill_kind: "items",
          key_field: drilldown.key_field || "risk_status",
        };
      } else if (chart.chart_id === "abc-analysis") {
        const key = label;
        row = {
          group_label: key,
          items: itemsByKey[key] || [],
          drill_kind: "items",
          key_field: "abc_class",
        };
      } else if (
        chart.chart_id === "stock-by-category" ||
        chart.chart_id === "stock-by-location" ||
        chart.chart_id === "inventory-value-by-category" ||
        chart.chart_id === "stock-treemap" ||
        chart.chart_id === "movement-by-category" ||
        chart.chart_id === "category-radar"
      ) {
        const matched =
          currentData?.table_rows?.find(
            (entry) =>
              entry.category === label ||
              entry.location === label ||
              entry.item_name === label,
          ) || row;
        row = {
          ...(matched || {}),
          group_label: label,
          items: itemsByKey[label] || [],
          drill_kind: "items",
          key_field: drilldown.key_field || "category",
        };
      } else if (label && !row?.item_id) {
        row =
          currentData?.table_rows?.find(
            (entry) =>
              entry.item_name === label ||
              entry.category === label ||
              entry.location === label ||
              entry.abc_class === label ||
              entry.risk_status === label,
          ) || row;
      }

      if (row) {
        options.onDrilldown?.(row, currentData, chart);
      }
    });
  }

  function applyChartOption(instance, option) {
    if (!instance || !option || option.empty) {
      return;
    }
    const { __layout, ...echartsOption } = option;
    instance.setOption(echartsOption, { notMerge: true, lazyUpdate: false });
  }

  function resetView() {
    if (!chartInstance || !rendered) {
      return;
    }
    chartInstance.dispatchAction({ type: "restore" });
    applyChartOption(chartInstance, createChartOption(chart.chart_id, currentData, settings));
  }

  function applyPlotSize() {
    if (settings.plot_layout === "fill") {
      plot.classList.remove("analytics-plot-aspect");
      plot.classList.add("analytics-plot-fill");
      plot.style.removeProperty("height");
      return;
    }
    plot.classList.remove("analytics-plot-fill");
    // Proportional cards let CSS aspect-ratio drive their height.
    if (settings.plot_layout === "aspect" || settings.use_aspect_plot) {
      plot.classList.add("analytics-plot-aspect");
      plot.style.removeProperty("height");
      return;
    }
    plot.classList.remove("analytics-plot-aspect");
    // Full-width cards need more vertical room so series stay readable.
    const preferred = Number(settings.chart_height || 420);
    const width =
      plot.clientWidth ||
      plot.parentElement?.clientWidth ||
      Math.min(window.innerWidth * 0.85, 1400);
    // ~40–48% of width, never shorter than 320px or taller than 520px.
    const byRatio = Math.round(width * 0.42);
    const height = Math.max(320, Math.min(520, Math.max(preferred, byRatio)));
    plot.style.height = `${height}px`;
  }

  function resize() {
    if (chartInstance && rendered && plot.isConnected && !chartInstance.isDisposed?.()) {
      applyPlotSize();
      chartInstance.resize();
    }
    if (expandedInstance && !expandedInstance.isDisposed?.()) {
      expandedInstance.resize();
    }
  }

  async function exportPng() {
    if (!chartInstance || !rendered) {
      return;
    }
    try {
      const url = chartInstance.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chart.chart_id}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      showToast({
        type: "success",
        title: "PNG berhasil dibuat",
        message: "Visualisasi disimpan melalui unduhan browser lokal.",
      });
    } catch (error) {
      showApiError(error, "PNG belum dapat dibuat");
    }
  }

  async function exportData(format) {
    try {
      const fileName = await exportAnalyticsData(
        chart.chart_id,
        format,
        exportFilters(filters),
      );
      showToast({
        type: "success",
        title: "Ekspor data selesai",
        message: `${fileName} siap di folder unduhan browser.`,
      });
    } catch (error) {
      showApiError(error, "Data grafik belum dapat diekspor");
    }
  }

  function openTable(trigger) {
    if (!currentData) {
      return;
    }
    openModal({
      size: "wide",
      eyebrow: "Alternatif tabel",
      title: chart.title,
      description: "Data yang sama dengan grafik dan mengikuti filter aktif.",
      body: createDataTable(currentData.table_rows || []),
      footer: [],
      returnFocus: trigger,
    });
  }

  function openExpanded(trigger) {
    if (!echartsApi) {
      showToast({
        type: "warning",
        title: "Grafik belum siap",
        message: "Modul visualisasi belum termuat. Muat ulang halaman.",
      });
      return;
    }
    if (!currentData) {
      showToast({
        type: "warning",
        title: "Data belum siap",
        message: "Tunggu grafik selesai dimuat, lalu coba perbesar lagi.",
      });
      return;
    }
    const option = createChartOption(chart.chart_id, currentData, settings);
    if (!option || option.empty) {
      showToast({
        type: "warning",
        title: "Tidak ada data",
        message: "Grafik ini belum punya data untuk diperbesar.",
      });
      return;
    }

    const expandedPlot = element("div", {
      className: "analytics-plot-expanded",
      attributes: { role: "img", "aria-label": chart.title },
    });
    const expandedBody = element("div", {
      className: "page-stack analytics-expanded-body",
      children: [
        expandedPlot,
        element("p", {
          className: "chart-text-summary",
          text: textualSummary(chart.chart_id, currentData),
        }),
      ],
    });
    openModal({
      size: "wide",
      eyebrow: "Perbesar grafik",
      title: chart.title,
      description: chart.description,
      body: expandedBody,
      footer: [],
      returnFocus: trigger,
      onClose: () => {
        if (expandedInstance && !expandedInstance.isDisposed?.()) {
          expandedInstance.dispose();
        }
        expandedInstance = null;
      },
    });

    const mountExpanded = () => {
      const height = Math.min(Math.max(window.innerHeight - 240, 360), 640);
      expandedPlot.style.width = "100%";
      expandedPlot.style.height = `${height}px`;
      expandedPlot.style.minHeight = `${height}px`;
      if (!expandedPlot.isConnected || !echartsApi) {
        return;
      }
      if (expandedInstance && !expandedInstance.isDisposed?.()) {
        expandedInstance.dispose();
      }
      expandedInstance = echartsApi.init(expandedPlot, null, {
        renderer: "canvas",
        useDirtyRect: false,
      });
      applyChartOption(expandedInstance, option);
      installClickHandler(expandedInstance);
      expandedInstance.resize();
      window.setTimeout(() => {
        if (expandedInstance && !expandedInstance.isDisposed?.()) {
          expandedInstance.resize();
        }
      }, 80);
    };

    // Wait until the dialog has finished layout so the plot has real size.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(mountExpanded);
    });
  }

  function destroy() {
    activeController?.abort();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", layoutChangeHandler);
    document.removeEventListener("inventory:layout-change", layoutChangeHandler);
    disposeChart();
    if (expandedInstance && !expandedInstance.isDisposed?.()) {
      expandedInstance.dispose();
    }
    expandedInstance = null;
  }

  return {
    element: card,
    load,
    destroy,
    resize,
    filters,
    hasLoaded: () => currentData !== null,
  };
}
