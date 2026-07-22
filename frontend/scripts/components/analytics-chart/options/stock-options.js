import { formatNumber } from "../../../utils/formatting.js";
import { escapeHtml, formatCenterCurrency, formatCompactCurrency, formatCurrency } from "../presentation.js";
import { PALETTE, axisStyle, axisTitleGrid, seriesPalette, valueAxisName } from "../chart-theme.js";

export function compositionDonutOption(chartId, categories, series, data, settings, chrome, precision) {
  const values = series[0]?.values || [];
  const metric = data?.summary?.metric || "quantity";
  const metricLabel = {
    quantity: "Kuantitas stok",
    items: "Jumlah jenis barang",
    percentage: "Persentase",
  }[metric] || "Nilai";
  const entity = chartId === "stock-by-location" ? "Lokasi" : "Kategori";
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  const colors = seriesPalette(settings);
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) =>
        `<strong>${escapeHtml(params.name)}</strong><br/>${metricLabel}: ${formatNumber(params.value, precision)}<br/>Porsi: ${params.percent}%`,
    },
    legend: {
      ...chrome.legend,
      orient: "vertical",
      right: 6,
      top: chrome.__layout?.showToolbox ? 36 : 16,
      bottom: 12,
      type: "scroll",
      width: 118,
    },
    series: [
      {
        name: entity,
        type: "pie",
        radius: ["46%", "70%"],
        center: ["40%", "54%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: Boolean(settings.show_data_labels),
          formatter: "{b}\n{d}%",
          color: PALETTE.axis,
          fontSize: 11,
        },
        labelLine: { length: 12, length2: 8 },
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
    graphic: [
      {
        type: "group",
        left: "40%",
        top: "54%",
        bounding: "raw",
        children: [
          {
            type: "text",
            style: {
              text: formatNumber(total, precision),
              fill: PALETTE.text,
              font: "700 16px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "bottom",
            },
            top: -10,
            left: 0,
          },
          {
            type: "text",
            style: {
              text: entity,
              fill: PALETTE.axis,
              font: "12px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "top",
            },
            top: 8,
            left: 0,
          },
        ],
      },
    ],
  };
}

export function inventoryValueOption(categories, series, data, settings, chrome, precision) {
  const rows = data.table_rows || [];
  const metric = data?.summary?.metric || "all";
  if (metric === "all" && series.length > 1) {
    const colors = seriesPalette(settings);
    const points = rows.map((row, index) => {
      const margin = Number(row.gross_margin || 0);
      return {
        name: row.category,
        value: [
          Number(row.purchase_value || 0),
          Number(row.selling_value || 0),
          Math.abs(margin),
          Number(row.item_count || 0),
          margin,
        ],
        itemStyle: {
          color: margin >= 0 ? colors[index % colors.length] : PALETTE.danger,
          opacity: 0.88,
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      };
    });
    const maxPurchase = Math.max(...points.map((p) => p.value[0]), 1);
    return {
      ...chrome,
      tooltip: {
        ...chrome.tooltip,
        trigger: "item",
        formatter: (params) => {
          const [purchase, selling, , items, margin] = params.value || [];
          return [
            `<strong>${escapeHtml(params.name)}</strong>`,
            `Jenis barang: ${formatNumber(items)}`,
            `Nilai beli: ${formatCurrency(purchase, data?.summary?.currency)}`,
            `Nilai jual: ${formatCurrency(selling, data?.summary?.currency)}`,
            `Margin: ${formatCurrency(margin, data?.summary?.currency)}`,
          ].join("<br/>");
        },
      },
      grid: axisTitleGrid(chrome, {
        leftTitle: true,
        bottomTitle: true,
        leftMin: 70,
        rightMin: 36,
      }),
      xAxis: {
        type: "value",
        name: "Nilai beli (Rp)",
        nameLocation: "middle",
        nameGap: 38,
        nameTextStyle: {
          color: PALETTE.axis,
          fontSize: 11,
          fontWeight: 600,
        },
        ...axisStyle(),
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 10,
          hideOverlap: true,
          margin: 10,
          formatter: (value) => formatCompactCurrency(value),
        },
        splitNumber: 4,
      },
      yAxis: {
        type: "value",
        name: "Estimasi nilai jual (Rp)",
        nameLocation: "middle",
        nameGap: 42,
        nameTextStyle: {
          color: PALETTE.axis,
          fontSize: 11,
          fontWeight: 600,
        },
        ...axisStyle(),
        axisLabel: {
          color: PALETTE.axis,
          fontSize: 10,
          hideOverlap: true,
          margin: 10,
          formatter: (value) => formatCompactCurrency(value),
        },
        splitNumber: 4,
      },
      series: [
        {
          name: "Kategori",
          type: "scatter",
          data: points,
          symbolSize: (value) => Math.max(12, Math.min(42, 12 + value[2] / 200000)),
          label: settings.show_data_labels
            ? { show: true, formatter: "{b}", position: "top", fontSize: 10 }
            : { show: false },
          emphasis: {
            scale: true,
            itemStyle: { shadowBlur: 14, shadowColor: "rgba(24,36,45,0.2)" },
          },
        },
        {
          name: "Setara beli = jual",
          type: "line",
          data: [
            [0, 0],
            [maxPurchase, maxPurchase],
          ],
          showSymbol: false,
          lineStyle: { type: "dashed", color: PALETTE.secondary, width: 1.2 },
          tooltip: { show: false },
        },
      ],
    };
  }

  const values = series[0]?.values || [];
  const label = series[0]?.name || "Nilai";
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  const colors = seriesPalette(settings);
  // Legend under the pie so long category names never cover the chart.
  const legendAtBottom = chrome.__layout?.legendPosition !== "right";
  const pieCenter = legendAtBottom ? ["50%", "42%"] : ["44%", "52%"];
  // Wide donut hole so center total never collides with the ring.
  const pieRadius = legendAtBottom ? ["52%", "68%"] : ["50%", "70%"];
  const centerTotal = formatCenterCurrency(total, data?.summary?.currency);
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) =>
        `<strong>${escapeHtml(params.name)}</strong><br/>${escapeHtml(label)}: ${formatCurrency(params.value, data?.summary?.currency)}<br/>Porsi: ${params.percent}%`,
    },
    legend: {
      ...chrome.legend,
      show: chrome.legend?.show !== false,
      type: "scroll",
      orient: legendAtBottom ? "horizontal" : "vertical",
      bottom: legendAtBottom ? 4 : undefined,
      top: legendAtBottom ? undefined : chrome.__layout?.showToolbox ? 36 : 16,
      left: legendAtBottom ? "center" : undefined,
      right: legendAtBottom ? undefined : 6,
      width: legendAtBottom ? "92%" : 120,
      padding: legendAtBottom ? [4, 8, 0, 8] : [0, 0, 0, 0],
    },
    series: [
      {
        name: label,
        type: "pie",
        radius: pieRadius,
        center: pieCenter,
        minShowLabelAngle: 8,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        // Labels only when explicitly enabled — keeps ring clear of long names/values.
        label: {
          show: Boolean(settings.show_data_labels),
          formatter: "{d}%",
          color: PALETTE.axis,
          fontSize: 10,
        },
        labelLine: { length: 8, length2: 4 },
        data: categories.map((name, index) => ({
          name,
          value: values[index],
          itemStyle: { color: colors[index % colors.length] },
        })),
        emphasis: {
          scale: true,
          scaleSize: 4,
          label: {
            show: true,
            formatter: (params) => `${params.name}\n${params.percent}%`,
            fontSize: 11,
          },
        },
      },
    ],
    graphic: [
      {
        type: "group",
        left: pieCenter[0],
        top: pieCenter[1],
        bounding: "raw",
        children: [
          {
            type: "text",
            style: {
              text: "Total",
              fill: PALETTE.axis,
              font: "11px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "bottom",
            },
            top: -12,
            left: 0,
          },
          {
            type: "text",
            style: {
              // Compact form (Rp 21jt) — full amount remains in tooltip/summary.
              text: centerTotal,
              fill: PALETTE.text,
              font: "700 14px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "top",
            },
            top: -2,
            left: 0,
          },
        ],
      },
    ],
  };
}

export function stockRiskDonutOption(series, data, settings, chrome, precision) {
  const labels = series.map((entry) => entry.name);
  const values = series.map((entry) =>
    (entry.values || []).reduce((sum, value) => sum + Number(value || 0), 0),
  );
  const colorMap = {
    "Stok habis": PALETTE.danger,
    Kritis: PALETTE.critical,
    Menipis: PALETTE.low,
    Normal: PALETTE.normal,
  };
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item",
      formatter: (params) =>
        `<strong>${escapeHtml(params.name)}</strong><br/>Jumlah: ${formatNumber(params.value, precision)}<br/>Porsi: ${params.percent}%`,
    },
    legend: {
      ...chrome.legend,
      orient: "vertical",
      right: 6,
      top: chrome.__layout?.showToolbox ? 36 : 16,
      bottom: 12,
      width: 118,
    },
    series: [
      {
        name: "Status risiko",
        type: "pie",
        radius: ["46%", "70%"],
        center: ["40%", "54%"],
        itemStyle: {
          borderRadius: 6,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: Boolean(settings.show_data_labels),
          formatter: "{b}: {c}",
          color: PALETTE.axis,
        },
        data: labels.map((name, index) => ({
          name,
          value: values[index],
          itemStyle: { color: colorMap[name] || PALETTE.primary },
        })),
        emphasis: { scale: true, scaleSize: 6 },
      },
    ],
    graphic: [
      {
        type: "group",
        left: "40%",
        top: "54%",
        children: [
          {
            type: "text",
            style: {
              text: formatNumber(data?.summary?.at_risk || 0, precision),
              fill: PALETTE.text,
              font: "700 16px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "bottom",
            },
            top: -12,
          },
          {
            type: "text",
            style: {
              text: `berisiko / ${formatNumber(total, precision)}`,
              fill: PALETTE.axis,
              font: "11px Inter, Segoe UI, sans-serif",
              align: "center",
              verticalAlign: "top",
            },
            top: 6,
          },
        ],
      },
    ],
  };
}

export function expirationBarOption(categories, series, data, settings, chrome, precision) {
  const values = series[0]?.values || [];
  const isMoney = data?.summary?.metric === "value";
  const metricKey = data?.summary?.metric || series[0]?.name || "quantity";
  const seriesLabel =
    {
      batches: "Jumlah batch",
      quantity: "Kuantitas",
      value: "Nilai persediaan",
      batches_count: "Jumlah batch",
    }[metricKey] ||
    (metricKey === "batches"
      ? "Jumlah batch"
      : metricKey === "value"
        ? "Nilai persediaan"
        : metricKey === "quantity"
          ? "Kuantitas"
          : String(series[0]?.name || "Nilai"));
  const yName = isMoney ? "Nilai (Rp)" : seriesLabel;
  const colors = categories.map((category, categoryIndex) => {
    if (category === "Sudah kedaluwarsa") {
      return PALETTE.danger;
    }
    if (categoryIndex === 0 || category.includes("0–")) {
      return PALETTE.critical;
    }
    if (category.includes("Tanpa")) {
      return PALETTE.secondary;
    }
    return [PALETTE.low, PALETTE.warning, PALETTE.normal, PALETTE.incoming][
      Math.min(categoryIndex, 3)
    ];
  });
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) =>
        isMoney ? formatCurrency(value, data?.summary?.currency) : formatNumber(value, precision),
    },
    legend: {
      ...chrome.legend,
      data: [seriesLabel],
    },
    grid: axisTitleGrid(chrome, {
      leftTitle: true,
      bottomTitle: categories.length > 4,
      leftMin: isMoney ? 72 : 68,
      rightMin: 28,
    }),
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 11,
        interval: 0,
        rotate: categories.length > 4 ? 18 : 0,
        hideOverlap: true,
        margin: 10,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    },
    yAxis: {
      type: "value",
      ...valueAxisName(yName, { gap: 40 }),
      ...axisStyle(),
      axisLabel: {
        color: PALETTE.axis,
        fontSize: 10,
        margin: 10,
        hideOverlap: true,
        formatter: (value) =>
          isMoney ? formatCompactCurrency(value) : formatNumber(value, precision),
      },
    },
    series: [
      {
        name: seriesLabel,
        type: "bar",
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: colors[index],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barMaxWidth: 42,
        label: settings.show_data_labels
          ? {
              show: true,
              position: "top",
              formatter: (p) =>
                isMoney
                  ? formatCurrency(p.value, data?.summary?.currency)
                  : formatNumber(p.value, precision),
              fontSize: 10,
              color: PALETTE.axis,
            }
          : { show: false },
      },
    ],
  };
}

export function stockVsMinimumOption(categories, series, data, settings, chrome, precision) {
  const current = series.find((entry) => entry.name === "Stok saat ini") || series[0];
  const minimum = series.find((entry) => entry.name === "Stok minimum") || series[1];
  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const row = (data.table_rows || [])[index] || {};
        return [
          `<strong>${escapeHtml(categories[index])}</strong>`,
          ...list.map(
            (item) =>
              `${item.marker}${item.seriesName}: ${formatNumber(item.value, precision)}`,
          ),
          `Selisih: ${formatNumber(row.gap || 0, precision)}`,
        ].join("<br/>");
      },
    },
    grid: {
      ...chrome.grid,
      left: 12,
      right: 24,
      top: Math.max(chrome.grid.top || 52, 54),
    },
    xAxis: {
      type: "value",
      ...axisStyle(),
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisLabel: { color: PALETTE.axis, fontSize: 11, width: 140, overflow: "truncate" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Stok saat ini",
        type: "bar",
        data: (current?.values || []).map((value, index) => {
          const gap = Number((data.table_rows || [])[index]?.gap ?? 0);
          return {
            value,
            itemStyle: {
              color: gap < 0 ? PALETTE.danger : gap === 0 ? PALETTE.warning : PALETTE.incoming,
              borderRadius: [0, 5, 5, 0],
            },
          };
        }),
        barMaxWidth: 14,
      },
      {
        name: "Stok minimum",
        type: "bar",
        data: minimum?.values || [],
        barMaxWidth: 14,
        itemStyle: {
          color: "rgba(110,135,146,0.45)",
          borderRadius: [0, 5, 5, 0],
        },
      },
    ],
  };
}

export function stockHealthGaugeOption(categories, series, data, settings, chrome, precision) {
  const score = Number(series[0]?.values?.[0] ?? data?.summary?.score ?? 0);
  return {
    ...chrome,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "88%",
        center: ["50%", "58%"],
        progress: {
          show: true,
          width: 16,
          roundCap: true,
          itemStyle: {
            color:
              score >= 75
                ? PALETTE.incoming
                : score >= 50
                  ? PALETTE.warning
                  : PALETTE.danger,
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [
              [0.5, "rgba(179,74,69,0.18)"],
              [0.75, "rgba(180,131,38,0.2)"],
              [1, "rgba(38,117,83,0.18)"],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          length: "58%",
          width: 5,
          itemStyle: { color: PALETTE.primary },
        },
        anchor: {
          show: true,
          size: 10,
          itemStyle: { color: PALETTE.primary },
        },
        detail: {
          valueAnimation: Boolean(settings.animations_enabled) && !settings.reduced_motion,
          formatter: (value) => `${formatNumber(value, 1)}`,
          color: PALETTE.text,
          fontSize: 28,
          fontWeight: 700,
          offsetCenter: [0, "28%"],
        },
        title: {
          show: true,
          offsetCenter: [0, "48%"],
          color: PALETTE.axis,
          fontSize: 13,
        },
        data: [{ value: score, name: "Indeks kesehatan stok" }],
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: 18,
        style: {
          text: `${formatNumber(data?.summary?.at_risk || 0)} berisiko dari ${formatNumber(data?.summary?.total_items || 0)} barang`,
          fill: PALETTE.axis,
          font: "12px Inter, Segoe UI, sans-serif",
          align: "center",
        },
      },
    ],
  };
}

