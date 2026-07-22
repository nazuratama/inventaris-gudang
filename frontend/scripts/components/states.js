import { button, element, icon } from "../utils/dom.js";

export function createPageLoading(cardCount = 4) {
  const cards = element("div", { className: "summary-grid" });
  for (let index = 0; index < cardCount; index += 1) {
    cards.append(
      element("div", {
        className: ["card", "summary-card"],
        children: [
          element("span", { className: ["summary-icon", "skeleton"] }),
          element("div", {
            className: "loading-state",
            children: [
              element("span", { className: ["skeleton", "skeleton-line", "skeleton-line-short"] }),
              element("span", { className: ["skeleton", "skeleton-line"] }),
            ],
          }),
        ],
      }),
    );
  }

  return element("div", {
    className: ["page-container", "page-stack"],
    attributes: { "aria-busy": "true", "aria-label": "Memuat data" },
    children: [
      cards,
      element("section", {
        className: "card",
        children: [
          element("div", {
            className: "loading-state",
            children: Array.from({ length: 7 }, (_, index) =>
              element("span", {
                className: [
                  "skeleton",
                  "skeleton-line",
                  index % 3 === 0 ? "skeleton-line-short" : "",
                ],
              }),
            ),
          }),
        ],
      }),
    ],
  });
}

export function createTableLoading(columns = 6, rows = 7) {
  const body = element("tbody");
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = element("tr");
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      row.append(
        element("td", {
          children: [
            element("span", {
              className: [
                "skeleton",
                "skeleton-line",
                columnIndex % 3 === 1 ? "skeleton-line-short" : "",
              ],
            }),
          ],
        }),
      );
    }
    body.append(row);
  }
  return body;
}

export function createEmptyState(options = {}) {
  return element("div", {
    className: "empty-state",
    children: [
      element("div", {
        className: "empty-state-content",
        children: [
          element("span", {
            className: "empty-state-icon",
            children: [icon(options.iconName || "box-open")],
          }),
          element("h3", { text: options.title || "Belum ada data" }),
          element("p", {
            text: options.message || "Data akan muncul di sini setelah tersedia.",
          }),
          options.actionLabel
            ? button(options.actionLabel, {
                variant: options.actionVariant || "button-primary",
                iconName: options.actionIcon || "plus",
                onClick: options.onAction,
                requiresConnection: options.requiresConnection,
              })
            : null,
        ],
      }),
    ],
  });
}

export function createErrorState(error, retry) {
  return createEmptyState({
    iconName: "alert-triangle",
    title: "Data belum dapat dimuat",
    message: error?.message || "Terjadi gangguan saat mengambil data dari server lokal.",
    actionLabel: retry ? "Muat ulang" : null,
    actionIcon: "refresh",
    onAction: retry,
  });
}

export function createInlineAlert(options = {}) {
  const tone = options.tone || "neutral";
  return element("div", {
    className: ["inline-alert", tone !== "neutral" ? `inline-alert-${tone}` : ""],
    attributes: { role: tone === "danger" ? "alert" : "status" },
    children: [
      icon(options.iconName || (tone === "danger" ? "alert-triangle" : "info")),
      element("div", {
        children: [
          options.title ? element("strong", { text: options.title }) : null,
          element("span", { text: options.message || "" }),
        ],
      }),
    ],
  });
}
