import { formatDate, formatNumber } from "../../../utils/formatting.js";
import { escapeHtml } from "../presentation.js";
import { PALETTE, axisStyle, axisTitleGrid, valueAxisName } from "../chart-theme.js";

export function rankingBarOption(categories, series, data, settings, chrome, precision) {
  const rows = data.table_rows || [];
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const row = rows[index] || {};
        const unit = settings.show_units && row.unit ? ` ${row.unit}` : "";
        const lines = list.map(
          (item) =>
            `${item.marker}${item.seriesName}: ${formatNumber(item.value, precision)}${unit}`,
        );
        return [
          `<strong>${escapeHtml(categories[index] || "")}</strong>`,
          `Kategori: ${escapeHtml(row.category || "—")}`,
          `Lokasi: ${escapeHtml(row.location || "—")}`,
          ...lines,
          `Stok: ${formatNumber(row.current_stock || 0, precision)}${unit}`,
        ].join("<br/>");
      },
    },
    grid: { ...chrome.grid, left: 12, right: 24 },
    xAxis: {
      type: "value",
      name: "Kuantitas pergerakan",
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
    series: series.map((entry) => ({
      name: entry.name,
      type: "bar",
      data: entry.values,
      barMaxWidth: 18,
      itemStyle: {
        color: entry.name === "Barang masuk" ? PALETTE.incoming : PALETTE.outgoing,
        borderRadius: [0, 6, 6, 0],
      },
      emphasis: { focus: "series" },
      label: settings.show_data_labels
        ? {
            show: true,
            position: "right",
            formatter: (p) => formatNumber(p.value, precision),
            color: PALETTE.axis,
            fontSize: 10,
          }
        : { show: false },
    })),
  };
}

export function trendLineOption(categories, series, settings, chrome, precision) {
  const labels = categories.map((value) => formatDate(value, value));
  const colorMap = {
    "Barang masuk": PALETTE.incoming,
    "Barang keluar": PALETTE.outgoing,
    "Pergerakan bersih": PALETTE.net,
  };
  const legendAtBottom = chrome.__layout?.legendPosition === "bottom";
  const sliderBottom = legendAtBottom ? 40 : 12;
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: PALETTE.primary } },
      valueFormatter: (value) => formatNumber(value, precision),
    },
    grid: axisTitleGrid(chrome, {
      leftTitle: true,
      dataZoom: true,
      bottomTitle: false,
      leftMin: 66,
      rightMin: 30,
    }),
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      ...axisStyle(),
      splitLine: { show: false },
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        hideOverlap: true,
        margin: 10,
      },
    },
    yAxis: {
      type: "value",
      ...valueAxisName("Kuantitas", { gap: 38 }),
      ...axisStyle(),
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        margin: 10,
        hideOverlap: true,
      },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      {
        type: "slider",
        height: 16,
        bottom: sliderBottom,
        borderColor: PALETTE.grid,
        fillerColor: "rgba(37,107,77,0.12)",
        handleStyle: { color: PALETTE.primary },
      },
    ],
    series: series.map((entry) => {
      const color = colorMap[entry.name] || PALETTE.primary;
      const isNet = entry.name === "Pergerakan bersih";
      return {
        name: entry.name,
        type: "line",
        data: entry.values,
        smooth: 0.35,
        showSymbol: settings.show_data_labels || categories.length <= 24,
        symbolSize: isNet ? 7 : 6,
        lineStyle: {
          width: isNet ? 2.6 : 2.4,
          color,
          type: isNet ? "dashed" : "solid",
        },
        itemStyle: { color },
        areaStyle: isNet
          ? undefined
          : {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: color + "55" },
                  { offset: 1, color: color + "05" },
                ],
              },
            },
        emphasis: { focus: "series" },
        label: settings.show_data_labels
          ? {
              show: true,
              position: "top",
              formatter: (p) => formatNumber(p.value, precision),
              fontSize: 10,
            }
          : { show: false },
      };
    }),
  };
}

export function movementByCategoryOption(categories, series, data, settings, chrome, precision) {
  const colorMap = {
    "Barang masuk": PALETTE.incoming,
    "Barang keluar": PALETTE.outgoing,
  };
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => formatNumber(value, precision),
    },
    grid: axisTitleGrid(chrome, { leftTitle: true, bottomTitle: categories.length > 5 }),
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        interval: 0,
        rotate: categories.length > 5 ? 22 : 0,
        width: 90,
        overflow: "truncate",
        hideOverlap: true,
        margin: 10,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    },
    yAxis: {
      type: "value",
      ...valueAxisName("Kuantitas", { gap: 40 }),
      ...axisStyle(),
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        margin: 10,
        hideOverlap: true,
      },
    },
    series: series.map((entry) => ({
      name: entry.name,
      type: "bar",
      data: entry.values,
      barMaxWidth: 22,
      barGap: "12%",
      itemStyle: {
        color: colorMap[entry.name] || PALETTE.primary,
        borderRadius: [5, 5, 0, 0],
      },
      emphasis: { focus: "series" },
      label: settings.show_data_labels
        ? {
            show: true,
            position: "top",
            formatter: (p) => formatNumber(p.value, precision),
            fontSize: 10,
          }
        : { show: false },
    })),
  };
}

export function movementHeatmapOption(categories, series, data, settings, chrome, precision) {
  const inSeries = series.find((entry) => entry.name === "Transaksi masuk") || series[0];
  const outSeries = series.find((entry) => entry.name === "Transaksi keluar") || series[1];
  const yLabels = ["Masuk", "Keluar"];
  const points = [];
  categories.forEach((day, x) => {
    points.push([x, 0, Number(inSeries?.values?.[x] || 0)]);
    points.push([x, 1, Number(outSeries?.values?.[x] || 0)]);
  });
  const maxValue = Math.max(...points.map((point) => point[2]), 1);
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      position: "top",
      formatter: (params) => {
        const [x, y, value] = params.value || [];
        const qtySeries =
          y === 0
            ? series.find((entry) => entry.name === "Kuantitas masuk")
            : series.find((entry) => entry.name === "Kuantitas keluar");
        const qty = qtySeries?.values?.[x] ?? 0;
        return [
          `<strong>${escapeHtml(categories[x] || "")} · ${yLabels[y] || ""}</strong>`,
          `Transaksi: ${formatNumber(value, precision)}`,
          `Kuantitas: ${formatNumber(qty, precision)}`,
        ].join("<br/>");
      },
    },
    grid: { ...chrome.grid, left: 64, right: 48, top: 28, bottom: 48 },
    xAxis: {
      type: "category",
      data: categories,
      splitArea: { show: true },
      axisLabel: { color: PALETTE.axis },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: yLabels,
      splitArea: { show: true },
      axisLabel: { color: PALETTE.axis },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "vertical",
      right: 4,
      top: "middle",
      inRange: {
        color: ["#f3f7f9", "#9ec5d4", PALETTE.primary, "#143d4d"],
      },
      textStyle: { color: PALETTE.axis, fontSize: 10 },
    },
    series: [
      {
        name: "Aktivitas",
        type: "heatmap",
        data: points,
        label: {
          show: true,
          formatter: (p) => formatNumber(p.value[2], precision),
          color: PALETTE.text,
          fontSize: 11,
        },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(24,36,45,0.25)" },
        },
      },
    ],
  };
}

export function outgoingParetoOption(categories, series, data, settings, chrome, precision) {
  const qty = series.find((entry) => entry.name === "Barang keluar") || series[0];
  const cum = series.find((entry) => entry.name === "Kumulatif %") || series[1];
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const row = (data.table_rows || [])[index] || {};
        return [
          `<strong>${escapeHtml(categories[index])}</strong>`,
          `Keluar: ${formatNumber(row.outgoing || 0, precision)}`,
          `Porsi: ${formatNumber(row.share_percentage || 0, 1)}%`,
          `Kumulatif: ${formatNumber(row.cumulative_percentage || 0, 1)}%`,
        ].join("<br/>");
      },
    },
    grid: {
      ...axisTitleGrid(chrome, {
        leftTitle: true,
        rightTitle: true,
        bottomTitle: categories.length > 6,
      }),
      bottom: categories.length > 6 ? 72 : Math.max(Number(chrome.grid.bottom || 28), 40),
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 10,
        interval: 0,
        rotate: categories.length > 6 ? 28 : 0,
        width: 80,
        overflow: "truncate",
        hideOverlap: true,
        margin: 10,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    },
    yAxis: [
      {
        type: "value",
        ...valueAxisName("Kuantitas", { gap: 40 }),
        ...axisStyle(),
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 11,
          margin: 10,
          hideOverlap: true,
        },
      },
      {
        type: "value",
        ...valueAxisName("Kumulatif %", { opposite: true, gap: 40 }),
        min: 0,
        max: 100,
        ...axisStyle(),
        splitLine: { show: false },
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 11,
          margin: 10,
          formatter: "{value}%",
        },
      },
    ],
    series: [
      {
        name: "Barang keluar",
        type: "bar",
        data: qty?.values || [],
        barMaxWidth: 28,
        itemStyle: {
          color: PALETTE.outgoing,
          borderRadius: [5, 5, 0, 0],
        },
      },
      {
        name: "Kumulatif %",
        type: "line",
        yAxisIndex: 1,
        data: cum?.values || [],
        smooth: 0.25,
        symbolSize: 7,
        lineStyle: { width: 2.6, color: PALETTE.primary },
        itemStyle: { color: PALETTE.primary },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: PALETTE.secondary },
          data: [{ yAxis: 80 }],
          label: { formatter: "80%", color: PALETTE.axis, position: "insideEndTop" },
        },
      },
    ],
  };
}

export function monthlyNetFlowOption(categories, series, data, settings, chrome, precision) {
  const colorMap = {
    "Barang masuk": PALETTE.incoming,
    "Barang keluar": PALETTE.outgoing,
    "Bersih kumulatif": PALETTE.net,
  };
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "cross" },
      valueFormatter: (value) => formatNumber(value, precision),
    },
    grid: axisTitleGrid(chrome, { leftTitle: true }),
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: true,
      ...axisStyle(),
      splitLine: { show: false },
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        margin: 10,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      ...valueAxisName("Kuantitas", { gap: 40 }),
      ...axisStyle(),
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        margin: 10,
        hideOverlap: true,
      },
    },
    series: series.map((entry) => {
      const isCumulative = entry.name === "Bersih kumulatif";
      const color = colorMap[entry.name] || PALETTE.primary;
      if (isCumulative) {
        return {
          name: entry.name,
          type: "line",
          data: entry.values,
          smooth: 0.3,
          symbolSize: 7,
          lineStyle: { width: 2.8, color },
          itemStyle: { color },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: color + "40" },
                { offset: 1, color: color + "05" },
              ],
            },
          },
        };
      }
      return {
        name: entry.name,
        type: "bar",
        stack: "flow",
        data: entry.values.map((value) =>
          entry.name === "Barang keluar" ? -Math.abs(Number(value || 0)) : value,
        ),
        barMaxWidth: 28,
        itemStyle: {
          color,
          borderRadius: entry.name === "Barang keluar" ? [0, 0, 4, 4] : [4, 4, 0, 0],
        },
      };
    }),
  };
}
