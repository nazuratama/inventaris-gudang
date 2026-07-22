import { button, element } from "../utils/dom.js";
import { formatNumber } from "../utils/formatting.js";

export function createPagination(pagination, onPageChange) {
  const page = Math.max(1, Number(pagination.page) || 1);
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
  const container = element("nav", {
    className: "pagination",
    attributes: { "aria-label": "Navigasi halaman" },
  });

  const previous = button("", {
    iconName: "chevron-left",
    className: ["button-compact", "pagination-btn"],
    ariaLabel: "Halaman sebelumnya",
    disabled: page <= 1,
    onClick: () => onPageChange(page - 1),
  });
  const next = button("", {
    iconName: "chevron-right",
    className: ["button-compact", "pagination-btn"],
    ariaLabel: "Halaman berikutnya",
    disabled: page >= totalPages,
    onClick: () => onPageChange(page + 1),
  });

  container.append(
    previous,
    element("div", {
      className: "pagination-status",
      attributes: { "aria-live": "polite" },
      children: [
        element("span", { className: "pagination-status-label", text: "Halaman" }),
        element("strong", {
          className: "pagination-status-value",
          text: `${formatNumber(page)} / ${formatNumber(totalPages)}`,
        }),
      ],
    }),
    next,
  );
  return container;
}

export function paginationSummary(pagination) {
  const range = paginationRange(pagination);
  return range.text;
}

export function paginationRange(pagination) {
  const total = Number(pagination.total) || 0;
  const page = Math.max(1, Number(pagination.page) || 1);
  const pageSize = Math.max(1, Number(pagination.pageSize) || 25);
  if (total === 0) {
    return {
      empty: true,
      first: 0,
      last: 0,
      total: 0,
      text: "Tidak ada data",
    };
  }
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return {
    empty: false,
    first,
    last,
    total,
    text: `Menampilkan ${formatNumber(first)}–${formatNumber(last)} dari ${formatNumber(total)} data`,
  };
}

/**
 * Polished table footer for inventory / movements (and similar lists).
 */
export function createDataTableFooter({
  pagination,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
} = {}) {
  const range = paginationRange(pagination);
  const sizeSelect = element("select", {
    className: ["filter-control", "table-page-size"],
    attributes: { "aria-label": "Jumlah data per halaman" },
    events: {
      change: (event) => onPageSizeChange?.(Number(event.currentTarget.value)),
    },
  });
  for (const size of pageSizeOptions) {
    sizeSelect.append(
      element("option", {
        text: String(size),
        attributes: { value: String(size) },
        properties: { selected: Number(pageSize) === Number(size) },
      }),
    );
  }

  return element("footer", {
    className: ["table-footer", "table-footer-polished"],
    children: [
      element("div", {
        className: "table-footer-meta",
        children: [
          element("div", {
            className: ["table-footer-range", range.empty ? "is-empty" : null],
            children: range.empty
              ? [element("span", { className: "table-footer-range-text", text: range.text })]
              : [
                  element("span", {
                    className: "table-footer-range-label",
                    text: "Menampilkan",
                  }),
                  element("strong", {
                    className: "table-footer-range-value",
                    text: `${formatNumber(range.first)}–${formatNumber(range.last)}`,
                  }),
                  element("span", {
                    className: "table-footer-range-of",
                    text: "dari",
                  }),
                  element("strong", {
                    className: "table-footer-range-total",
                    text: formatNumber(range.total),
                  }),
                  element("span", {
                    className: "table-footer-range-unit",
                    text: "data",
                  }),
                ],
          }),
          element("label", {
            className: "table-footer-size",
            children: [
              element("span", { className: "table-footer-size-label", text: "Per halaman" }),
              sizeSelect,
            ],
          }),
        ],
      }),
      createPagination(pagination, (page) => onPageChange?.(page)),
    ],
  });
}
