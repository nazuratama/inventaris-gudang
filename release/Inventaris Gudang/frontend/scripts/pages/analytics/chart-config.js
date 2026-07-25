export function normalizeChartOrder(order, fallbackIds = []) {
  const known = fallbackIds.length
    ? fallbackIds
    : Array.isArray(order)
      ? order
      : [];
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(order) ? order : []) {
    const id = String(item);
    if (id && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }
  for (const id of known) {
    if (id && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }
  return result;
}

export function sortChartsByOrder(charts, order) {
  const rank = new Map(normalizeChartOrder(order).map((id, index) => [id, index]));
  return [...charts].sort((left, right) => {
    const leftRank = rank.has(left.chart_id) ? rank.get(left.chart_id) : 999;
    const rightRank = rank.has(right.chart_id) ? rank.get(right.chart_id) : 999;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return String(left.title || "").localeCompare(String(right.title || ""), "id");
  });
}

/**
 * Replace the positions of currently enabled charts inside the full order,
 * keeping disabled charts in their relative slots.
 */
export function mergeEnabledOrderIntoFull(fullOrder, enabledOrder) {
  const enabledSet = new Set(enabledOrder);
  const queue = [...enabledOrder];
  const merged = [];
  for (const chartId of normalizeChartOrder(fullOrder)) {
    if (enabledSet.has(chartId)) {
      const next = queue.shift();
      if (next) {
        merged.push(next);
      }
    } else {
      merged.push(chartId);
    }
  }
  for (const chartId of queue) {
    if (!merged.includes(chartId)) {
      merged.push(chartId);
    }
  }
  return normalizeChartOrder(merged, fullOrder);
}

export function chartInitialFilters(chartId, globalFilters, settings) {
  const filters = {
    ...globalFilters,
    ranking: "highest",
    movement_scope: "both",
    top_n: Number(settings.default_top_n || 10),
    aggregation: settings.default_aggregation || "daily",
    show_net: false,
    metric: "",
  };
  if (chartId === "inventory-movement-velocity") {
    filters.metric = "all";
    filters.date_range =
      settings.movement_default_period || globalFilters.date_range;
  } else if (chartId === "stock-by-category" || chartId === "stock-by-location") {
    filters.metric = "quantity";
  }
  return filters;
}
