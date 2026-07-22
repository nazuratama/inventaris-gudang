import { apiRequest, downloadFromApi } from "./client.js";

function queryString(filters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function getAnalyticsOverview(options = {}) {
  return apiRequest("/analytics/overview", { signal: options.signal });
}

export function getFeaturedAnalytics(filters = {}, options = {}) {
  return apiRequest(`/analytics/featured${queryString(filters)}`, {
    signal: options.signal,
  });
}

export function getAnalyticsChart(chartId, filters = {}, options = {}) {
  return apiRequest(
    `/analytics/charts/${encodeURIComponent(chartId)}${queryString(filters)}`,
    { signal: options.signal },
  );
}

export function getAnalyticsSettings(options = {}) {
  return apiRequest("/analytics/settings", { signal: options.signal });
}

export function updateAnalyticsSettings(payload) {
  return apiRequest("/analytics/settings", {
    method: "PATCH",
    body: payload,
  });
}

export function restoreAnalyticsDefaults() {
  return apiRequest("/analytics/settings/defaults", {
    method: "POST",
    body: {},
  });
}

export function clearAnalyticsCache() {
  return apiRequest("/analytics/cache/clear", {
    method: "POST",
    body: {},
  });
}

export function exportAnalyticsData(chartId, format, filters = {}) {
  return downloadFromApi(
    `/api/v1/analytics/export${queryString({
      chart_id: chartId,
      format,
      ...filters,
    })}`,
    `${chartId}.${format}`,
  );
}

export function getDemoStatus(options = {}) {
  return apiRequest("/demo/status", { signal: options.signal });
}

export function removeDemoData() {
  return apiRequest("/demo/remove", {
    method: "POST",
    body: { confirmation: true },
  });
}

export function reloadDemoData() {
  return apiRequest("/demo/reload", {
    method: "POST",
    body: { confirmation: true },
  });
}

export function resetInventoryData() {
  return apiRequest("/demo/reset-inventory", {
    method: "POST",
    body: { confirmation: true },
  });
}
