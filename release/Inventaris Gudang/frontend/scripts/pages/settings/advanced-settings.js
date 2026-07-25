import {
  clearAnalyticsCache,
  restoreAnalyticsDefaults,
  updateAnalyticsSettings,
} from "../../api/analytics-api.js";
import { createFormField } from "../../components/forms.js";
import { closeModal, confirmAction, openModal } from "../../components/modal.js";
import { showApiError, showToast } from "../../components/toast.js";
import { appState } from "../../state/app-state.js";
import { badge, button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import { configureFormatting } from "../../utils/formatting.js";

export const ANALYTICS_CHART_LABELS = {
  "stock-movement-ranking": "Peringkat masuk & keluar",
  "stock-movement-trend": "Tren masuk & keluar",
  "stock-by-category": "Stok per kategori",
  "stock-by-location": "Stok per lokasi",
  "inventory-movement-velocity": "Barang cepat & lambat bergerak",
  "stock-treemap": "Peta hierarki stok",
  "movement-by-category": "Pergerakan per kategori",
  "movement-heatmap": "Peta panas aktivitas harian",
  "risk-funnel": "Corong status risiko stok",
  "stock-vs-minimum": "Stok vs batas minimum",
  "outgoing-pareto": "Pareto barang keluar",
  "monthly-net-flow": "Aliran bersih bulanan",
  "stock-health-gauge": "Indeks kesehatan stok",
};

export function createAdvancedSettingsCard(settings, context) {
  const enabledCount = Object.values(settings.chart_visibility || {}).filter(Boolean).length;
  return element("section", {
    className: ["card", "feature-spotlight-card"],
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Pengaturan lanjutan" }),
              element("p", { text: "Grafik, ambang stok, dan performa analitik" }),
            ],
          }),
          badge(settings.analytics_enabled ? "Aktif" : "Nonaktif", settings.analytics_enabled ? "success" : "neutral"),
        ],
      }),
      element("div", {
        className: "card-body page-stack",
        children: [
          element("div", {
            className: "feature-spotlight-lead",
            children: [
              element("span", {
                className: "summary-icon",
                children: [icon("chart")],
              }),
              element("div", {
                children: [
                  element("strong", { text: "Preferensi analitik" }),
                  element("p", {
                    className: "muted",
                    text: "Pilih grafik yang tampil, atur batas stok minimum, dan kelola cache.",
                  }),
                ],
              }),
            ],
          }),
          element("div", {
            className: "system-status-list",
            children: [
              settingSummaryRow(
                "Grafik aktif",
                `${enabledCount} dari ${Object.keys(ANALYTICS_CHART_LABELS).length}`,
              ),
              settingSummaryRow(
                "Grafik unggulan",
                ANALYTICS_CHART_LABELS[settings.featured_chart] || settings.featured_chart,
              ),
              settingSummaryRow("Rentang awal", settings.default_date_range),
            ],
          }),
          button("Buka Pengaturan Lanjutan", {
            variant: "button-primary",
            iconName: "settings",
            onClick: (event) =>
              openAdvancedSettings(settings, context, event.currentTarget),
          }),
        ],
      }),
    ],
  });
}

export function settingSummaryRow(label, value) {
  const text = String(value ?? "—");
  return element("div", {
    className: "settings-summary-row",
    children: [
      element("span", { className: "settings-summary-label", text: label }),
      element("strong", {
        className: "settings-summary-value",
        text,
        attributes: { title: text },
      }),
    ],
  });
}

export function buildAdvancedSettingsForm(settings, context, hooks = {}) {
  const form = element("form", {
    className: "advanced-settings-panel",
    attributes: { novalidate: true },
  });
  const master = settingsSection("Analitik utama", "Pengaturan dasar halaman Analitik", [
    switchField("analytics_enabled", "Aktifkan analitik", settings.analytics_enabled),
    selectField(
      "featured_chart",
      "Grafik unggulan di Dasbor",
      Object.entries(ANALYTICS_CHART_LABELS),
      settings.featured_chart,
    ),
    selectField(
      "default_date_range",
      "Rentang waktu awal",
      [
        ["7d", "7 hari"],
        ["30d", "30 hari"],
        ["90d", "90 hari"],
        ["12m", "12 bulan"],
        ["all", "Semua data"],
      ],
      settings.default_date_range,
    ),
    selectField(
      "default_aggregation",
      "Pengelompokan waktu",
      [
        ["daily", "Harian"],
        ["weekly", "Mingguan"],
        ["monthly", "Bulanan"],
      ],
      settings.default_aggregation,
    ),
    selectField(
      "default_top_n",
      "Jumlah peringkat",
      [["5", "5 teratas"], ["10", "10 teratas"], ["15", "15 teratas"], ["20", "20 teratas"]],
      settings.default_top_n,
    ),
    switchField("refresh_enabled", "Perbarui otomatis", settings.refresh_enabled),
    numberField(
      "refresh_interval_seconds",
      "Interval perbarui (detik)",
      settings.refresh_interval_seconds,
      30,
      3600,
    ),
    switchField(
      "include_zero_movement",
      "Tampilkan barang tanpa transaksi",
      settings.include_zero_movement,
    ),
  ]);

  const visibility = settingsSection(
    "Grafik yang ditampilkan",
    "Minimal satu grafik harus tetap aktif.",
    Object.entries(ANALYTICS_CHART_LABELS).map(([chartId, label]) =>
      switchField(
        `chart_${chartId}`,
        label,
        Boolean(settings.chart_visibility?.[chartId]),
      ),
    ),
    true,
  );

  const appearance = settingsSection("Tampilan grafik", "Gaya visual yang nyaman dibaca", [
    numberField("chart_height", "Tinggi grafik (px)", settings.chart_height, 260, 720),
    selectField(
      "spacing",
      "Kerapatan layout",
      [["compact", "Ringkas"], ["comfortable", "Nyaman"]],
      settings.spacing,
    ),
    selectField(
      "palette",
      "Palet warna",
      [["professional", "Profesional"], ["colorblind", "Ramah buta warna"]],
      settings.palette,
    ),
    selectField(
      "legend_position",
      "Posisi legenda",
      [["top", "Atas"], ["bottom", "Bawah"], ["right", "Kanan"], ["hidden", "Sembunyikan"]],
      settings.legend_position,
    ),
    numberField("decimal_precision", "Angka desimal", settings.decimal_precision, 0, 3),
    switchField("show_data_labels", "Tampilkan angka di grafik", settings.show_data_labels),
    switchField("show_units", "Tampilkan satuan di tooltip", settings.show_units),
    switchField("animations_enabled", "Animasi grafik", settings.animations_enabled),
    switchField("reduced_motion", "Kurangi animasi", settings.reduced_motion),
    switchField("png_export_enabled", "Izinkan unduh gambar PNG", settings.png_export_enabled),
    switchField("data_export_enabled", "Izinkan unduh data tabel", settings.data_export_enabled),
  ]);

  const movement = settingsSection("Pergerakan stok", "Klasifikasi barang cepat dan lambat", [
    numberField("fast_percentile", "Ambang cepat (%)", settings.fast_percentile, 5, 40),
    numberField("slow_percentile", "Ambang lambat (%)", settings.slow_percentile, 10, 60),
    numberField(
      "no_movement_days",
      "Hari tanpa keluar (stagnan)",
      settings.no_movement_days,
      1,
      3650,
    ),
    selectField(
      "movement_default_period",
      "Periode analisis awal",
      [["30d", "30 hari"], ["90d", "90 hari"], ["12m", "12 bulan"], ["all", "Semua data"]],
      settings.movement_default_period,
    ),
    switchField("returns_as_incoming", "Hitung retur sebagai masuk", settings.returns_as_incoming),
  ]);

  const risk = settingsSection("Risiko stok", "Batas stok minimum gudang", [
    numberField(
      "default_minimum_stock",
      "Batas stok minimum",
      settings.default_minimum_stock,
      0,
      1000000,
      0.001,
    ),
    numberField(
      "critical_stock_percentage",
      "Ambang kritis (% dari minimum)",
      settings.critical_stock_percentage,
      1,
      100,
    ),
    switchField("risk_include_zero", "Sertakan stok habis", settings.risk_include_zero),
    selectField(
      "risk_grouping",
      "Kelompokkan risiko",
      [["category", "Per kategori"], ["item", "Per barang"]],
      settings.risk_grouping,
    ),
  ]);

  // Performance only — UI/app options live in Tampilan; backup retention in Sistem.
  const performance = settingsSection("Performa", "Cache dan batas render grafik", [
    numberField("cache_seconds", "Durasi cache (detik)", settings.cache_seconds, 5, 600),
    numberField(
      "maximum_ranking_size",
      "Maks. baris peringkat",
      settings.maximum_ranking_size,
      5,
      100,
    ),
    numberField("table_row_limit", "Batas baris tabel detail", settings.table_row_limit, 10, 500),
    switchField("lazy_rendering", "Muat grafik bertahap", settings.lazy_rendering),
    element("div", {
      className: "settings-inline-action",
      children: [
        button("Bersihkan cache analitik", {
          iconName: "refresh",
          className: "button-secondary",
          requiresConnection: true,
          onClick: async (event) => {
            await runWithButtonBusy(event.currentTarget, "Membersihkan…", async () => {
              try {
                await clearAnalyticsCache();
                showToast({
                  type: "success",
                  title: "Cache analitik dibersihkan",
                  message: "Permintaan grafik berikutnya memakai agregasi terbaru.",
                });
              } catch (error) {
                showApiError(error, "Cache belum dapat dibersihkan");
              }
            });
          },
        }),
      ],
    }),
  ]);

  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        ...(hooks.leadingSections || []),
        master,
        visibility,
        appearance,
        movement,
        risk,
        performance,
      ],
    }),
  );
  const saveButton = button("Simpan analitik", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    onClick: () => form.requestSubmit(),
  });
  const restoreButton = button("Pulihkan default", {
    iconName: "restore",
    className: "button-quiet",
    onClick: async () => {
      const confirmed = await confirmAction({
        eyebrow: "Pulihkan pengaturan",
        title: "Kembalikan seluruh pengaturan analitik?",
        message:
          "Preferensi analitik, tampilan, risiko, performa, dan umum akan kembali ke nilai awal.",
        confirmLabel: "Pulihkan",
      });
      if (!confirmed) {
        return;
      }
      try {
        const restored = await restoreAnalyticsDefaults();
        if (appState.get("session")) {
          appState.set("session", {
            ...appState.get("session"),
            inventory_page_size: restored.inventory_page_size,
            item_detail_behavior: restored.item_detail_behavior,
            show_demo_indicator: false,
            date_format: restored.date_format,
            currency: "IDR",
            default_minimum_stock: restored.default_minimum_stock,
          });
          configureFormatting(restored);
        }
        showToast({
          type: "success",
          title: "Pengaturan dipulihkan",
          message: "Nilai awal analitik kembali diterapkan.",
        });
        if (hooks.embedded) {
          hooks.onSaved?.(restored);
          context.refresh();
        } else {
          await closeModal({ force: true });
          context.refresh();
        }
      } catch (error) {
        showApiError(error, "Pengaturan belum dapat dipulihkan");
      }
    },
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = buildAdvancedSettingsPayload(form, settings);
    await runWithButtonBusy(saveButton, "Menyimpan…", async () => {
      try {
        const result = await updateAnalyticsSettings(payload);
        if (appState.get("session")) {
          appState.set("session", {
            ...appState.get("session"),
            inventory_page_size: result.inventory_page_size,
            item_detail_behavior: result.item_detail_behavior,
            show_demo_indicator: false,
            date_format: result.date_format,
            currency: "IDR",
            default_minimum_stock: result.default_minimum_stock,
          });
          configureFormatting(result);
        }
        showToast({
          type: "success",
          title: "Pengaturan analitik disimpan",
          message:
            result.featured_chart !== settings.featured_chart
              ? "Grafik unggulan disesuaikan dengan grafik yang masih aktif."
              : "Perubahan langsung diterapkan pada ruang kerja analitik.",
        });
        if (hooks.embedded) {
          hooks.onSaved?.(result);
          context.refresh();
        } else {
          await closeModal({ force: true });
          context.refresh();
        }
      } catch (error) {
        showApiError(error, "Pengaturan analitik belum tersimpan");
      }
    });
  });

  return { form, saveButton, restoreButton };
}

function openAdvancedSettings(settings, context, trigger) {
  const { form, saveButton, restoreButton } = buildAdvancedSettingsForm(settings, context, {
    embedded: false,
  });
  const cancelButton = button("Batal", { onClick: () => closeModal() });
  const dialogEl = document.getElementById("appDialog");
  dialogEl?.classList.add("advanced-settings-dialog");
  openModal({
    size: "large",
    eyebrow: "Pengaturan Lanjutan",
    title: "Analitik dan preferensi operasional",
    description: "Seluruh nilai disimpan di SQLite lokal dan berlaku tanpa internet.",
    body: form,
    footer: [
      element("div", {
        className: "modal-footer-start",
        children: [restoreButton],
      }),
      element("div", {
        className: "modal-footer-end",
        children: [cancelButton, saveButton],
      }),
    ],
    returnFocus: trigger,
    onClose: () => {
      dialogEl?.classList.remove("advanced-settings-dialog");
    },
  });
}

export function settingsSection(title, description, children, wide = false) {
  return element("section", {
    className: [
      "advanced-settings-section",
      wide ? "advanced-settings-section-wide" : null,
    ],
    children: [
      element("header", {
        className: "advanced-settings-section-header",
        children: [
          element("h3", { text: title }),
          element("p", { text: description }),
        ],
      }),
      element("div", {
        className: "advanced-settings-section-body advanced-settings-fields",
        children,
      }),
    ],
  });
}

export function selectField(name, label, options, value) {
  return createFormField({
    name,
    label,
    type: "select",
    value,
    compact: true,
    options: options.map(([optionValue, optionLabel]) => ({
      value: optionValue,
      label: optionLabel,
    })),
  }).wrapper;
}

export function numberField(name, label, value, min, max, step = 1) {
  return createFormField({
    name,
    label,
    type: "number",
    value,
    min,
    max,
    step,
    compact: true,
    inputMode: step < 1 ? "decimal" : "numeric",
  }).wrapper;
}

export function switchField(name, label, checked) {
  const input = element("input", {
    className: "switch-input",
    attributes: {
      type: "checkbox",
      name,
      id: `advanced-${name}`,
      role: "switch",
    },
    properties: { checked: Boolean(checked) },
  });
  return element("label", {
    className: ["switch-row", "switch-row-compact", "form-field-wide"],
    children: [
      element("span", { className: "switch-label", text: label }),
      element("span", {
        className: "switch-control",
        children: [input, element("span", { className: "switch-track" })],
      }),
    ],
  });
}

function buildAdvancedSettingsPayload(form, settings = {}) {
  const has = (name) => Boolean(form.elements.namedItem(name));
  const value = (name, fallback) => {
    if (!has(name)) {
      return fallback;
    }
    const raw = form.elements.namedItem(name)?.value;
    return raw === undefined || raw === null || raw === "" ? fallback : raw;
  };
  const checked = (name, fallback = false) => {
    if (!has(name)) {
      return Boolean(fallback);
    }
    return Boolean(form.elements.namedItem(name)?.checked);
  };
  const number = (name, fallback) => {
    if (!has(name)) {
      return Number(fallback);
    }
    const parsed = Number(form.elements.namedItem(name)?.value);
    return Number.isFinite(parsed) ? parsed : Number(fallback);
  };
  const chartIds = Object.keys(ANALYTICS_CHART_LABELS);
  const chartVisibility = Object.fromEntries(
    chartIds.map((chartId) => [
      chartId,
      has(`chart_${chartId}`)
        ? checked(`chart_${chartId}`)
        : Boolean(settings.chart_visibility?.[chartId]),
    ]),
  );
  const savedOrder = Array.isArray(settings.chart_order) ? settings.chart_order : [];
  const chartOrder = [
    ...savedOrder.filter((chartId) => chartIds.includes(chartId)),
    ...chartIds.filter((chartId) => !savedOrder.includes(chartId)),
  ];
  // Fields owned by other tabs (Tampilan / Sistem) fall back to current settings.
  return {
    analytics_enabled: checked("analytics_enabled", settings.analytics_enabled),
    featured_chart: value("featured_chart", settings.featured_chart),
    refresh_enabled: checked("refresh_enabled", settings.refresh_enabled),
    refresh_interval_seconds: number(
      "refresh_interval_seconds",
      settings.refresh_interval_seconds,
    ),
    default_date_range: value("default_date_range", settings.default_date_range),
    default_aggregation: value("default_aggregation", settings.default_aggregation),
    default_top_n: number("default_top_n", settings.default_top_n),
    // Archiving was removed, so every product remains in scope.
    include_archived: true,
    // DEMO/REAL is no longer a product surface; always include all inventory rows.
    include_demo: true,
    include_zero_movement: checked("include_zero_movement", settings.include_zero_movement),
    show_data_labels: checked("show_data_labels", settings.show_data_labels),
    animations_enabled: checked("animations_enabled", settings.animations_enabled),
    reduced_motion: checked("reduced_motion", settings.reduced_motion),
    png_export_enabled: checked("png_export_enabled", settings.png_export_enabled),
    data_export_enabled: checked("data_export_enabled", settings.data_export_enabled),
    chart_visibility: chartVisibility,
    chart_order: chartOrder,
    chart_height: number("chart_height", settings.chart_height),
    spacing: value("spacing", settings.spacing),
    palette: value("palette", settings.palette),
    legend_position: value("legend_position", settings.legend_position),
    decimal_precision: number("decimal_precision", settings.decimal_precision),
    show_units: checked("show_units", settings.show_units),
    // Legacy keys kept for API compatibility (no longer shown in UI).
    modebar_visible: settings.modebar_visible ?? false,
    hover_mode: settings.hover_mode || "closest",
    classification_method: settings.classification_method || "percentile",
    fast_percentile: number("fast_percentile", settings.fast_percentile),
    slow_percentile: number("slow_percentile", settings.slow_percentile),
    no_movement_days: number("no_movement_days", settings.no_movement_days),
    movement_default_period: value(
      "movement_default_period",
      settings.movement_default_period,
    ),
    count_adjustments: false,
    returns_as_incoming: checked("returns_as_incoming", settings.returns_as_incoming),
    default_minimum_stock: number("default_minimum_stock", settings.default_minimum_stock),
    critical_stock_percentage: number(
      "critical_stock_percentage",
      settings.critical_stock_percentage,
    ),
    risk_include_zero: checked("risk_include_zero", settings.risk_include_zero),
    risk_include_archived: true,
    risk_grouping: value("risk_grouping", settings.risk_grouping),
    cache_seconds: number("cache_seconds", settings.cache_seconds),
    maximum_ranking_size: number("maximum_ranking_size", settings.maximum_ranking_size),
    lazy_rendering: checked("lazy_rendering", settings.lazy_rendering),
    table_row_limit: number("table_row_limit", settings.table_row_limit),
    // Owned by Tampilan tab:
    date_format: value("date_format", settings.date_format),
    currency: "IDR",
    inventory_page_size: number("inventory_page_size", settings.inventory_page_size),
    item_detail_behavior: value("item_detail_behavior", settings.item_detail_behavior),
    show_demo_indicator: false,
    include_demo: true,
    // Owned by Sistem tab:
    backup_debounce_seconds: number(
      "backup_debounce_seconds",
      settings.backup_debounce_seconds,
    ),
    daily_backup_retention_days: number(
      "daily_backup_retention_days",
      settings.daily_backup_retention_days,
    ),
    log_retention_days: number("log_retention_days", settings.log_retention_days),
    confirm_destructive_actions: checked(
      "confirm_destructive_actions",
      settings.confirm_destructive_actions,
    ),
  };
}
