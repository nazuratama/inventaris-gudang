import { openItemDrawer } from "../item-drawer.js";
import { createEmptyState } from "../states.js";
import { getItemName } from "../../utils/data.js";
import { button, element, icon } from "../../utils/dom.js";
import { formatNumber, formatTime } from "../../utils/formatting.js";

export function renderDayMovements(movements) {
  const incoming = [];
  const outgoing = [];
  for (const movement of movements || []) {
    const type = String(movement.movement_type || movement.type || "").toUpperCase();
    if (type === "IN") {
      incoming.push(movement);
    } else if (type === "OUT") {
      outgoing.push(movement);
    }
  }

  const totalInQty = sumQuantity(incoming);
  const totalOutQty = sumQuantity(outgoing);

  if (!incoming.length && !outgoing.length) {
    return element("div", {
      className: "calendar-day-movements-empty",
      children: [
        createEmptyState({
          iconName: "history",
          title: "Tidak ada pergerakan",
          message: "Belum ada barang masuk atau keluar pada tanggal ini.",
        }),
      ],
    });
  }

  return element("div", {
    className: "calendar-day-movements",
    children: [
      element("div", {
        className: "calendar-day-move-summary",
        children: [
          summaryPill("Masuk", incoming.length, totalInQty, "success"),
          summaryPill("Keluar", outgoing.length, totalOutQty, "warning"),
        ],
      }),
      element("div", {
        className: "calendar-day-movements-grid",
        children: [
          renderMovementGroup({
            title: "Barang masuk",
            tone: "success",
            iconName: "arrow-up",
            emptyText: "Tidak ada barang masuk.",
            items: incoming,
          }),
          renderMovementGroup({
            title: "Barang keluar",
            tone: "warning",
            iconName: "arrow-down",
            emptyText: "Tidak ada barang keluar.",
            items: outgoing,
          }),
        ],
      }),
    ],
  });
}

function summaryPill(label, count, qty, tone) {
  return element("div", {
    className: ["calendar-day-summary-pill", `is-${tone}`],
    children: [
      element("span", { className: "calendar-day-summary-label", text: label }),
      element("strong", {
        className: "number",
        text: formatNumber(count),
      }),
      element("small", {
        className: "subtle",
        text: `${formatNumber(qty)} unit · ${formatNumber(count)} trx`,
      }),
    ],
  });
}

function renderMovementGroup({ title, tone, iconName, emptyText, items }) {
  return element("section", {
    className: ["calendar-day-move-group", `is-${tone}`],
    children: [
      element("header", {
        className: "calendar-day-move-group-head",
        children: [
          element("span", {
            className: [
              "movement-icon",
              tone === "success" ? "movement-in" : "movement-out",
            ],
            children: [icon(iconName)],
          }),
          element("div", {
            className: "calendar-day-move-group-title",
            children: [
              element("strong", { text: title }),
              element("small", {
                className: "subtle",
                text: `${formatNumber(items.length)} transaksi`,
              }),
            ],
          }),
        ],
      }),
      items.length
        ? element("div", {
            className: "calendar-day-move-list",
            children: items.map((movement) => createMovementRow(movement)),
          })
        : element("p", { className: "muted calendar-day-empty", text: emptyText }),
    ],
  });
}

function createMovementRow(movement) {
  const type = String(movement.movement_type || movement.type || "").toUpperCase();
  const quantity =
    type === "IN"
      ? `+${formatNumber(movement.quantity)}`
      : `−${formatNumber(movement.quantity)}`;
  const itemId = movement.item_id || movement.item?.id;
  return element(itemId ? "button" : "div", {
    className: ["calendar-day-move-item", itemId ? "is-clickable" : null],
    attributes: itemId
      ? {
          type: "button",
          "aria-label": `Buka riwayat ${getItemName(movement)}`,
        }
      : undefined,
    events: itemId
      ? {
          click: (event) => {
            openItemDrawer(itemId, {
              trigger: event.currentTarget,
            });
          },
        }
      : undefined,
    children: [
      element("div", {
        className: "list-copy",
        children: [
          element("strong", { text: getItemName(movement) }),
          element("small", {
            text: [
              formatTime(movement.created_at),
              movement.unit || movement.item?.unit || null,
              movement.note || null,
            ]
              .filter(Boolean)
              .join(" · "),
          }),
        ],
      }),
      element("div", {
        className: "calendar-day-move-meta",
        children: [
          element("span", {
            className: [
              "number",
              "calendar-day-move-qty",
              type === "IN" ? "movement-quantity-in" : "movement-quantity-out",
            ],
            text: quantity,
          }),
          element("small", {
            className: "subtle",
            text: `stok ${formatNumber(movement.stock_after)}`,
            attributes: { title: "Stok sesudah transaksi" },
          }),
        ],
      }),
    ],
  });
}

function sumQuantity(items) {
  return items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
}

export function legendItem(dotClass, text) {
  return element("span", {
    className: "dashboard-calendar-legend-item",
    children: [
      element("i", { className: `dot ${dotClass}` }),
      element("span", { text }),
    ],
  });
}

export function navButton(label, iconName, onClick, extraClass = "") {
  return button("", {
    className: [
      "button-quiet",
      "button-compact",
      "dashboard-calendar-nav",
      extraClass,
    ].filter(Boolean),
    iconName,
    ariaLabel: label,
    title: label,
    onClick,
  });
}

