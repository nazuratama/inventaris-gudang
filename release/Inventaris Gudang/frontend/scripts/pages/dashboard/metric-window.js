import { listItems } from "../../api/inventory-api.js";
import { openItemDrawer } from "../../components/item-drawer.js";
import { closeModal, openModal, updateModal } from "../../components/modal.js";
import { createDataTableFooter } from "../../components/pagination.js";
import {
  createEmptyState,
  createErrorState,
  createPageLoading,
} from "../../components/states.js";
import { button, element, icon } from "../../utils/dom.js";
import { formatNumber } from "../../utils/formatting.js";
import {
  getCategoryName,
  getCollection,
  getLocationName,
  normalizePagination,
  stockStatusPresentation,
} from "../../utils/data.js";

const DASHBOARD_METRICS = Object.freeze({
  active: {
    id: "active",
    label: "Barang aktif",
    description: "Semua barang yang masih dikelola di inventaris aktif.",
    iconName: "package",
    tone: "info",
    emptyTitle: "Belum ada barang aktif",
    emptyMessage: "Tambahkan barang di menu Inventaris untuk mulai mencatat stok.",
    filters: { active: "true", stock_status: "all", data_scope: "all" },
  },
  total_stock: {
    id: "total_stock",
    label: "Total stok",
    description: "Rincian stok per barang aktif (semua kondisi stok).",
    iconName: "warehouse",
    tone: "success",
    emptyTitle: "Belum ada stok tercatat",
    emptyMessage: "Barang aktif akan muncul di sini beserta jumlah stoknya.",
    filters: { active: "true", stock_status: "all", data_scope: "all" },
  },
  low: {
    id: "low",
    label: "Stok menipis",
    description:
      "Barang aktif dengan stok di atas nol tetapi di bawah atau sama dengan batas minimum global.",
    iconName: "alert-triangle",
    tone: "warning",
    emptyTitle: "Tidak ada stok menipis",
    emptyMessage: "Semua barang aktif saat ini di atas batas minimum.",
    filters: { active: "true", stock_status: "low", data_scope: "all" },
  },
  out: {
    id: "out",
    label: "Stok habis",
    description: "Barang aktif dengan stok nol — perlu tindakan segera.",
    iconName: "box-open",
    tone: "danger",
    emptyTitle: "Tidak ada stok habis",
    emptyMessage: "Tidak ada barang aktif yang kehabisan stok saat ini.",
    filters: { active: "true", stock_status: "out", data_scope: "all" },
  },
});

export function openDashboardMetricWindow(metricId, options = {}) {
  const meta = DASHBOARD_METRICS[metricId] || DASHBOARD_METRICS.active;
  const dialogEl = document.getElementById("appDialog");
  let page = 1;
  let pageSize = 25;
  let destroyed = false;
  const controller = new AbortController();

  dialogEl?.classList.add("dashboard-metric-window-dialog");

  openModal({
    size: "wide",
    eyebrow: "Dasbor",
    title: meta.label,
    description: meta.description,
    returnFocus: options.trigger,
    body: createPageLoading(0),
    footer: [],
    submitOnEnter: false,
    onClose: () => {
      destroyed = true;
      controller.abort();
      dialogEl?.classList.remove("dashboard-metric-window-dialog");
    },
  });

  const load = async () => {
    if (destroyed) {
      return;
    }
    try {
      const data = await listItems(
        {
          ...meta.filters,
          page,
          page_size: pageSize,
          sort: "current_stock",
          order: metricId === "out" || metricId === "low" ? "asc" : "desc",
        },
        { signal: controller.signal },
      );
      if (destroyed) {
        return;
      }
      const items = getCollection(data, ["items", "results"]);
      const pagination = normalizePagination(data, page, pageSize);
      updateModal({
        eyebrow: "Dasbor",
        title: meta.label,
        description: `${meta.description} · ${formatNumber(pagination.total)} data`,
        body: renderMetricWindowBody(meta, {
          items,
          pagination,
          summaryValue: options.summaryValue,
          onPageChange: (next) => {
            page = next;
            load();
          },
          onPageSizeChange: (size) => {
            pageSize = size;
            page = 1;
            load();
          },
          onItemOpen: (item, trigger) => {
            openItemDrawer(item.id, {
              trigger,
              onChanged: () => {
                load();
                options.context?.refresh?.();
              },
            });
          },
        }),
        footer: [
          button("Buka inventaris", {
            iconName: "package",
            onClick: () => {
              void closeModal({ force: true });
              const query = new URLSearchParams({
                active: "true",
                ...(meta.filters.stock_status && meta.filters.stock_status !== "all"
                  ? { stock_status: meta.filters.stock_status }
                  : {}),
              });
              if (typeof options.context?.navigate === "function") {
                options.context.navigate("inventory", Object.fromEntries(query));
              } else {
                window.location.hash = `#/inventory?${query.toString()}`;
              }
            },
          }),
        ],
      });
    } catch (error) {
      if (error?.name === "AbortError" || destroyed) {
        return;
      }
      updateModal({
        title: meta.label,
        description: "Data tidak dapat dimuat.",
        body: createErrorState(error, load),
        footer: [],
      });
    }
  };

  load();
}

function renderMetricWindowBody(meta, state) {
  const shell = element("div", { className: "dashboard-metric-window" });
  shell.append(
    element("header", {
      className: "dashboard-metric-window-header",
      children: [
        element("span", {
          className: [
            "summary-icon",
            meta.tone ? `summary-icon-${meta.tone}` : "",
            "dashboard-metric-window-icon",
          ],
          children: [icon(meta.iconName)],
        }),
        element("div", {
          children: [
            element("strong", {
              className: "dashboard-metric-window-count number",
              text: formatNumber(
                state.pagination.total > 0
                  ? state.pagination.total
                  : state.summaryValue ?? state.items.length,
              ),
            }),
            element("p", {
              className: "muted",
              text: meta.description,
            }),
          ],
        }),
      ],
    }),
  );

  if (!state.items.length) {
    shell.append(
      createEmptyState({
        iconName: meta.iconName,
        title: meta.emptyTitle,
        message: meta.emptyMessage,
      }),
    );
    return shell;
  }

  const table = element("table", {
    className: "data-table",
    attributes: { "aria-label": `Daftar ${meta.label.toLowerCase()}` },
  });
  table.append(
    element("thead", {
      children: [
        element("tr", {
          children: ["Nama barang", "Kategori", "Lokasi", "Satuan", "Stok"].map(
            (label) =>
              element("th", {
                className: label === "Stok" ? "align-right" : "align-left",
                text: label,
              }),
          ),
        }),
      ],
    }),
    element("tbody", {
      children: state.items.map((item) => createMetricItemRow(item, state.onItemOpen)),
    }),
  );

  shell.append(
    element("div", {
      className: "dashboard-metric-table-wrap",
      children: [element("div", { className: "table-scroll", children: [table] })],
    }),
    createDataTableFooter({
      pagination: state.pagination,
      pageSize: state.pagination.pageSize || 25,
      onPageChange: state.onPageChange,
      onPageSizeChange: state.onPageSizeChange,
    }),
  );
  return shell;
}

function createMetricItemRow(item, onOpen) {
  const status = stockStatusPresentation(item);
  const row = element("tr", {
    className: "row-clickable",
    attributes: {
      tabindex: "0",
      role: "button",
      "aria-label": `Buka detail ${item.name}`,
    },
  });
  const open = () => onOpen?.(item, row);
  row.addEventListener("click", open);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  row.append(
    element("td", {
      className: "align-left",
      children: [
        element("span", { className: "cell-primary", text: item.name }),

      ],
    }),
    element("td", { className: "align-left", text: getCategoryName(item) }),
    element("td", { className: "align-left", text: getLocationName(item) }),
    element("td", { className: "align-left", text: item.unit || "—" }),
    element("td", {
      className: ["align-right", "numeric", "number"],
      children: [
        element("span", {
          className: ["stock-cell", status.className],
          attributes: { title: status.label },
          children: [element("strong", { text: formatNumber(item.current_stock) })],
        }),
      ],
    }),
  );
  return row;
}

