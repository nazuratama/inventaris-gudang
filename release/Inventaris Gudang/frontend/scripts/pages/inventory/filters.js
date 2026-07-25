import { parseInventoryScope } from "../../components/reference-data.js";

export const DEFAULT_FILTERS = Object.freeze({
  scope: "items",
  page: 1,
  page_size: 25,
  search: "",
  category_id: "",
  location_id: "",
  unit: "",
  active: "all",
  data_scope: "all",
  stock_status: "all",
  sort: "updated_at",
  order: "desc",
});

export function parseFilters(query, defaultPageSize = DEFAULT_FILTERS.page_size) {
  const page = positiveInteger(query.get("page"), DEFAULT_FILTERS.page);
  const pageSize = [25, 50, 100].includes(Number(query.get("page_size")))
    ? Number(query.get("page_size"))
    : defaultPageSize;
  const stockStatus = ["all", "normal", "low", "out"].includes(query.get("stock_status"))
    ? query.get("stock_status")
    : DEFAULT_FILTERS.stock_status;
  // Always load all rows; DEMO/REAL and archive are not product filters.
  const dataScope = "all";
  const allowedSort = [
    "name",
    "current_stock",
    "category",
    "location",
    "unit",
    "created_at",
    "updated_at",
  ];
  const sort = allowedSort.includes(query.get("sort")) ? query.get("sort") : DEFAULT_FILTERS.sort;
  const order = query.get("order") === "asc" ? "asc" : "desc";
  const scope = parseInventoryScope(query.get("scope"));

  return {
    scope,
    page,
    page_size: pageSize,
    search: String(query.get("search") || "").slice(0, 150),
    category_id: query.get("category_id") || "",
    location_id: query.get("location_id") || "",
    unit: String(query.get("unit") || "").slice(0, 32),
    active: "all",
    data_scope: dataScope,
    stock_status: stockStatus,
    sort,
    order,
  };
}

export function hasActiveFilters(filters) {
  return Boolean(
    filters.search ||
      filters.category_id ||
      filters.location_id ||
      filters.unit ||
      filters.stock_status !== DEFAULT_FILTERS.stock_status ||
      filters.sort !== DEFAULT_FILTERS.sort ||
      filters.order !== DEFAULT_FILTERS.order,
  );
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
