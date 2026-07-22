import { element, icon } from "../utils/dom.js";

/** Fields that default to descending on first click. */
const DEFAULT_DESC_SORTS = new Set([
  "updated_at",
  "created_at",
  "current_stock",
  "quantity",
  "stock_before",
  "stock_after",
]);

/**
 * Resolve next sort/order when a table header is clicked.
 * Same column toggles direction; new column uses a sensible default.
 */
export function nextSortState(sortKey, currentSort, currentOrder) {
  if (currentSort === sortKey) {
    return {
      sort: sortKey,
      order: currentOrder === "asc" ? "desc" : "asc",
    };
  }
  return {
    sort: sortKey,
    order: DEFAULT_DESC_SORTS.has(sortKey) ? "desc" : "asc",
  };
}

/**
 * Sortable table header cell. Active column shows ↑ (asc) or ↓ (desc).
 */
export function createSortableHeader({
  label,
  sortKey = null,
  currentSort = null,
  currentOrder = "desc",
  className = "align-left",
  onSort = null,
} = {}) {
  if (!sortKey || typeof onSort !== "function") {
    return element("th", {
      text: label,
      className,
      attributes: { scope: "col" },
    });
  }

  const isActive = currentSort === sortKey;
  const order = currentOrder === "asc" ? "asc" : "desc";
  const directionLabel = isActive
    ? order === "asc"
      ? "menaik"
      : "menurun"
    : "belum diurutkan";

  const indicator = element("span", {
    className: [
      "table-sort-indicator",
      isActive ? "is-active" : null,
      isActive ? `is-${order}` : null,
    ],
    attributes: { "aria-hidden": "true" },
    children: [
      icon("arrow-up", { className: "table-sort-arrow table-sort-arrow-up" }),
      icon("arrow-down", { className: "table-sort-arrow table-sort-arrow-down" }),
    ],
  });

  // When active, only the relevant arrow is emphasized via CSS.
  const button = element("button", {
    className: "table-sort-button",
    attributes: {
      type: "button",
      title: isActive
        ? `Diurutkan ${directionLabel}. Klik untuk membalik urutan.`
        : `Urutkan berdasarkan ${label}`,
      "aria-label": `${label}, ${directionLabel}`,
    },
    events: {
      click: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSort(nextSortState(sortKey, currentSort, currentOrder));
      },
    },
    children: [
      element("span", { className: "table-sort-label", text: label }),
      indicator,
    ],
  });

  return element("th", {
    className: [
      className,
      "table-sortable",
      isActive ? "is-sorted" : null,
      isActive ? `is-${order}` : null,
    ],
    attributes: {
      scope: "col",
      "aria-sort": isActive ? (order === "asc" ? "ascending" : "descending") : "none",
    },
    children: [button],
  });
}
