import {
  commitImport,
  previewImport,
  restoreBackup,
} from "../../api/backup-api.js";
import { closeModal, openModal } from "../../components/modal.js";
import { showApiError, showToast } from "../../components/toast.js";
import { button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import {
  formatDateTime,
  formatFileSize,
  formatNumber,
} from "../../utils/formatting.js";
import { pickNumber } from "../../utils/data.js";

export const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

export async function handleSelectedFile(file, mode, context, trigger) {
  if (file.size > MAX_IMPORT_SIZE) {
    showToast({
      type: "error",
      title: "File terlalu besar",
      message: `Ukuran maksimal ${formatFileSize(MAX_IMPORT_SIZE)}.`,
    });
    return;
  }

  const extension = file.name.toLowerCase().split(".").pop();
  const validExtensions = mode === "RESTORE" ? ["xlsx"] : ["xlsx", "csv", "json"];
  if (!validExtensions.includes(extension)) {
    showToast({
      type: "error",
      title: "Jenis file tidak didukung",
      message:
        mode === "RESTORE"
          ? "Pemulihan hanya menerima backup .xlsx aplikasi."
          : "Gunakan file .xlsx, .csv, atau .json.",
    });
    return;
  }

  const loadingBody = element("div", {
    className: "empty-state",
    children: [
      element("div", {
        className: "empty-state-content",
        children: [
          element("span", { className: "spinner", attributes: { "aria-hidden": "true" } }),
          element("h3", { text: "Memeriksa file…" }),
          element("p", {
            text: "Struktur, baris, duplikasi, dan versi format sedang divalidasi.",
          }),
        ],
      }),
    ],
  });
  openModal({
    eyebrow: mode === "RESTORE" ? "Pemulihan" : "Impor data",
    title: file.name,
    description: `${formatFileSize(file.size)} · file belum mengubah database`,
    body: loadingBody,
    footer: [],
    returnFocus: trigger,
  });

  try {
    const preview =
      mode === "RESTORE" ? await restoreBackup(file) : await previewImport(file);
    showPreview(preview, context, trigger);
  } catch (error) {
    await closeModal({ force: true });
    showApiError(error, mode === "RESTORE" ? "Backup tidak dapat dipulihkan" : "File tidak valid");
  }
}

function showPreview(preview, context, trigger) {
  const summary = preview.summary || {};
  const errors = Array.isArray(preview.errors) ? preview.errors : [];
  const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
  const samples = Array.isArray(preview.sample_items) ? preview.sample_items : [];
  const isRestore = String(preview.mode || "").toUpperCase() === "RESTORE";

  const body = element("div", {
    className: "page-stack",
    children: [
      errors.length > 0
        ? element("div", {
            className: "inline-alert inline-alert-danger",
            children: [
              icon("alert-triangle"),
              element("div", {
                children: [
                  element("strong", { text: "File belum dapat diproses" }),
                  element("span", {
                    text: `${errors.length} kesalahan harus diperbaiki pada file sumber.`,
                  }),
                ],
              }),
            ],
          })
        : element("div", {
            className: "inline-alert inline-alert-success",
            children: [
              icon("check-circle"),
              element("div", {
                children: [
                  element("strong", { text: "Validasi berhasil" }),
                  element("span", {
                    text: isRestore
                      ? "Backup aplikasi siap dipulihkan secara menyeluruh."
                      : "Data siap diimpor dalam satu transaksi.",
                  }),
                ],
              }),
            ],
          }),
      element("div", {
        className: "preview-summary",
        children: [
          createPreviewStat("Barang", pickNumber(summary, ["item_count"])),
          createPreviewStat("Pergerakan", pickNumber(summary, ["movement_count"])),
          createPreviewStat(
            "Peringatan",
            pickNumber(summary, ["warning_count"], warnings.length),
          ),
        ],
      }),
      errors.length > 0 ? createValidationSection("Kesalahan", errors, "danger") : null,
      warnings.length > 0 ? createValidationSection("Peringatan", warnings, "warning") : null,
      samples.length > 0 ? createSampleTable(samples) : null,
      element("dl", {
        className: "definition-list",
        children: [
          ["Mode", isRestore ? "Pemulihan penuh" : "Impor data"],
          ["Format", String(preview.format || "").toUpperCase() || "—"],
          ["Nama file", preview.file_name || "—"],
          ["Preview berlaku sampai", formatDateTime(preview.expires_at)],
        ].map(([term, value]) =>
          element("div", {
            children: [element("dt", { text: term }), element("dd", { text: value })],
          }),
        ),
      }),
    ],
  });
  const cancelButton = button("Batal", { onClick: () => closeModal({ force: true }) });
  const commitButton = button(isRestore ? "Pulihkan data" : "Impor data", {
    variant: isRestore ? "button-danger" : "button-primary",
    iconName: isRestore ? "restore" : "upload",
    disabled: errors.length > 0,
    requiresConnection: true,
    onClick: async (event) => {
      await runWithButtonBusy(
        event.currentTarget,
        isRestore ? "Memulihkan…" : "Mengimpor…",
        async () => {
          try {
            const result = await commitImport(preview.preview_token);
            await closeModal({ force: true });
            showToast({
              type: "success",
              title: isRestore ? "Pemulihan selesai" : "Impor selesai",
              message: `${formatNumber(result?.item_count || 0)} barang diproses. Snapshot keselamatan: ${
                result?.safety_snapshot || "dibuat"
              }.`,
              duration: 6500,
            });
            context.refresh();
          } catch (error) {
            showApiError(error, isRestore ? "Pemulihan gagal" : "Impor gagal");
          }
        },
      );
    },
  });
  openModal({
    eyebrow: isRestore ? "Preview pemulihan" : "Preview impor",
    title: preview.file_name || "Preview file",
    description: "Tidak ada perubahan database sebelum Anda menekan tombol konfirmasi.",
    body,
    footer: [cancelButton, commitButton],
    returnFocus: trigger,
  });
}

function createPreviewStat(label, value) {
  return element("div", {
    className: "preview-stat",
    children: [
      element("span", { text: label }),
      element("strong", { text: formatNumber(value) }),
    ],
  });
}

function createValidationSection(title, entries, tone) {
  return element("section", {
    className: "page-stack",
    children: [
      element("h3", { text: `${title} (${entries.length})` }),
      element("ul", {
        className: "validation-list",
        children: entries.map((entry) =>
          element("li", {
            children: [
              icon(tone === "danger" ? "alert-triangle" : "info"),
              element("span", { text: validationMessage(entry) }),
            ],
          }),
        ),
      }),
    ],
  });
}

function validationMessage(entry) {
  if (typeof entry === "string") {
    return entry;
  }
  if (entry && typeof entry === "object") {
    const location = entry.row ? `Baris ${entry.row}: ` : "";
    return `${location}${entry.message || entry.error || JSON.stringify(entry)}`;
  }
  return String(entry);
}

function createSampleTable(samples) {
  const table = element("table", {
    className: "data-table",
    attributes: { "aria-label": "Contoh data yang akan diproses" },
    children: [
      element("thead", {
        children: [
          element("tr", {
            children: ["Nama", "Kategori", "Lokasi", "Stok"].map((label) =>
              element("th", { text: label, attributes: { scope: "col" } }),
            ),
          }),
        ],
      }),
      element("tbody", {
        children: samples.map((item) =>
          element("tr", {
            children: [
              element("td", { className: "cell-primary", text: item.name || "—" }),
              element("td", { text: item.category || "—" }),
              element("td", { text: item.location || "—" }),
              element("td", {
                className: ["numeric", "number"],
                text: formatNumber(item.current_stock),
              }),
            ],
          }),
        ),
      }),
    ],
  });
  return element("section", {
    className: "page-stack",
    children: [
      element("h3", { text: "Contoh data" }),
      element("div", { className: "table-scroll", children: [table] }),
    ],
  });
}

