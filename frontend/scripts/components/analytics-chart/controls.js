import { element } from "../../utils/dom.js";

export function createLocalControls(chartId, filters, onChange) {
  const controls = [];
  if (
    [
      "stock-movement-ranking",
      "inventory-movement-velocity",
      "top-value-items",
      "stock-vs-minimum",
      "outgoing-pareto",
    ].includes(chartId)
  ) {
    if (["stock-movement-ranking", "inventory-movement-velocity", "top-value-items"].includes(chartId)) {
      controls.push(
        selectControl(
          "Peringkat",
          [
            ["highest", "Tertinggi"],
            ["lowest", "Terendah"],
          ],
          filters.ranking || "highest",
          (value) => onChange({ ranking: value }),
        ),
      );
    }
    controls.push(
      selectControl(
        "Jumlah",
        [
          ["5", "Top 5"],
          ["10", "Top 10"],
          ["15", "Top 15"],
          ["20", "Top 20"],
        ],
        String(filters.top_n || 10),
        (value) => onChange({ top_n: Number(value) }),
      ),
    );
  }
  if (chartId === "stock-movement-ranking") {
    controls.push(
      selectControl(
        "Pergerakan",
        [
          ["both", "Masuk dan keluar"],
          ["in", "Barang masuk"],
          ["out", "Barang keluar"],
        ],
        filters.movement_scope || "both",
        (value) => onChange({ movement_scope: value }),
      ),
    );
  }
  if (chartId === "stock-movement-trend") {
    controls.push(
      selectControl(
        "Agregasi",
        [
          ["daily", "Harian"],
          ["weekly", "Mingguan"],
          ["monthly", "Bulanan"],
        ],
        filters.aggregation || "daily",
        (value) => onChange({ aggregation: value }),
      ),
      selectControl(
        "Garis bersih",
        [
          ["false", "Sembunyikan"],
          ["true", "Tampilkan"],
        ],
        String(Boolean(filters.show_net)),
        (value) => onChange({ show_net: value === "true" }),
      ),
    );
  }
  if (["stock-by-category", "stock-by-location"].includes(chartId)) {
    controls.push(
      selectControl(
        "Metrik",
        [
          ["quantity", "Total kuantitas"],
          ["items", "Jumlah jenis barang"],
          ["percentage", "Persentase stok"],
        ],
        filters.metric || "quantity",
        (value) => onChange({ metric: value }),
      ),
    );
  }
  if (chartId === "inventory-movement-velocity") {
    controls.push(
      selectControl(
        "Klasifikasi",
        [
          ["all", "Semua klasifikasi"],
          ["fast", "Cepat bergerak"],
          ["medium", "Sedang"],
          ["slow", "Lambat bergerak"],
          ["none", "Tidak bergerak"],
        ],
        ["all", "fast", "medium", "slow", "none"].includes(filters.metric)
          ? filters.metric
          : "all",
        (value) => onChange({ metric: value }),
      ),
    );
  }
  if (!controls.length) {
    return null;
  }
  return element("div", { className: "chart-control-row", children: controls });
}

function selectControl(label, options, value, onChange) {
  const select = element("select", {
    className: "filter-control",
    attributes: { "aria-label": label },
    events: { change: (event) => onChange(event.currentTarget.value) },
    children: options.map(([optionValue, optionLabel]) =>
      element("option", {
        text: optionLabel,
        attributes: { value: optionValue },
        properties: { selected: String(optionValue) === String(value) },
      }),
    ),
  });
  return element("label", {
    className: "compact-field",
    children: [element("span", { text: label }), select],
  });
}
