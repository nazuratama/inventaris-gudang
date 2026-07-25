export const DEFAULT_FILTERS = Object.freeze({
  page: 1,
  page_size: 25,
  search: "",
  movement_type: "all",
  data_scope: "all",
  date_from: "",
  date_to: "",
  sort: "created_at",
  order: "desc",
});

export function hasActiveFilters(filters) {
  return Boolean(
    filters.search ||
      filters.movement_type !== DEFAULT_FILTERS.movement_type ||
      filters.date_from ||
      filters.date_to ||
      filters.sort !== DEFAULT_FILTERS.sort ||
      filters.order !== DEFAULT_FILTERS.order,
  );
}

export function parseFilters(query) {
  const type = String(query.get("movement_type") || "all").toUpperCase();
  const allowedSort = [
    "created_at",
    "item",
    "quantity",
    "movement_type",
    "stock_before",
    "stock_after",
  ];
  const sort = allowedSort.includes(query.get("sort"))
    ? query.get("sort")
    : DEFAULT_FILTERS.sort;
  const order = query.get("order") === "asc" ? "asc" : "desc";
  return {
    page: positiveInteger(query.get("page"), DEFAULT_FILTERS.page),
    page_size: [25, 50, 100].includes(Number(query.get("page_size")))
      ? Number(query.get("page_size"))
      : DEFAULT_FILTERS.page_size,
    search: String(query.get("search") || "").slice(0, 150),
    movement_type: ["ALL", "IN", "OUT"].includes(type)
      ? type === "ALL"
        ? "all"
        : type
      : DEFAULT_FILTERS.movement_type,
    // Always show all rows; DEMO/REAL is not a product filter.
    data_scope: "all",
    date_from: validDateValue(query.get("date_from")),
    date_to: validDateValue(query.get("date_to")),
    sort,
    order,
  };
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function validDateValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return "";
  }
  return String(value);
}

