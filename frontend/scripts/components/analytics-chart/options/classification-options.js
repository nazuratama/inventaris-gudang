import { formatNumber } from "../../../utils/formatting.js";
import { escapeHtml, formatCompactCurrency, formatCurrency } from "../presentation.js";
import { PALETTE, axisStyle, axisTitleGrid, seriesPalette, valueAxisName } from "../chart-theme.js";

export function velocityBarOption(categories, series, data, settings, chrome, precision) {
  const ranked = data?.drilldown?.ranked_rows || [];
  const colorMap = {
    Cepat: PALETTE.incoming,
    Sedang: PALETTE.primary,
    Lambat: PALETTE.warning,
    "Tidak bergerak": PALETTE.secondary,
  };
  const values = series[0]?.values || [];
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const row = ranked[item.dataIndex] || {};
        return [
          `<strong>${escapeHtml(item.name)}</strong>`,
          `Klasifikasi: ${escapeHtml(row.classification || "—")}`,
          `Nilai: ${formatNumber(item.value, precision)}`,
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      name: "Skor pergerakan",
      nameLocation: "middle",
      nameGap: 28,
      ...axisStyle(),
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisLabel: { color: PALETTE.axis, fontSize: 11, width: 150, overflow: "truncate" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: series[0]?.name || "Kecepatan",
        type: "bar",
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: colorMap[ranked[index]?.classification] || PALETTE.primary,
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barMaxWidth: 18,
        label: settings.show_data_labels
          ? {
              show: true,
              position: "right",
              formatter: (p) => formatNumber(p.value, precision),
              fontSize: 10,
            }
          : { show: false },
      },
    ],
  };
}

export function stockTreemapOption(categories, series, data, settings, chrome, precision) {
  const values = series[0]?.values || [];
  const rows = data.table_rows || [];
  const colors = seriesPalette(settings);
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) => {
        const row = rows.find((entry) => entry.category === params.name) || {};
        return [
          `<strong>${escapeHtml(params.name)}</strong>`,
          `Stok: ${formatNumber(params.value, precision)}`,
          `Jenis: ${formatNumber(row.item_count || 0)}`,
          `Porsi: ${formatNumber(row.percentage || 0, 1)}%`,
        ].join("<br/>");
      },
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: "{b}\n{c}",
          color: "#fff",
          fontSize: 12,
        },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: { borderWidth: 0, gapWidth: 4 },
          },
          {
            colorSaturation: [0.35, 0.6],
            itemStyle: { borderWidth: 2, gapWidth: 2, borderColorSaturation: 0.6 },
          },
        ],
        data: categories.map((name, index) => ({
          name,
          value: values[index],
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
}

export function topValueItemsOption(categories, series, data, settings, chrome, precision) {
  const rows = data.table_rows || [];
  const values = series[0]?.values || [];
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const row = rows[item.dataIndex] || {};
        return [
          `<strong>${escapeHtml(item.name)}</strong>`,
          `SKU: ${escapeHtml(row.sku || "—")}`,
          `Nilai beli: ${formatCurrency(item.value, data?.summary?.currency)}`,
          `Stok: ${formatNumber(row.current_stock || 0, precision)} ${row.unit || ""}`,
          `Lokasi: ${escapeHtml(row.location || "—")}`,
        ].join("<br/>");
      },
    },
    grid: { ...chrome.grid, left: 12, right: 28 },
    xAxis: {
      type: "value",
      name: "Nilai beli",
      nameLocation: "middle",
      nameGap: 28,
      ...axisStyle(),
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 10,
        formatter: (value) => formatCompactCurrency(value),
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisLabel: { color: PALETTE.axis, fontSize: 11, width: 150, overflow: "truncate" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Nilai beli",
        type: "bar",
        data: values,
        barMaxWidth: 18,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: PALETTE.primary },
              { offset: 1, color: "#3f8f8a" },
            ],
          },
          borderRadius: [0, 6, 6, 0],
        },
        label: settings.show_data_labels
          ? {
              show: true,
              position: "right",
              formatter: (p) => formatCurrency(p.value, data?.summary?.currency),
              fontSize: 10,
              color: PALETTE.axis,
            }
          : { show: false },
      },
    ],
  };
}

export function supplierRoseOption(categories, series, data, settings, chrome, precision) {
  const values = series[0]?.values || [];
  const colors = seriesPalette(settings);
  const legendAtBottom = chrome.__layout?.legendPosition !== "right";
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) => {
        const row = (data.table_rows || []).find((entry) => entry.supplier === params.name) || {};
        return [
          `<strong>${escapeHtml(params.name)}</strong>`,
          `Kuantitas: ${formatNumber(params.value, precision)}`,
          `Batch: ${formatNumber(row.batch_count || 0)}`,
          `Porsi: ${params.percent}%`,
        ].join("<br/>");
      },
    },
    legend: {
      ...chrome.legend,
      type: "scroll",
      orient: legendAtBottom ? "horizontal" : "vertical",
      bottom: legendAtBottom ? 4 : undefined,
      top: legendAtBottom ? undefined : chrome.__layout?.showToolbox ? 34 : 12,
      left: legendAtBottom ? "center" : undefined,
      right: legendAtBottom ? undefined : 6,
      width: legendAtBottom ? "92%" : 112,
      padding: legendAtBottom ? [4, 8, 0, 8] : [0, 0, 0, 0],
    },
    series: [
      {
        name: "Supplier",
        type: "pie",
        roseType: "area",
        radius: legendAtBottom ? ["16%", "58%"] : ["18%", "64%"],
        center: legendAtBottom ? ["50%", "44%"] : ["42%", "52%"],
        itemStyle: {
          borderRadius: 5,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: Boolean(settings.show_data_labels) || categories.length <= 6,
          formatter: "{b}",
          color: PALETTE.axis,
          fontSize: 11,
        },
        labelLine: { length: 10, length2: 6 },
        data: categories.map((name, index) => ({
          name,
          value: values[index],
          itemStyle: { color: colors[index % colors.length] },
        })),
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 12, shadowColor: "rgba(24,36,45,0.18)" },
        },
      },
    ],
  };
}

export function categoryRadarOption(categories, series, data, settings, chrome, precision) {
  const colors = seriesPalette(settings);
  const indicators = categories.map((name) => ({ name, max: 100 }));
  const legendAtBottom = chrome.__layout?.legendPosition !== "right";
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
    },
    legend: {
      ...chrome.legend,
      type: "scroll",
      orient: legendAtBottom ? "horizontal" : "vertical",
      bottom: legendAtBottom ? 4 : undefined,
      top: legendAtBottom ? undefined : chrome.__layout?.showToolbox ? 34 : 12,
      left: legendAtBottom ? "center" : undefined,
      right: legendAtBottom ? undefined : 6,
      width: legendAtBottom ? "90%" : 118,
      padding: legendAtBottom ? [4, 10, 0, 10] : [0, 0, 0, 0],
    },
    radar: {
      indicator: indicators,
      center: legendAtBottom ? ["50%", "46%"] : ["44%", "54%"],
      radius: legendAtBottom ? "54%" : "58%",
      splitNumber: 4,
      axisName: {
        color: PALETTE.axis,
        fontSize: 11,
        overflow: "truncate",
        width: 72,
      },
      splitLine: { lineStyle: { color: PALETTE.grid } },
      splitArea: {
        areaStyle: {
          color: ["rgba(37,107,77,0.03)", "rgba(37,107,77,0.08)"],
        },
      },
      axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    },
    series: [
      {
        type: "radar",
        data: series.map((entry, index) => ({
          name: entry.name,
          value: entry.values,
          areaStyle: { opacity: 0.12 },
          lineStyle: { width: 2 },
          itemStyle: { color: colors[index % colors.length] },
          symbolSize: 5,
        })),
      },
    ],
  };
}

export function riskFunnelOption(categories, series, data, settings, chrome, precision) {
  const values = series[0]?.values || [];
  const colorMap = {
    Normal: PALETTE.normal,
    Menipis: PALETTE.low,
    Kritis: PALETTE.critical,
    "Stok habis": PALETTE.danger,
  };
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) =>
        `<strong>${escapeHtml(params.name)}</strong><br/>Jumlah: ${formatNumber(params.value, precision)}`,
    },
    series: [
      {
        name: "Corong risiko",
        type: "funnel",
        left: "12%",
        top: 24,
        bottom: 24,
        width: "70%",
        min: 0,
        max: Math.max(...values.map(Number), 1),
        minSize: "18%",
        maxSize: "100%",
        sort: "none",
        gap: 4,
        label: {
          show: true,
          position: "inside",
          formatter: "{b}: {c}",
          color: "#fff",
          fontSize: 12,
        },
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 1,
        },
        data: categories.map((name, index) => ({
          name,
          value: values[index],
          itemStyle: { color: colorMap[name] || PALETTE.primary },
        })),
      },
    ],
  };
}

export function abcAnalysisOption(categories, series, data, settings, chrome, precision) {
  const valueSeries = series.find((entry) => entry.name === "Nilai beli") || series[0];
  const countSeries = series.find((entry) => entry.name === "Jumlah barang") || series[1];
  const colorMap = { A: PALETTE.incoming, B: PALETTE.warning, C: PALETTE.secondary };
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const name = categories[index];
        return [
          `<strong>Kelas ${name}</strong>`,
          ...list.map(
            (item) =>
              `${item.marker}${item.seriesName}: ${
                item.seriesName === "Nilai beli"
                  ? formatCurrency(item.value, data?.summary?.currency)
                  : formatNumber(item.value, precision)
              }`,
          ),
        ].join("<br/>");
      },
    },
    grid: axisTitleGrid(chrome, {
      leftTitle: true,
      rightTitle: true,
    }),
    xAxis: {
      type: "category",
      data: categories.map((name) => `Kelas ${name}`),
      axisTick: { show: false },
      axisLabel: { color: PALETTE.axis, margin: 10 },
      axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    },
    yAxis: [
      {
        type: "value",
        ...valueAxisName("Nilai beli", { gap: 40 }),
        ...axisStyle(),
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 11,
          margin: 10,
          formatter: (value) => formatCompactCurrency(value),
        },
      },
      {
        type: "value",
        ...valueAxisName("Jumlah", { opposite: true, gap: 40 }),
        ...axisStyle(),
        splitLine: { show: false },
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 11,
          margin: 10,
        },
      },
    ],
    series: [
      {
        name: "Nilai beli",
        type: "bar",
        data: (valueSeries?.values || []).map((value, index) => ({
          value,
          itemStyle: {
            color: colorMap[categories[index]] || PALETTE.primary,
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barMaxWidth: 48,
      },
      {
        name: "Jumlah barang",
        type: "line",
        yAxisIndex: 1,
        data: countSeries?.values || [],
        smooth: 0.3,
        symbolSize: 8,
        lineStyle: { width: 2.4, color: PALETTE.net },
        itemStyle: { color: PALETTE.net },
      },
    ],
  };
}

