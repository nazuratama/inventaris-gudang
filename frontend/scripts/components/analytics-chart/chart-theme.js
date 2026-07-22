export const PALETTE = {
  primary: "#256b4d",
  incoming: "#267553",
  incomingSoft: "rgba(38, 117, 83, 0.16)",
  outgoing: "#b2672d",
  outgoingSoft: "rgba(178, 103, 45, 0.16)",
  net: "#416f91",
  secondary: "#72827a",
  warning: "#b48326",
  danger: "#b34a45",
  critical: "#c7623f",
  low: "#d39a35",
  normal: "#6d9477",
  grid: "#e2e8e2",
  axis: "#647269",
  text: "#18241f",
  surface: "#ffffff",
  hoverBorder: "#c6d0c8",
  series: [
    "#256b4d",
    "#c69a45",
    "#416f91",
    "#b2672d",
    "#6d9477",
    "#72827a",
    "#b34a45",
    "#826ba6",
    "#3f8580",
    "#8a7653",
  ],
  colorblind: [
    "#0072B2",
    "#E69F00",
    "#009E73",
    "#CC79A7",
    "#D55E00",
    "#56B4E9",
    "#F0E442",
    "#332288",
  ],
};

export function seriesPalette(settings) {
  return settings.palette === "colorblind" ? PALETTE.colorblind : PALETTE.series;
}

function animationEnabled(settings) {
  return Boolean(
    settings.animations_enabled &&
      !settings.reduced_motion &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

/**
 * Shared chrome with collision-safe legend / toolbox / grid spacing.
 * options:
 *  - layout: "cartesian" | "polar" | "pie" | "radar" | "funnel" | "gauge"
 *  - dualYAxis: reserve right margin for second value axis
 *  - dataZoomSlider: extra bottom room for slider
 *  - legendItems: approximate legend entry count (helps polar/pie scroll)
 *  - forceLegend: "top" | "bottom" | "right" | "hidden" (override settings)
 */
function baseChartChrome(settings, options = {}) {
  const layout = options.layout || "cartesian";
  const dualYAxis = Boolean(options.dualYAxis);
  const dataZoomSlider = Boolean(options.dataZoomSlider);
  const legendItems = Number(options.legendItems || 0);
  const position =
    options.forceLegend ||
    (settings.legend_position === "hidden" ? "hidden" : settings.legend_position || "top");
  const showLegend = position !== "hidden";
  const showToolbox = Boolean(settings.modebar_visible);

  // Polar/pie with many names → bottom scroll legend (never under toolbox).
  const polarHeavy = (layout === "pie" || layout === "radar") && legendItems > 5;
  const effectivePosition =
    showLegend && polarHeavy && position === "top" ? "bottom" : position;

  const legendBase = {
    show: showLegend,
    type: "scroll",
    textStyle: { color: PALETTE.text, fontSize: 11 },
    itemWidth: 12,
    itemHeight: 8,
    itemGap: 12,
    pageIconSize: 10,
    pageTextStyle: { color: PALETTE.axis, fontSize: 10 },
    formatter: (name) => {
      const text = String(name || "");
      return text.length > 22 ? `${text.slice(0, 20)}…` : text;
    },
  };

  let legend;
  if (!showLegend) {
    legend = { show: false };
  } else if (effectivePosition === "right") {
    legend = {
      ...legendBase,
      orient: "vertical",
      right: 6,
      top: showToolbox ? 34 : 12,
      bottom: 12,
      width: 108,
      align: "left",
    };
  } else if (effectivePosition === "bottom") {
    legend = {
      ...legendBase,
      orient: "horizontal",
      bottom: 4,
      left: "center",
      width: "92%",
      padding: [2, 8, 0, 8],
    };
  } else {
    // top — centered, padded so toolbox (right) and y-axis titles never collide
    legend = {
      ...legendBase,
      orient: "horizontal",
      top: 6,
      left: "center",
      width: showToolbox ? "62%" : "88%",
      padding: [0, showToolbox ? 52 : 8, 0, 12],
    };
  }

  // Toolbox top-right. dataZoom only for cartesian; pie/radar/etc. use card "Perbesar".
  const zoomMode = options.zoomMode || null; // "x" | "y" | "xy" | null
  const toolbox = showToolbox
    ? {
        right: 6,
        top: 4,
        itemSize: 13,
        itemGap: 8,
        feature: {
          ...(zoomMode
            ? {
                dataZoom: {
                  ...toolboxDataZoomAxes(zoomMode),
                  title: { zoom: "Perbesar", back: "Kembali" },
                  brushStyle: {
                    borderWidth: 1,
                    color: "rgba(37, 107, 77, 0.12)",
                    borderColor: "rgba(37, 107, 77, 0.55)",
                  },
                },
              }
            : {}),
          restore: { title: "Reset" },
        },
        iconStyle: { borderColor: PALETTE.secondary },
        emphasis: { iconStyle: { borderColor: PALETTE.primary } },
      }
    : undefined;

  // Cartesian plot margins
  let gridTop = showToolbox || (showLegend && effectivePosition === "top") ? 52 : 28;
  if (showLegend && effectivePosition === "top") {
    gridTop = showToolbox ? 56 : 48;
  } else if (showToolbox) {
    gridTop = 40;
  }

  let gridBottom = 28;
  if (showLegend && effectivePosition === "bottom") {
    gridBottom = legendItems > 8 ? 56 : 44;
  }
  if (dataZoomSlider) {
    gridBottom += showLegend && effectivePosition === "bottom" ? 28 : 36;
  }

  let gridLeft = 18;
  let gridRight = dualYAxis ? 52 : 20;
  if (showLegend && effectivePosition === "right") {
    gridRight = Math.max(gridRight, dualYAxis ? 150 : 128);
  }

  // Non-cartesian charts still inherit legend/toolbox; grid mostly unused.
  if (layout === "pie" || layout === "radar") {
    if (showLegend && effectivePosition === "bottom") {
      gridBottom = legendItems > 8 ? 58 : 48;
    }
  }

  return {
    color: seriesPalette(settings),
    animation: animationEnabled(settings),
    animationDuration: 320,
    textStyle: {
      fontFamily: 'Inter, "Segoe UI", system-ui, Arial, sans-serif',
      color: PALETTE.axis,
      fontSize: 12,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: PALETTE.surface,
      borderColor: PALETTE.hoverBorder || "#c6d0c8",
      borderWidth: 1,
      textStyle: { color: PALETTE.text, fontSize: 12 },
      extraCssText: "box-shadow:0 8px 24px rgba(24,36,45,0.12);border-radius:8px;",
    },
    legend,
    grid: {
      left: gridLeft,
      right: gridRight,
      top: gridTop,
      bottom: gridBottom,
      containLabel: true,
    },
    toolbox,
    // Expose resolved placement for chart-specific fine-tuning.
    __layout: {
      legendPosition: effectivePosition,
      showLegend,
      showToolbox,
      zoomMode,
      gridTop,
      gridBottom,
      gridLeft,
      gridRight,
    },
  };
}

/** Axis targets for toolbox area-zoom (false disables that axis). */
function toolboxDataZoomAxes(zoomMode) {
  if (zoomMode === "y") {
    // Horizontal bar charts: category on Y.
    return { xAxisIndex: false, yAxisIndex: 0, filterMode: "filter" };
  }
  if (zoomMode === "xy") {
    return { xAxisIndex: 0, yAxisIndex: 0, filterMode: "filter" };
  }
  // Default vertical category / time on X.
  return { xAxisIndex: 0, yAxisIndex: false, filterMode: "filter" };
}

/**
 * Ensure inside+toolbox zoom works on cartesian charts.
 * Must pair with matching toolbox.feature.dataZoom axis indices.
 */
export function withCartesianZoom(option, zoomMode = "x") {
  if (!option || option.empty || !zoomMode) {
    return option;
  }
  const existing = Array.isArray(option.dataZoom) ? [...option.dataZoom] : [];
  const hasInsideY = existing.some((z) => z && z.type === "inside" && z.yAxisIndex === 0);
  const hasInsideX = existing.some(
    (z) => z && z.type === "inside" && (z.xAxisIndex === 0 || z.xAxisIndex == null) && z.yAxisIndex == null,
  );

  const additions = [];
  if ((zoomMode === "x" || zoomMode === "xy") && !hasInsideX) {
    additions.push({
      type: "inside",
      xAxisIndex: 0,
      filterMode: "filter",
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      preventDefaultMouseMove: true,
    });
  }
  if ((zoomMode === "y" || zoomMode === "xy") && !hasInsideY) {
    additions.push({
      type: "inside",
      yAxisIndex: 0,
      filterMode: "filter",
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      preventDefaultMouseMove: true,
    });
  }

  // Keep any existing slider/inside; append missing inside zoom helpers.
  const dataZoom = [...existing, ...additions];

  let toolbox = option.toolbox;
  if (toolbox?.feature) {
    toolbox = {
      ...toolbox,
      feature: {
        ...toolbox.feature,
        dataZoom: {
          ...(toolbox.feature.dataZoom || {}),
          ...toolboxDataZoomAxes(zoomMode),
          title: {
            zoom: "Perbesar",
            back: "Kembali",
            ...(toolbox.feature.dataZoom?.title || {}),
          },
        },
        restore: toolbox.feature.restore || { title: "Reset" },
      },
    };
  }

  return {
    ...option,
    toolbox,
    dataZoom: dataZoom.length ? dataZoom : undefined,
  };
}

export function axisStyle() {
  return {
    axisLine: { lineStyle: { color: PALETTE.hoverBorder } },
    axisTick: { show: false },
    axisLabel: { color: PALETTE.axis, fontSize: 11 },
    splitLine: { lineStyle: { color: PALETTE.grid, type: "dashed" } },
  };
}

/** Axis title (value axis). Gap is space between title and tick labels. */
export function valueAxisName(name, { opposite = false, gap = 42 } = {}) {
  return {
    name: name || "",
    nameLocation: "middle",
    nameGap: gap,
    nameTextStyle: {
      color: PALETTE.axis,
      fontSize: 11,
      fontWeight: 600,
      // Keep title fully painted; never clip mid-glyph.
      overflow: "none",
      width: 120,
    },
  };
}

/**
 * Grid margins that reserve outer room for axis titles.
 * containLabel expands further for tick labels; left/right/bottom must still
 * leave space for the rotated/middle axis names or they disappear.
 */
export function axisTitleGrid(chrome, options = {}) {
  const leftTitle = options.leftTitle !== false;
  const rightTitle = Boolean(options.rightTitle);
  const bottomTitle = Boolean(options.bottomTitle);
  const dataZoom = Boolean(options.dataZoom);
  // Slightly tighter left than before so the plot sits more centered,
  // while still leaving room for the rotated axis title.
  const leftMin = Number(options.leftMin || 68);
  const rightMin = Number(options.rightMin || (rightTitle ? 68 : 28));
  let bottom = Number(chrome?.grid?.bottom || 28);
  if (bottomTitle) {
    bottom = Math.max(bottom, 64);
  }
  if (dataZoom) {
    bottom = Math.max(bottom, bottomTitle ? 86 : 58);
  }
  return {
    ...chrome.grid,
    left: leftTitle
      ? Math.max(Number(chrome?.grid?.left || 0), leftMin)
      : Math.max(Number(chrome?.grid?.left || 0), 20),
    right: rightTitle
      ? Math.max(Number(chrome?.grid?.right || 0), rightMin)
      : Math.max(Number(chrome?.grid?.right || 0), rightMin > 28 ? 28 : rightMin),
    top: Math.max(Number(chrome?.grid?.top || 0), 56),
    bottom,
    containLabel: true,
  };
}

/** Which axis toolbox "Perbesar" should zoom for this chart. */
export function zoomModeForChart(chartId, data) {
  // Horizontal bars (category on Y).
  if (
    [
      "stock-movement-ranking",
      "inventory-movement-velocity",
      "top-value-items",
      "stock-vs-minimum",
    ].includes(chartId)
  ) {
    return "y";
  }
  // Non-cartesian — toolbox area-zoom is not supported.
  if (
    [
      "stock-by-category",
      "stock-by-location",
      "stock-risk",
      "category-radar",
      "risk-funnel",
      "stock-health-gauge",
      "stock-treemap",
    ].includes(chartId)
  ) {
    return null;
  }
  if (chartId === "inventory-value-by-category") {
    const metric = data?.summary?.metric || "all";
    return metric === "all" ? "x" : null;
  }
  // Heatmap benefits from both axes.
  if (chartId === "movement-heatmap") {
    return "xy";
  }
  // Vertical category / time series.
  return "x";
}

export function chromeForChart(chartId, data, settings) {
  const categories = data?.categories || [];
  const series = data?.series || [];
  const seriesCount = series.length || 0;
  const categoryCount = categories.length || 0;
  const zoomMode = zoomModeForChart(chartId, data);

  if (chartId === "stock-movement-trend") {
    return baseChartChrome(settings, {
      layout: "cartesian",
      dataZoomSlider: true,
      legendItems: seriesCount,
      zoomMode,
    });
  }
  if (chartId === "inventory-value-by-category") {
    const metric = data?.summary?.metric || "all";
    // Single-metric mode is a pie: put category legend under the chart.
    if (metric !== "all") {
      return baseChartChrome(settings, {
        layout: "pie",
        legendItems: categoryCount,
        forceLegend: settings.legend_position === "hidden" ? "hidden" : "bottom",
        zoomMode: null,
      });
    }
    return baseChartChrome(settings, {
      layout: "cartesian",
      legendItems: seriesCount,
      zoomMode,
    });
  }
  if (chartId === "category-radar") {
    return baseChartChrome(settings, {
      layout: "radar",
      legendItems: Math.max(seriesCount, categoryCount),
      forceLegend: settings.legend_position === "hidden" ? "hidden" : "bottom",
      zoomMode: null,
    });
  }
  if (
    chartId === "stock-by-category" ||
    chartId === "stock-by-location" ||
    chartId === "stock-risk"
  ) {
    return baseChartChrome(settings, {
      layout: "pie",
      legendItems: categoryCount || seriesCount,
      forceLegend: settings.legend_position === "hidden" ? "hidden" : "right",
      zoomMode: null,
    });
  }
  if (chartId === "abc-analysis" || chartId === "outgoing-pareto") {
    return baseChartChrome(settings, {
      layout: "cartesian",
      dualYAxis: true,
      legendItems: seriesCount,
      zoomMode,
    });
  }
  if (chartId === "risk-funnel") {
    return baseChartChrome(settings, {
      layout: "funnel",
      legendItems: 0,
      forceLegend: "hidden",
      zoomMode: null,
    });
  }
  if (chartId === "stock-health-gauge") {
    return baseChartChrome(settings, {
      layout: "gauge",
      legendItems: 0,
      forceLegend: "hidden",
      zoomMode: null,
    });
  }
  if (chartId === "stock-treemap") {
    return baseChartChrome(settings, {
      layout: "cartesian",
      forceLegend: "hidden",
      zoomMode: null,
    });
  }
  if (chartId === "movement-heatmap") {
    return baseChartChrome(settings, {
      layout: "cartesian",
      forceLegend: "hidden",
      zoomMode,
    });
  }
  return baseChartChrome(settings, {
    layout: "cartesian",
    legendItems: seriesCount,
    zoomMode,
  });
}
