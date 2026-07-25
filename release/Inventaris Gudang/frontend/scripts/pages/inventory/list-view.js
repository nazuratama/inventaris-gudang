import { openItemDrawer } from "../../components/item-drawer.js";
import { openItemForm } from "../../components/item-form.js";
import { openMovementForm } from "../../components/movement-form.js";
import { createDataTableFooter } from "../../components/pagination.js";
import { createEmptyState, createTableLoading } from "../../components/states.js";
import { createSortableHeader } from "../../components/sort-controls.js";
import { debounce } from "../../utils/debounce.js";
import { button, element, icon, replace } from "../../utils/dom.js";
import { formatDateTime, formatNumber } from "../../utils/formatting.js";
import { prefersReducedMotion } from "../../utils/motion.js";
import {
  getCategoryName,
  getLocationName,
  stockStatusPresentation,
} from "../../utils/data.js";
import { DEFAULT_FILTERS, hasActiveFilters } from "./filters.js";

export function createFilterBar(view, updateFilters) {
  const searchInput = element("input", {
    attributes: {
      type: "search",
      placeholder: "Cari nama barang…",
      maxlength: 150,
      autocomplete: "off",
      "aria-label": "Cari inventaris",
      spellcheck: "false",
    },
    properties: { value: view.filters.search || "" },
  });
  const submitSearch = debounce(
    () => updateFilters({ search: searchInput.value.trim() }, { replace: true }),
    320,
  );
  let composing = false;
  searchInput.addEventListener("compositionstart", () => {
    composing = true;
  });
  searchInput.addEventListener("compositionend", () => {
    composing = false;
    submitSearch();
  });
  searchInput.addEventListener("input", () => {
    if (!composing) {
      submitSearch();
    }
  });

  const selectsHost = element("div", {
    className: "inventory-filter-selects",
  });

  function renderSelects(nextView) {
    const categorySelect = createFilterSelect(
      "Filter kategori",
      [
        { value: "", label: "Semua kategori" },
        ...(nextView.catalogs.categories || []).map((category) => ({
          value: category.id,
          label: category.name,
        })),
      ],
      nextView.filters.category_id,
      (value) => updateFilters({ category_id: value }),
    );
    const locationSelect = createFilterSelect(
      "Filter lokasi",
      [
        { value: "", label: "Semua lokasi" },
        ...(nextView.catalogs.locations || []).map((location) => ({
          value: location.id,
          label: location.name,
        })),
      ],
      nextView.filters.location_id,
      (value) => updateFilters({ location_id: value }),
    );
    const unitSelect = createFilterSelect(
      "Filter satuan",
      [
        { value: "", label: "Semua satuan" },
        ...(nextView.catalogs.units || []).map((unit) => ({
          value: unit.name || unit.id || "",
          label: unit.name || unit.id || "—",
        })),
      ],
      nextView.filters.unit,
      (value) => updateFilters({ unit: value }),
    );
    const stockSelect = createFilterSelect(
      "Filter kondisi stok",
      [
        { value: "all", label: "Semua kondisi stok" },
        { value: "normal", label: "Stok aman" },
        { value: "low", label: "Stok menipis" },
        { value: "out", label: "Stok habis" },
      ],
      nextView.filters.stock_status,
      (value) => updateFilters({ stock_status: value }),
    );
    replace(selectsHost, [categorySelect, locationSelect, unitSelect, stockSelect]);
  }

  renderSelects(view);

  const root = element("section", {
    className: "inventory-filters",
    attributes: { "aria-label": "Filter inventaris" },
    children: [
      element("label", {
        className: "search-control",
        children: [icon("search"), searchInput],
      }),
      selectsHost,
    ],
  });

  return {
    root,
    getSearchValue: () => searchInput.value.trim(),
    sync(nextView) {
      // Never clobber the box the user is actively typing in.
      if (document.activeElement !== searchInput) {
        const next = String(nextView.filters.search || "");
        if (searchInput.value !== next) {
          searchInput.value = next;
        }
      }
      renderSelects(nextView);
    },
  };
}

export function createResultsSummary(view, updateFilters) {
  const hasFilters = hasActiveFilters(view.filters);
  return element("div", {
    className: "filters-summary",
    children: [
      element("span", {
        text:
          view.pagination.total > 0
            ? `${formatNumber(view.pagination.total)} barang ditemukan`
            : "Tidak ada barang ditemukan",
      }),
      hasFilters
        ? button("Reset filter", {
            variant: "button-quiet",
            className: "button-compact",
            iconName: "refresh",
            onClick: () =>
              updateFilters({
                ...DEFAULT_FILTERS,
                page_size: view.defaultPageSize,
              }),
          })
        : null,
    ],
  });
}

export function createInventoryTable(view, context, updateFilters) {
  const card = element("section", { className: ["card", "table-card"] });
  const table = element("table", {
    className: ["data-table", "inventory-data-table"],
    attributes: { "aria-label": "Daftar inventaris" },
  });
  // Hybrid alignment: text left, numbers right, actions center.
  // Sortable headers map to backend sort keys (filter-bar sort removed).
  const headers = [
    { label: "Nama barang", className: "align-left", sortKey: "name" },
    { label: "Kategori", className: "align-left", sortKey: "category" },
    { label: "Lokasi", className: "align-left", sortKey: "location" },
    { label: "Satuan", className: "align-center", sortKey: "unit" },
    { label: "Stok", className: "align-right", sortKey: "current_stock" },
    { label: "Diperbarui", className: "align-left", sortKey: "updated_at" },
    { label: "Aksi", className: "align-center" },
  ];
  const onSort = ({ sort, order }) => updateFilters({ sort, order });
  // Fixed col widths: sort asc/desc must not reflow gaps between columns.
  table.append(
    element("colgroup", {
      children: [
        element("col", { className: "col-name" }),
        element("col", { className: "col-category" }),
        element("col", { className: "col-location" }),
        element("col", { className: "col-unit" }),
        element("col", { className: "col-stock" }),
        element("col", { className: "col-updated" }),
        element("col", { className: "col-actions" }),
      ],
    }),
  );
  table.append(
    element("thead", {
      children: [
        element("tr", {
          children: headers.map((header) =>
            createSortableHeader({
              label: header.label,
              sortKey: header.sortKey || null,
              className: header.className,
              currentSort: view.filters.sort,
              currentOrder: view.filters.order,
              onSort: header.sortKey ? onSort : null,
            }),
          ),
        }),
      ],
    }),
  );

  if (view.items.length > 0) {
    const body = element("tbody", {
      className: prefersReducedMotion() ? null : "is-soft-refresh",
    });
    for (const item of view.items) {
      body.append(createItemRow(item, context));
    }
    table.append(body);
    card.append(element("div", { className: "table-scroll", children: [table] }));
  } else {
    table.append(createTableLoading(7, 0));
    card.append(
      element("div", { className: "table-scroll", children: [table] }),
      createEmptyState({
        iconName: hasActiveFilters(view.filters) ? "search" : "box-open",
        title: hasActiveFilters(view.filters)
          ? "Tidak ada barang yang cocok"
          : "Belum ada barang pada sumber data ini",
        message: hasActiveFilters(view.filters)
          ? "Ubah kata pencarian atau reset filter untuk melihat hasil lain."
          : "Mulai dengan tombol Tambah barang. Catat stok lewat barang masuk dan keluar.",
        actionLabel: hasActiveFilters(view.filters) ? "Reset filter" : "Tambah barang",
        actionIcon: hasActiveFilters(view.filters) ? "refresh" : "plus",
        requiresConnection: !hasActiveFilters(view.filters),
        onAction: hasActiveFilters(view.filters)
          ? () =>
              updateFilters({
                ...DEFAULT_FILTERS,
                page_size: view.defaultPageSize,
              })
          : (event) =>
              openItemForm({
                trigger: event.currentTarget,
                onSaved: context.refresh,
              }),
      }),
    );
  }

  card.append(createTableFooter(view, updateFilters));
  return card;
}

function createItemRow(item, context) {
  const status = stockStatusPresentation(item);
  const row = element("tr", {
    className: "row-clickable",
    attributes: {
      tabindex: "0",
      role: "button",
      "aria-label": `Buka riwayat stok ${item.name}`,
    },
  });
  const openDetails = () =>
    openItemDrawer(item.id, {
      trigger: row,
      onChanged: context.refresh,
    });
  row.addEventListener("click", openDetails);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  });

  const actionCell = element("td", { className: ["actions", "align-center"] });
  const actionGroup = element("div", {
    className: "row-actions",
    children: [
      quickActionButton("Barang masuk", "arrow-up", (event) => {
        event.stopPropagation();
        openMovementForm({
          item,
          type: "IN",
          trigger: event.currentTarget,
          onSaved: context.refresh,
        });
      }),
      quickActionButton(
        "Barang keluar",
        "arrow-down",
        (event) => {
          event.stopPropagation();
          openMovementForm({
            item,
            type: "OUT",
            trigger: event.currentTarget,
            onSaved: context.refresh,
          });
        },
        Number(item.current_stock) <= 0,
      ),
      quickActionButton("Riwayat stok", "history", (event) => {
        event.stopPropagation();
        openItemDrawer(item.id, {
          trigger: event.currentTarget,
          onChanged: context.refresh,
        });
      }),
    ],
  });
  actionCell.append(actionGroup);

  row.append(
    element("td", {
      className: ["align-left", "cell-stack"],
      attributes: { title: item.name || "" },
      children: [
        element("div", {
          className: "title-with-badge",
          children: [
            element("span", { className: "cell-primary", text: item.name }),
          ],
        }),
        item.description
          ? element("div", {
              className: ["cell-secondary", "truncate"],
              text: item.description,
              attributes: { title: item.description },
            })
          : null,
      ],
    }),
    element("td", {
      className: "align-left",
      text: getCategoryName(item),
      attributes: { title: getCategoryName(item) || "" },
    }),
    element("td", {
      className: "align-left",
      text: getLocationName(item),
      attributes: { title: getLocationName(item) || "" },
    }),
    element("td", {
      className: "align-center",
      text: item.unit || "—",
    }),
    element("td", {
      className: ["align-right", "numeric", "number"],
      children: [
        element("span", {
          className: ["stock-cell", status.className],
          attributes: {
            title: status.label,
            "aria-label": `${formatNumber(item.current_stock)} · ${status.label}`,
          },
          children: [
            element("strong", { text: formatNumber(item.current_stock) }),
          ],
        }),
      ],
    }),
    element("td", {
      className: "align-left",
      text: formatDateTime(item.updated_at),
    }),
    actionCell,
  );
  return row;
}

function quickActionButton(label, iconName, handler, disabled = false) {
  return element("button", {
    className: "icon-button",
    attributes: {
      type: "button",
      title: label,
      "aria-label": label,
      "data-requires-connection": iconName !== "chevron-right" || undefined,
    },
    properties: { disabled },
    events: { click: handler },
    children: [icon(iconName)],
  });
}

function createTableFooter(view, updateFilters) {
  return createDataTableFooter({
    pagination: view.pagination,
    pageSize: view.filters.page_size,
    onPageChange: (page) => updateFilters({ page }, { replace: false }),
    onPageSizeChange: (pageSize) => updateFilters({ page_size: pageSize, page: 1 }),
  });
}

function createFilterSelect(ariaLabel, options, value, onChange) {
  const select = element("select", {
    className: "filter-control",
    attributes: { "aria-label": ariaLabel },
    events: { change: (event) => onChange(event.currentTarget.value) },
  });
  for (const option of options) {
    select.append(
      element("option", {
        text: option.label,
        attributes: { value: option.value },
        properties: { selected: String(option.value) === String(value) },
      }),
    );
  }
  return select;
}

