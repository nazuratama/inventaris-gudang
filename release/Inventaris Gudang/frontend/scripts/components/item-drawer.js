import {
  deleteItem,
  getItem,
  getItemMovements,
} from "../api/inventory-api.js";
import { confirmAndDeleteMovement } from "./delete-movement.js";
import { openItemForm } from "./item-form.js";
import {
  closeModal,
  confirmAction,
  openModal,
  updateModal,
} from "./modal.js";
import { openMovementForm } from "./movement-form.js";
import { createDataTableFooter } from "./pagination.js";
import { showApiError, showToast } from "./toast.js";
import { badge, button, element, icon } from "../utils/dom.js";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  movementLabel,
} from "../utils/formatting.js";
import {
  getCategoryName,
  getCollection,
  getLocationName,
  normalizePagination,
  stockStatusPresentation,
} from "../utils/data.js";
import { createErrorState, createPageLoading } from "./states.js";

/**
 * Settings-style product window with summary and stock history.
 * Opened when an inventory row is clicked.
 */
export function openItemDrawer(itemId, options = {}) {
  const dialogEl = document.getElementById("appDialog");
  let currentItem = null;
  let movements = [];
  let pagination = normalizePagination({}, 1, 25);
  let movementType = "all";
  let page = 1;
  let pageSize = 25;
  let destroyed = false;
  const controller = new AbortController();

  const closeDetail = () => closeModal({ force: true });

  openModal({
    // Large history workspace (previous wide size).
    size: "wide",
    dialogClasses: ["item-history-window-dialog"],
    eyebrow: "Inventaris",
    title: "Memuat detail…",
    description: "Menyiapkan ringkasan barang dan riwayat stok.",
    returnFocus: options.trigger,
    body: createPageLoading(0),
    footer: [],
    // View window: close via X; Enter must not trigger footer actions.
    submitOnEnter: false,
    onClose: () => {
      destroyed = true;
      controller.abort();
    },
  });

  const load = async () => {
    if (destroyed) {
      return;
    }
    try {
      const [itemData, movementData] = await Promise.all([
        getItem(itemId, { signal: controller.signal }),
        getItemMovements(
          itemId,
          {
            page,
            page_size: pageSize,
            movement_type: movementType === "all" ? undefined : movementType,
          },
          { signal: controller.signal },
        ),
      ]);
      if (destroyed) {
        return;
      }
      currentItem = itemData?.item || itemData;
      movements = getCollection(movementData, ["movements", "items", "results"]);
      // Prefer API pagination; fall back to requested page size (25).
      pagination = normalizePagination(
        movementData?.pagination || movementData,
        page,
        pageSize,
      );
      if (!pagination.pageSize) {
        pagination = { ...pagination, pageSize };
      }
      paint();
    } catch (error) {
      if (error?.name === "AbortError" || destroyed) {
        return;
      }
      updateModal({
        eyebrow: "Inventaris",
        title: "Detail tidak tersedia",
        description: "",
        body: createErrorState(error, load),
        footer: [],
      });
    }
  };

  function paint() {
    if (!currentItem || destroyed) {
      return;
    }
    const status = stockStatusPresentation(currentItem);
    const body = renderItemHistoryWindow(currentItem, {
      movements,
      pagination,
      movementType,
      status,
      onMovementTypeChange: (value) => {
        movementType = value;
        page = 1;
        load();
      },
      onPageChange: (nextPage) => {
        page = nextPage;
        load();
      },
      onPageSizeChange: (nextSize) => {
        pageSize = nextSize;
        page = 1;
        load();
      },
      reload: load,
      onChanged: options.onChanged,
      closeDetail,
      trigger: options.trigger,
    });

    updateModal({
      size: "wide",
      dialogClasses: ["item-history-window-dialog"],
      eyebrow: "Detail & riwayat stok",
      title: currentItem.name,
      description: [
        getCategoryName(currentItem),
        getLocationName(currentItem),
        currentItem.unit || null,
      ]
        .filter(Boolean)
        .join(" · "),
      body,
      footer: buildFooter(currentItem, {
        reload: load,
        onChanged: options.onChanged,
        closeDetail,
        trigger: options.trigger,
      }),
    });
  }

  load();
}

function buildFooter(item, handlers) {
  // After child form saves, parent history is restored then refreshed in place.
  const afterChildSaved = () => {
    handlers.onChanged?.();
    handlers.reload?.();
  };
  return [
    button("Barang masuk", {
      variant: "button-success",
      iconName: "arrow-up",
      requiresConnection: true,
      onClick: (event) =>
        openMovementForm({
          item,
          type: "IN",
          trigger: event.currentTarget,
          preserveParent: true,
          onSaved: afterChildSaved,
        }),
    }),
    button("Barang keluar", {
      variant: "button-primary",
      iconName: "arrow-down",
      disabled: Number(item.current_stock) <= 0,
      requiresConnection: true,
      onClick: (event) =>
        openMovementForm({
          item,
          type: "OUT",
          trigger: event.currentTarget,
          preserveParent: true,
          onSaved: afterChildSaved,
        }),
    }),
    button("Edit", {
      iconName: "edit",
      requiresConnection: true,
      onClick: (event) =>
        openItemForm({
          item,
          trigger: event.currentTarget,
          preserveParent: true,
          onSaved: afterChildSaved,
        }),
    }),
  ];
}

function renderItemHistoryWindow(item, state) {
  const shell = element("div", {
    className: "item-history-window",
  });

  const metaItems = [
    ["Kategori", getCategoryName(item)],
    ["Lokasi", getLocationName(item)],
    ["Satuan", item.unit || "—"],
    ["Dibuat", formatDate(item.created_at), formatDateTime(item.created_at)],
    ["Diperbarui", formatDate(item.updated_at), formatDateTime(item.updated_at)],
  ];

  shell.append(
    element("section", {
      className: "item-history-summary",
      children: [
        element("div", {
          className: "item-history-summary-top",
          children: [
            element("div", {
              className: "item-history-stock",
              children: [
                element("span", {
                  className: "item-history-stock-label",
                  text: "Stok saat ini",
                }),
                element("div", {
                  className: "item-history-stock-value-row",
                  children: [
                    element("span", {
                      className: [
                        "item-history-stock-value",
                        "number",
                        state.status?.className || "stock-level-ok",
                      ],
                      attributes: { title: state.status?.label || "Stok" },
                      text: formatNumber(item.current_stock),
                    }),
                    element("span", {
                      className: "item-history-stock-unit",
                      text: item.unit || "",
                    }),
                    state.status?.label
                      ? badge(state.status.label, state.status.tone || "neutral")
                      : null,
                  ],
                }),
              ],
            }),
            item.description
              ? element("p", {
                  className: "item-history-description muted",
                  text: item.description,
                  attributes: { title: item.description },
                })
              : null,
          ],
        }),
        element("dl", {
          className: "item-history-meta",
          children: metaItems.map(([term, value, title]) =>
            element("div", {
              className: "item-history-meta-item",
              children: [
                element("dt", { text: term }),
                element("dd", {
                  text: value || "—",
                  attributes: { title: title || value || "" },
                }),
              ],
            }),
          ),
        }),
      ],
    }),
    element("section", {
      className: "item-history-panel",
      children: [
        element("div", {
          className: "item-history-panel-header",
          children: [
            element("div", {
              className: "item-history-panel-copy",
              children: [
                element("h3", { text: "Riwayat stok" }),
                element("p", {
                  className: "muted",
                  text: "Masuk/keluar · hapus catatan untuk mengembalikan stok",
                }),
              ],
            }),
            createTypeFilter(state.movementType, state.onMovementTypeChange),
          ],
        }),
        createHistoryTable(state),
      ],
    }),
    createManageSection(item, state),
  );

  return shell;
}

function createTypeFilter(value, onChange) {
  // Short labels so the filter control stays compact in the history header.
  const select = element("select", {
    className: ["filter-control", "item-history-type-filter"],
    attributes: { "aria-label": "Filter jenis" },
    events: {
      change: (event) => onChange(event.currentTarget.value),
    },
  });
  for (const option of [
    { value: "all", label: "Semua" },
    { value: "IN", label: "Masuk" },
    { value: "OUT", label: "Keluar" },
  ]) {
    select.append(
      element("option", {
        text: option.label,
        attributes: { value: option.value },
        properties: { selected: option.value === value },
      }),
    );
  }
  return select;
}

function createHistoryTable(state) {
  const card = element("div", { className: ["item-history-table-wrap"] });
  const table = element("table", {
    className: "data-table item-history-data-table",
    attributes: { "aria-label": "Riwayat stok barang" },
  });
  table.append(
    element("thead", {
      children: [
        element("tr", {
          children: [
            { label: "Waktu", className: "align-left" },
            { label: "Jenis", className: "align-center" },
            { label: "Jumlah", className: "align-right" },
            { label: "Stok sebelum", className: "align-right" },
            { label: "Stok sesudah", className: "align-right" },
            { label: "Keterangan", className: "align-left" },
            { label: "Aksi", className: "align-center" },
          ].map((header) =>
            element("th", {
              className: header.className,
              text: header.label,
            }),
          ),
        }),
      ],
    }),
  );

  if (state.movements.length > 0) {
    table.append(
      element("tbody", {
        children: state.movements.map((movement) =>
          createHistoryRow(movement, state),
        ),
      }),
    );
    card.append(element("div", { className: "table-scroll", children: [table] }));
  } else {
    card.append(
      element("div", {
        className: "item-history-empty",
        children: [
          icon("history"),
          element("strong", {
            text:
              state.movementType !== "all"
                ? "Tidak ada riwayat untuk filter ini"
                : "Belum ada riwayat stok",
          }),
          element("p", {
            className: "muted",
            text: "Catatan muncul otomatis saat barang masuk atau keluar dicatat.",
          }),
        ],
      }),
    );
  }

  card.append(
    createDataTableFooter({
      pagination: state.pagination,
      pageSize: state.pagination?.pageSize || 25,
      onPageChange: state.onPageChange,
      onPageSizeChange: state.onPageSizeChange,
    }),
  );
  return card;
}

function createHistoryRow(movement, state = {}) {
  const type = String(movement.movement_type || movement.type || "").toUpperCase();
  const isInOut = type === "IN" || type === "OUT";
  const quantity = isInOut
    ? `${type === "IN" ? "+" : "−"}${formatNumber(movement.quantity)}`
    : `${formatNumber(movement.stock_before)} → ${formatNumber(movement.stock_after)}`;
  const tone = type === "IN" ? "success" : type === "OUT" ? "warning" : "neutral";
  const deleteButton = element("button", {
    className: ["icon-button", "icon-button-danger"],
    attributes: {
      type: "button",
      title: "Hapus & kembalikan stok",
      "aria-label": `Hapus riwayat ${movementLabel(type)}`,
      "data-requires-connection": true,
    },
    events: {
      click: async (event) => {
        event.stopPropagation();
        const result = await confirmAndDeleteMovement(movement, {
          onDeleted: () => {
            state.onChanged?.();
            state.reload?.();
          },
        });
        if (result) {
          // Keep detail window open; reload refreshes stock + history.
        }
      },
    },
    children: [icon("trash")],
  });
  return element("tr", {
    children: [
      element("td", {
        className: "align-left",
        text: formatDateTime(movement.created_at),
      }),
      element("td", {
        className: "align-center",
        children: [badge(movementLabel(type), tone)],
      }),
      element("td", {
        className: [
          "align-right",
          "numeric",
          "number",
          isInOut ? `movement-quantity-${type.toLowerCase()}` : null,
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
    ],
  });
}

function createManageSection(item, state) {
  return element("section", {
    className: "item-history-manage",
    children: [
      element("h3", { text: "Kelola barang" }),
      element("div", {
        className: "drawer-actions-secondary",
        children: [
          button("Hapus permanen", {
            iconName: "trash",
            className: "text-danger",
            requiresConnection: true,
            onClick: async () => {
              const confirmed = await confirmAction({
                eyebrow: "Hapus permanen",
                title: `Hapus ${item.name}?`,
                message:
                  "Tindakan ini hanya diizinkan jika barang belum memiliki riwayat stok.",
                detail:
                  "Barang dengan riwayat akan tetap dipertahankan oleh sistem untuk menjaga audit stok.",
                confirmLabel: "Hapus permanen",
                danger: true,
              });
              if (!confirmed) {
                return;
              }
              try {
                await deleteItem(item.id, item.name);
                state.closeDetail?.();
                showToast({
                  type: "success",
                  title: "Barang dihapus",
                  message: `${item.name} telah dihapus permanen.`,
                });
                state.onChanged?.();
              } catch (error) {
                showApiError(error, "Barang tidak dapat dihapus");
              }
            },
          }),
        ],
      }),
    ],
  });
}
