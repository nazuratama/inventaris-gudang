import {
  deleteBrandingImage,
  updateSettings,
  uploadBrandingImage,
} from "../../api/settings-api.js";
import { updateAnalyticsSettings } from "../../api/analytics-api.js";
import { createFormField, getFormValues } from "../../components/forms.js";
import { confirmAction } from "../../components/modal.js";
import { showApiError, showToast } from "../../components/toast.js";
import { appState } from "../../state/app-state.js";
import { applyBranding, ownerInitials, readFileAsDataUrl } from "../../utils/branding.js";
import { button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import { configureFormatting, normalizeOptionalText } from "../../utils/formatting.js";
import {
  ANALYTICS_CHART_LABELS,
  buildAdvancedSettingsForm,
  numberField,
  selectField,
  settingsSection,
  settingSummaryRow,
} from "./advanced-settings.js";
import { settingsStack } from "./shared.js";

export function renderAccountSection(view, context, chrome) {
  const settings = view.settings || {};
  const ownerName = settings.owner_name || "Kanjeng Alfian Diningrat";
  const companyName = settings.company_name || "ALFAN TANI";
  const initials = ownerInitials(ownerName);

  const ownerPreview = element("div", {
    className: [
      "branding-preview-avatar",
      settings.owner_photo_url ? "has-image" : null,
    ],
  });
  if (settings.owner_photo_url) {
    ownerPreview.append(
      element("img", {
        className: "branding-preview-image",
        attributes: { src: settings.owner_photo_url, alt: "Foto pemilik" },
      }),
    );
  } else {
    ownerPreview.append(element("span", { text: initials }));
  }

  const logoPreview = element("div", {
    className: [
      "branding-preview-logo",
      settings.warehouse_logo_url ? "has-image" : null,
    ],
  });
  if (settings.warehouse_logo_url) {
    logoPreview.append(
      element("img", {
        className: "branding-preview-image",
        attributes: { src: settings.warehouse_logo_url, alt: "Logo gudang" },
      }),
    );
  } else {
    logoPreview.append(icon("warehouse"));
  }

  const ownerField = createFormField({
    name: "owner_name",
    label: "Nama pemilik",
    value: ownerName,
    placeholder: "Kanjeng Alfian Diningrat",
    maxLength: 150,
    compact: true,
    required: true,
  });
  const companyField = createFormField({
    name: "company_name",
    label: "Nama gudang",
    value: companyName,
    placeholder: "ALFAN TANI",
    maxLength: 150,
    compact: true,
  });

  const identityForm = element("form", {
    className: "advanced-settings-panel",
    attributes: { novalidate: true },
  });

  const identitySection = settingsSection(
    "Identitas",
    "Nama pemilik dan gudang yang tampil di sidebar.",
    [ownerField.wrapper, companyField.wrapper],
  );
  const brandingSection = settingsSection(
    "Foto & branding",
    "Foto pemilik (kiri bawah) dan logo gudang (kiri atas).",
    [
      createBrandingUploadRow({
        kind: "owner-photo",
        title: "Foto pemilik",
        description: "PNG, JPEG, atau WebP · maks. 1,5 MB.",
        preview: ownerPreview,
        hasImage: Boolean(settings.owner_photo_url),
        context,
      }),
      createBrandingUploadRow({
        kind: "warehouse-logo",
        title: "Logo gudang",
        description: "Mengganti ikon brand di sidebar.",
        preview: logoPreview,
        hasImage: Boolean(settings.warehouse_logo_url),
        context,
      }),
    ],
  );

  identityForm.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [identitySection, brandingSection],
    }),
  );

  const saveIdentity = button("Simpan identitas", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    onClick: () => identityForm.requestSubmit(),
  });

  identityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getFormValues(identityForm);
    const nextOwner = normalizeOptionalText(values.owner_name) || "";
    if (!nextOwner) {
      ownerField.input.setAttribute("aria-invalid", "true");
      ownerField.showError?.("Nama pemilik wajib diisi.");
      ownerField.input.focus();
      return;
    }
    ownerField.input.removeAttribute("aria-invalid");
    ownerField.showError?.("");
    await runWithButtonBusy(saveIdentity, "Menyimpan…", async () => {
      try {
        const result = await updateSettings({
          owner_name: nextOwner,
          company_name: normalizeOptionalText(values.company_name) || "",
        });
        syncBrandingToShell(result);
        showToast({
          type: "success",
          title: "Identitas disimpan",
          message: "Nama pemilik dan gudang diperbarui di antarmuka.",
        });
        context.refresh();
      } catch (error) {
        showApiError(error, "Identitas gagal disimpan");
      }
    });
  });

  chrome?.setFooter?.({ end: [saveIdentity] });
  return settingsStack(identityForm);
}

function syncBrandingToShell(settings) {
  const branded = applyBranding(settings || {});
  if (appState.get("session")) {
    appState.set("session", {
      ...appState.get("session"),
      company_name: branded.company_name,
      owner_name: branded.owner_name,
      owner_photo_url: branded.owner_photo_url,
      warehouse_logo_url: branded.warehouse_logo_url,
    });
  }
}

function createBrandingUploadRow({ kind, title, description, preview, hasImage, context }) {
  const fileInput = element("input", {
    attributes: {
      type: "file",
      accept: "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp",
      hidden: true,
    },
  });

  const uploadButton = button(hasImage ? "Ganti foto" : "Unggah foto", {
    className: "button-secondary",
    iconName: "upload",
    requiresConnection: true,
    onClick: () => fileInput.click(),
  });

  const removeButton = hasImage
    ? button("Hapus", {
        className: "button-quiet",
        iconName: "trash",
        requiresConnection: true,
        onClick: async () => {
          const confirmed = await confirmAction({
            eyebrow: "Branding",
            title: `Hapus ${title.toLowerCase()}?`,
            message: "Tampilan akan kembali ke ikon bawaan aplikasi.",
            confirmLabel: "Hapus",
            danger: true,
          });
          if (!confirmed) {
            return;
          }
          try {
            const result = await deleteBrandingImage(kind);
            syncBrandingToShell(result);
            showToast({
              type: "success",
              title: "Foto dihapus",
              message: `${title} dikembalikan ke bawaan.`,
            });
            context.refresh();
          } catch (error) {
            showApiError(error, "Foto belum dapat dihapus");
          }
        },
      })
    : null;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) {
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      showToast({
        type: "error",
        title: "Jenis file tidak didukung",
        message: "Gunakan PNG, JPEG, atau WebP.",
      });
      return;
    }
    if (file.size > 1_500_000) {
      showToast({
        type: "error",
        title: "File terlalu besar",
        message: "Maksimal 1,5 MB per foto.",
      });
      return;
    }
    await runWithButtonBusy(uploadButton, "Mengunggah…", async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const result = await uploadBrandingImage(kind, dataUrl, file.name);
        syncBrandingToShell(result);
        showToast({
          type: "success",
          title: "Foto tersimpan",
          message: `${title} langsung diterapkan di antarmuka.`,
        });
        context.refresh();
      } catch (error) {
        showApiError(error, "Foto belum dapat diunggah");
      }
    });
  });

  return element("div", {
    className: "branding-upload-row",
    children: [
      preview,
      element("div", {
        className: "branding-upload-copy",
        children: [
          element("strong", { text: title }),
          element("p", { className: "muted", text: description }),
          element("div", {
            className: "branding-upload-actions",
            children: [uploadButton, removeButton, fileInput].filter(Boolean),
          }),
        ],
      }),
    ],
  });
}

export function renderAppearanceSection(view, context, chrome) {
  // App UI only — chart visuals live exclusively under tab Analitik.
  const settings = view.analytics || {};
  const form = element("form", {
    className: "advanced-settings-panel",
    attributes: { novalidate: true, id: "appearanceSettingsForm" },
  });

  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        settingsSection("Antarmuka aplikasi", "Preferensi tampilan inventaris dan format data.", [
          selectField(
            "date_format",
            "Format tanggal",
            [
              ["DD MMM YYYY", "DD MMM YYYY"],
              ["DD/MM/YYYY", "DD/MM/YYYY"],
              ["YYYY-MM-DD", "YYYY-MM-DD"],
            ],
            settings.date_format,
          ),
          selectField(
            "inventory_page_size",
            "Baris per halaman",
            [
              ["25", "25"],
              ["50", "50"],
              ["100", "100"],
            ],
            settings.inventory_page_size,
          ),
          numberField(
            "default_minimum_stock",
            "Batas stok minimum (semua barang)",
            settings.default_minimum_stock ?? 10,
            0,
            1000000,
            0.001,
          ),
          selectField(
            "item_detail_behavior",
            "Detail barang",
            [
              ["drawer", "Panel samping"],
              ["modal", "Jendela mengambang"],
            ],
            settings.item_detail_behavior,
          ),
        ]),
      ],
    }),
  );

  const saveButton = button("Simpan tampilan", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    onClick: () => form.requestSubmit(),
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      ...settings,
      date_format: form.elements.namedItem("date_format")?.value || settings.date_format,
      currency: "IDR",
      inventory_page_size: Number(
        form.elements.namedItem("inventory_page_size")?.value || settings.inventory_page_size || 25,
      ),
      default_minimum_stock: Number(
        form.elements.namedItem("default_minimum_stock")?.value ??
          settings.default_minimum_stock ??
          10,
      ),
      item_detail_behavior:
        form.elements.namedItem("item_detail_behavior")?.value || settings.item_detail_behavior,
      show_demo_indicator: false,
      include_demo: true,
      count_adjustments: false,
    };
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
          title: "Tampilan disimpan",
          message:
            "Preferensi antarmuka langsung diterapkan. Warna stok di inventaris mengikuti batas minimum baru.",
        });
        context.refresh();
      } catch (error) {
        showApiError(error, "Tampilan belum tersimpan");
      }
    });
  });

  chrome?.setFooter?.({ end: [saveButton] });
  return settingsStack(form);
}

export function renderAnalyticsSection(view, context, chrome) {
  const settings = view.analytics || {};
  const enabledCount = Object.values(settings.chart_visibility || {}).filter(Boolean).length;
  const rangeLabels = {
    "7d": "7 hari",
    "30d": "30 hari",
    "90d": "90 hari",
    "12m": "12 bulan",
    all: "Semua data",
  };
  const summary = settingsSection(
    "Ringkasan",
    settings.analytics_enabled ? "Analitik aktif." : "Analitik nonaktif.",
    [
      settingSummaryRow("Status", settings.analytics_enabled ? "Aktif" : "Nonaktif"),
      settingSummaryRow(
        "Grafik aktif",
        `${enabledCount} dari ${Object.keys(ANALYTICS_CHART_LABELS).length}`,
      ),
      settingSummaryRow(
        "Grafik unggulan",
        ANALYTICS_CHART_LABELS[settings.featured_chart] || settings.featured_chart || "—",
      ),
      settingSummaryRow(
        "Rentang awal",
        rangeLabels[settings.default_date_range] || settings.default_date_range || "—",
      ),
    ],
  );

  const { form, restoreButton, saveButton } = buildAdvancedSettingsForm(settings, context, {
    embedded: true,
    onSaved: () => context.refresh(),
    leadingSections: [summary],
  });

  chrome?.setFooter?.({
    start: [restoreButton],
    end: [saveButton],
  });

  return settingsStack(form);
}
