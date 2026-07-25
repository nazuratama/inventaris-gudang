import {
  chromeForChart,
  withCartesianZoom,
  zoomModeForChart,
} from "./chart-theme.js";
import {
  movementByCategoryOption,
  movementHeatmapOption,
  monthlyNetFlowOption,
  outgoingParetoOption,
  rankingBarOption,
  trendLineOption,
} from "./options/movement-options.js";
import {
  compositionDonutOption,
  inventoryValueOption,
  stockHealthGaugeOption,
  stockRiskDonutOption,
  stockVsMinimumOption,
} from "./options/stock-options.js";
import {
  abcAnalysisOption,
  categoryRadarOption,
  riskFunnelOption,
  stockTreemapOption,
  topValueItemsOption,
  velocityBarOption,
} from "./options/classification-options.js";

export function createChartOption(chartId, data, settings) {
  const categories = data?.categories || [];
  const series = data?.series || [];
  if (!categories.length || !series.some((entry) => entry.values?.length)) {
    return { empty: true };
  }
  const precision = Number(settings.decimal_precision || 0);
  const chrome = chromeForChart(chartId, data, settings);
  const zoomMode = chrome.__layout?.zoomMode || zoomModeForChart(chartId, data);

  let option;
  if (chartId === "stock-movement-ranking") {
    option = rankingBarOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "stock-movement-trend") {
    option = trendLineOption(categories, series, settings, chrome, precision);
  } else if (chartId === "stock-by-category" || chartId === "stock-by-location") {
    option = compositionDonutOption(chartId, categories, series, data, settings, chrome, precision);
  } else if (chartId === "inventory-value-by-category") {
    option = inventoryValueOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "stock-risk") {
    option = stockRiskDonutOption(series, data, settings, chrome, precision);
  } else if (chartId === "inventory-movement-velocity") {
    option = velocityBarOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "stock-treemap") {
    option = stockTreemapOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "top-value-items") {
    option = topValueItemsOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "movement-by-category") {
    option = movementByCategoryOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "movement-heatmap") {
    option = movementHeatmapOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "category-radar") {
    option = categoryRadarOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "risk-funnel") {
    option = riskFunnelOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "abc-analysis") {
    option = abcAnalysisOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "stock-vs-minimum") {
    option = stockVsMinimumOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "outgoing-pareto") {
    option = outgoingParetoOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "monthly-net-flow") {
    option = monthlyNetFlowOption(categories, series, data, settings, chrome, precision);
  } else if (chartId === "stock-health-gauge") {
    option = stockHealthGaugeOption(categories, series, data, settings, chrome, precision);
  } else {
    return { empty: true };
  }

  if (!option || option.empty) {
    return option;
  }
  return withCartesianZoom(option, zoomMode);
}
