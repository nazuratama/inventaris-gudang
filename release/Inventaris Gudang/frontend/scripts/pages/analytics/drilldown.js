import { openItemDrawer } from "../../components/item-drawer.js";
import { closeModal, openModal } from "../../components/modal.js";
import { element, icon } from "../../utils/dom.js";
import { formatNumber } from "../../utils/formatting.js";

export function drillDown(row, context, chartMeta) {
  if (!row) {
    return;
  }

  // Group / segment drilldown with an item list in a floating modal.
  if (row.drill_kind === "items" || Array.isArray(row.items)) {
    openItemGroupModal(row, context, chartMeta);
    return;
  }

  // Single item point → open floating item detail (drawer), stay on analytics.
  if (row.item_id) {
    openItemDrawer(row.item_id, {
      onChanged: context.refresh,
    });
  }
}

function openItemGroupModal(row, context, chartMeta) {
  const items = row.items || [];
  const title =
    row.group_label ||
    row.category ||
    row.location ||
    row.risk_status ||
    row.abc_class ||
    "Detail grup";
  const eyebrow = chartMeta?.title || groupEyebrow(row.key_field);
  const description = buildGroupDescription(row, items.length);

  openModal({
    size: "wide",
    eyebrow,
    title,
    description,
    body: items.length
      ? element("div", {
          className: "drilldown-body",
          children: [
            element("div", {
              className: "drilldown-meta",
              children: [
                metaChip("Jumlah barang", formatNumber(items.length)),
                row.total_stock != null
                  ? metaChip("Total stok", formatNumber(row.total_stock))
                  : null,
                row.item_count != null && Number(row.item_count) !== items.length
                  ? metaChip("Jenis di grup", formatNumber(row.item_count))
                  : null,
                row.percentage != null
                  ? metaChip("Porsi", `${formatNumber(row.percentage)}%`)
                  : null,
              ].filter(Boolean),
            }),
            element("div", {
              className: "catalog-list drilldown-catalog",
              children: items.map((item) => createItemDrilldownRow(item, context)),
            }),
          ],
        })
      : emptyDrilldown("Tidak ada barang pada segmen ini untuk filter aktif."),
    footer: [],
  });
}

function createItemDrilldownRow(item, context) {
  const stockQty = item.current_stock ?? item.quantity ?? 0;
  const unit = String(item.unit || "").trim();
  const stockText = unit
    ? `${formatNumber(stockQty)} ${unit}`
    : formatNumber(stockQty);
  const secondary = [

    item.category || null,
    item.location || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const metricLines = [];
  metricLines.push(
    element("span", {
      className: "drilldown-item-stock",
      text: stockText || "—",
      attributes: { title: stockText },
    }),
  );

  if (item.outgoing != null) {
    metricLines.push(
      element("span", {
        className: "drilldown-item-sub",
        text: `Keluar ${formatNumber(item.outgoing)}`,
      }),
    );
  } else if (item.incoming != null) {
    metricLines.push(
      element("span", {
        className: "drilldown-item-sub",
        text: `Masuk ${formatNumber(item.incoming)}`,
      }),
    );
  }

  if (item.risk_status) {
    metricLines.push(
      element("span", {
        className: [
          "drilldown-item-badge",
          riskBadgeTone(item.risk_status),
        ],
        text: item.risk_status,
      }),
    );
  } else if (item.abc_class) {
    metricLines.push(
      element("span", {
        className: "drilldown-item-badge",
        text: `Kelas ${item.abc_class}`,
      }),
    );
  }

  return element("button", {
    className: "catalog-item drilldown-item",
    attributes: { type: "button" },
    events: {
      click: async () => {
        if (!item.item_id) {
          return;
        }
        await closeModal({ force: true });
        openItemDrawer(item.item_id, {
          onChanged: context.refresh,
        });
      },
    },
    children: [
      element("span", {
        className: "movement-icon movement-adjustment",
        children: [icon("package")],
      }),
      element("div", {
        className: "list-copy",
        children: [
          element("strong", {
            text: item.item_name || "Tanpa nama",
            attributes: { title: item.item_name || "Tanpa nama" },
          }),
          element("small", { text: secondary || "—" }),
        ],
      }),
      element("div", {
        className: "list-value",
        children: metricLines,
      }),
    ],
  });
}

function riskBadgeTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("habis") || value.includes("kritis")) {
    return "drilldown-item-badge-danger";
  }
  if (value.includes("menipis") || value.includes("rendah")) {
    return "drilldown-item-badge-warning";
  }
  if (value.includes("aman") || value.includes("normal")) {
    return "drilldown-item-badge-success";
  }
  return null;
}

function metaChip(label, value) {
  return element("div", {
    className: "drilldown-meta-chip",
    children: [
      element("span", { text: label }),
      element("strong", { text: value }),
    ],
  });
}

function emptyDrilldown(message) {
  return element("p", {
    className: "muted",
    text: message,
  });
}

function groupEyebrow(keyField) {
  const map = {
    category: "Barang per kategori",
    location: "Barang per lokasi",
    risk_status: "Barang per status risiko",
    abc_class: "Barang per kelas ABC",
  };
  return map[keyField] || "Detail grafik";
}

function buildGroupDescription(row, count) {
  const parts = [
    `${formatNumber(count)} barang ditampilkan dari segmen yang dipilih.`,
    "Klik baris untuk membuka detail barang tanpa meninggalkan analitik.",
  ];
  if (row.key_field === "location") {
    parts.unshift("Daftar inventaris pada lokasi penyimpanan ini.");
  } else if (row.key_field === "category") {
    parts.unshift("Daftar inventaris pada kategori ini.");
  } else if (row.key_field === "risk_status") {
    parts.unshift("Barang dengan status risiko yang sama.");
  } else if (row.key_field === "abc_class") {
    parts.unshift("Barang dalam kelas nilai persediaan ini.");
  }
  return parts.join(" ");
}
