import { confirmAndDeleteMovement } from "../../components/delete-movement.js";
import { closeDrawer, openDrawer } from "../../components/drawer.js";
import { openItemDrawer } from "../../components/item-drawer.js";
import { createDataTableFooter } from "../../components/pagination.js";
import { createEmptyState, createTableLoading } from "../../components/states.js";
import { createSortableHeader } from "../../components/sort-controls.js";
import { debounce } from "../../utils/debounce.js";
import { badge, button, element, icon, replace } from "../../utils/dom.js";
import { formatDateTime, formatNumber, movementLabel } from "../../utils/formatting.js";
import { prefersReducedMotion } from "../../utils/motion.js";
import { getItemName } from "../../utils/data.js";
import { DEFAULT_FILTERS, hasActiveFilters } from "./filters.js";

export function createFilterBar(view, updateFilters) {
  const searchInput = element("input", {
    attributes: {
      type: "search",
      placeholder: "Cari nama barang atau catatan…",
      maxlength: 150,
      autocomplete: "off",
      "aria-label": "Cari riwayat stok",
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

  const controlsHost = element("div", { className: "movement-filter-controls" });

  function renderControls(nextView) {
    const typeSelect = createSelect(
      "Filter jenis pergerakan",
      [
        { value: "all", label: "Semua jenis" },
        { value: "IN", label: "Barang masuk" },
        { value: "OUT", label: "Barang keluar" },
      ],
      nextView.filters.movement_type,
      (value) => updateFilters({ movement_type: value }),
    );
    const dateFrom = element("input", {
      className: "filter-control",
      attributes: {
        type: "date",
        "aria-label": "Tanggal mulai",
        title: "Tanggal mulai",
      },
      properties: { value: nextView.filters.date_from || "" },
      events: {
        change: (event) => updateFilters({ date_from: event.currentTarget.value }),
      },
    });
    const dateTo = element("input", {
      className: "filter-control",
      attributes: {
        type: "date",
        "aria-label": "Tanggal akhir",
        title: "Tanggal akhir",
      },
      properties: { value: nextView.filters.date_to || "" },
      events: {
        change: (event) => updateFilters({ date_to: event.currentTarget.value }),
      },
    });
    replace(controlsHost, [typeSelect, dateFrom, dateTo]);
  }

  renderControls(view);

  const root = element("section", {
    className: ["inventory-filters", "movement-filters"],
    attributes: { "aria-label": "Filter riwayat stok" },
    children: [
      element("label", {
        className: "search-control",
        children: [icon("search"), searchInput],
      }),
      controlsHost,
    ],
  });

  return {
    root,
    getSearchValue: () => searchInput.value.trim(),
    sync(nextView) {
      if (document.activeElement !== searchInput) {
        const next = String(nextView.filters.search || "");
        if (searchInput.value !== next) {
          searchInput.value = next;
        }
      }
      // Keep date/type controls in sync unless the user is editing them.
      if (
        !controlsHost.contains(document.activeElement) ||
        document.activeElement === searchInput
      ) {
        renderControls(nextView);
      }
    },
  };
}

export function createResultSummary(view, updateFilters) {
  const active = hasActiveFilters(view.filters);
  return element("div", {
    className: "filters-summary",
    children: [
      element("span", {
        text:
          view.pagination.total > 0
            ? `${formatNumber(view.pagination.total)} catatan ditemukan`
            : "Tidak ada catatan ditemukan",
      }),
      active
        ? button("Reset filter", {
            variant: "button-quiet",
            className: "button-compact",
            iconName: "refresh",
            onClick: () => updateFilters({ ...DEFAULT_FILTERS }),
          })
        : null,
    ],
  });
}

export function createMovementTable(view, updateFilters, handlers = {}) {
  const card = element("section", { className: ["card", "table-card"] });
  const table = element("table", {
    className: ["data-table", "movements-data-table"],
    attributes: { "aria-label": "Riwayat pergerakan stok" },
  });
  const headers = [
    { label: "Waktu", className: "align-center", sortKey: "created_at" },
    { label: "Barang", className: "align-left", sortKey: "item" },
    { label: "Jenis", className: "align-center", sortKey: "movement_type" },
    { label: "Jumlah", className: "align-right", sortKey: "quantity" },
    { label: "Stok sebelum", className: "align-right", sortKey: "stock_before" },
    { label: "Stok sesudah", className: "align-right", sortKey: "stock_after" },
    { label: "Keterangan", className: "align-left" },
    { label: "Aksi", className: ["align-center", "col-actions"] },
  ];
  const onSort = ({ sort, order }) => updateFilters({ sort, order });
  table.append(
    element("colgroup", {
      children: [
        element("col", { className: "col-time" }),
        element("col", { className: "col-item" }),
        element("col", { className: "col-type" }),
        element("col", { className: "col-qty" }),
        element("col", { className: "col-stock-before" }),
        element("col", { className: "col-stock-after" }),
        element("col", { className: "col-note" }),
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

  if (view.movements.length > 0) {
    table.append(
      element("tbody", {
        className: prefersReducedMotion() ? null : "is-soft-refresh",
        children: view.movements.map((movement) =>
          createMovementRow(movement, handlers),
        ),
      }),
    );
    card.append(element("div", { className: "table-scroll", children: [table] }));
  } else {
    table.append(createTableLoading(8, 0));
    card.append(
      element("div", { className: "table-scroll", children: [table] }),
      createEmptyState({
        iconName: hasActiveFilters(view.filters) ? "search" : "history",
        title: hasActiveFilters(view.filters)
          ? "Tidak ada riwayat yang cocok"
          : "Belum ada riwayat stok",
        message: hasActiveFilters(view.filters)
          ? "Ubah filter atau reset untuk melihat catatan lain."
          : "Setiap barang masuk dan keluar akan muncul otomatis di sini.",
        actionLabel: hasActiveFilters(view.filters) ? "Reset filter" : null,
        actionIcon: "refresh",
        onAction: hasActiveFilters(view.filters)
          ? () => updateFilters({ ...DEFAULT_FILTERS })
          : undefined,
      }),
    );
  }

  card.append(createTableFooter(view, updateFilters));
  return card;
}

function createTableFooter(view, updateFilters) {
  return createDataTableFooter({
    pagination: view.pagination,
    pageSize: view.filters.page_size,
    onPageChange: (page) => updateFilters({ page }, { replace: false }),
    onPageSizeChange: (pageSize) => updateFilters({ page_size: pageSize, page: 1 }),
  });
}

function createMovementRow(movement, handlers = {}) {
  const type = String(movement.movement_type || movement.type || "").toUpperCase();
  const row = element("tr", {
    className: "row-clickable",
    attributes: {
      tabindex: "0",
      role: "button",
      "aria-label": `Buka detail ${movementLabel(type)} untuk ${getItemName(movement)}`,
    },
  });
  const openDetails = () => openMovementDetail(movement, row, handlers);
  row.addEventListener("click", openDetails);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  });

  const quantity = `${type === "IN" ? "+" : "−"}${formatNumber(movement.quantity)}`;
  const deleteButton = element("button", {
    className: ["icon-button", "icon-button-danger"],
    attributes: {
      type: "button",
      title: "Hapus & kembalikan stok",
      "aria-label": `Hapus riwayat ${movementLabel(type)} ${getItemName(movement)}`,
      "data-requires-connection": true,
    },
    events: {
      click: async (event) => {
        event.stopPropagation();
        const result = await confirmAndDeleteMovement(movement, {
          onDeleted: handlers.onDeleted,
        });
        if (result) {
          closeDrawer({ restoreFocus: false });
        }
      },
    },
    children: [icon("trash")],
  });

  row.append(
    element("td", {
      className: "align-center",
      text: formatDateTime(movement.created_at),
    }),
    element("td", {
      className: "align-left",
      attributes: { title: getItemName(movement) || "" },
      children: [
        element("span", {
          className: "cell-primary",
          text: getItemName(movement),
        }),
      ],
    }),
    element("td", {
      className: "align-center",
      children: [
        badge(
          movementLabel(type),
          type === "IN" ? "success" : type === "OUT" ? "warning" : "info",
        ),
      ],
    }),
    element("td", {
      className: [
        "align-right",
        "numeric",
        `movement-quantity-${type.toLowerCase()}`,
        "number",
      ],
      text: quantity,
    }),
    element("td", {
      className: ["align-right", "numeric", "number"],
      text: formatNumber(movement.stock_before),
    }),
    element("td", {
      className: ["align-right", "numeric", "number"],
      text: formatNumber(movement.stock_after),
    }),
    element("td", {
      className: "align-left",
      children: [
        element("span", {
          className: "truncate",
          text: movement.note || "—",
          attributes: { title: movement.note || "" },
        }),
      ],
    }),
    element("td", {
      className: ["actions", "col-actions", "align-center"],
      children: [
        element("div", {
          className: "row-actions",
          children: [deleteButton],
        }),
      ],
    }),
  );
  return row;
}

function openMovementDetail(movement, trigger, handlers = {}) {
  const type = String(movement.movement_type || movement.type || "").toUpperCase();
  const definitions = [
    ["Jenis", movementLabel(type)],
    ["Waktu", formatDateTime(movement.created_at)],
    ["Jumlah", formatNumber(movement.quantity)],
    ["Stok sebelum", formatNumber(movement.stock_before)],
    ["Stok sesudah", formatNumber(movement.stock_after)],
    ["Keterangan", movement.note || "Tidak ada"],
  ];
  openDrawer({
    eyebrow: "Riwayat stok",
    title: getItemName(movement),
    returnFocus: trigger,
    content: element("div", {
      className: "page-stack",
      children: [
        element("section", {
          className: "drawer-section",
          children: [
            element("div", {
              className: "detail-stock",
              children: [
                element("div", {
                  children: [
                    element("span", {
                      className: "detail-stock-value number",
                      text: formatNumber(movement.stock_after),
                    }),
                    element("span", {
                      className: "detail-stock-unit",
                      text: movement.unit || movement.item?.unit || "",
                    }),
                  ],
                }),
                element("div", {
                  className: "badge-row",
                  children: [
                    badge(
                      movementLabel(type),
                      type === "IN"
                        ? "success"
                        : type === "OUT"
                          ? "warning"
                          : "info",
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),
        element("section", {
          className: "drawer-section",
          children: [
            element("h3", {
              className: "drawer-section-title",
              text: "Rincian transaksi",
            }),
            element("dl", {
              className: "definition-list",
              children: definitions.map(([term, value]) =>
                element("div", {
                  children: [
                    element("dt", { text: term }),
                    element("dd", { text: value }),
                  ],
                }),
              ),
            }),
          ],
        }),
        element("section", {
          className: "drawer-section",
          children: [
            element("h3", { className: "drawer-section-title", text: "Keterangan" }),
            element("p", {
              className: "muted",
              text: movement.note || "Tidak ada keterangan.",
            }),
          ],
        }),
        element("section", {
          className: "drawer-section",
          children: [
            element("div", {
              className: "drawer-actions-secondary",
              children: [
                movement.item_id || movement.item?.id
                  ? button("Buka detail barang", {
                      iconName: "package",
                      onClick: (event) =>
                        openItemDrawer(movement.item_id || movement.item.id, {
                          trigger: event.currentTarget,
                          onChanged: handlers.onDeleted,
                        }),
                    })
                  : null,
                button("Hapus & kembalikan stok", {
                  variant: "button-danger",
                  iconName: "trash",
                  requiresConnection: true,
                  onClick: async () => {
                    const result = await confirmAndDeleteMovement(movement, {
                      onDeleted: handlers.onDeleted,
                    });
                    if (result) {
                      closeDrawer({ restoreFocus: false });
                    }
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}

export function createSoftTableLoading() {
  return element("section", {
    className: ["card", "table-card"],
    children: [
      element("div", {
        className: "table-scroll",
        children: [
          element("table", {
            className: "data-table",
            children: [createTableLoading(8, 6)],
          }),
        ],
      }),
    ],
  });
}

function createSelect(label, options, value, onChange) {
  const select = element("select", {
    className: "filter-control",
    attributes: { "aria-label": label },
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

