import {
  downloadStoredBackup,
  restoreStoredDatabaseBackup,
  verifyStoredBackup,
} from "../../api/backup-api.js";
import { confirmAction } from "../../components/modal.js";
import { createEmptyState } from "../../components/states.js";
import { showApiError, showToast } from "../../components/toast.js";
import { badge, button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import { formatDateTime, formatFileSize } from "../../utils/formatting.js";


export function createBackupFilesCard(files, storage, context) {
  const rows = files.slice(0, 12);
  return element("section", {
    className: "card",
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "File cadangan tersimpan" }),
              element("p", {
                text: `${formatFileSize(storage?.backup_bytes || 0)} digunakan · ${formatFileSize(storage?.free_bytes || 0)} ruang kosong`,
              }),
            ],
          }),
          badge(storage?.writable ? "Folder siap" : "Tidak dapat ditulis", storage?.writable ? "success" : "danger"),
        ],
      }),
      element("div", {
        className: "card-body",
        children: [
          rows.length
            ? element("div", {
                className: "backup-log-list",
                children: rows.map((file) => createFileRow(file, context)),
              })
            : createEmptyState({
                iconName: "backup",
                title: "Belum ada file backup",
                message: "Buat backup Excel atau snapshot database untuk memulai.",
              }),
        ],
      }),
    ],
  });
}


function createFileRow(file, context) {
  const isDatabase = file.kind === "database";
  return element("div", {
    className: "backup-log-item",
    children: [
      element("span", {
        className: "movement-icon movement-adjustment",
        children: [icon(isDatabase ? "database" : "file")],
      }),
      element("div", {
        className: "list-copy",
        children: [
          element("strong", { text: file.file_name }),
          element("small", {
            text: `${isDatabase ? "Snapshot SQLite" : "Backup Excel"} · ${formatFileSize(file.size_bytes)} · ${formatDateTime(file.created_at)}`,
          }),
        ],
      }),
      element("div", {
        className: "settings-inline-action",
        children: [
          button("Verifikasi", {
            className: "button-compact button-secondary",
            iconName: "shield",
            onClick: async (event) => {
              await runWithButtonBusy(event.currentTarget, "Memeriksa…", async () => {
                try {
                  const result = await verifyStoredBackup(file.kind, file.file_name);
                  showToast({
                    type: "success",
                    title: "Backup valid",
                    message: `SHA-256 ${String(result.sha256 || "").slice(0, 12)}…`,
                  });
                } catch (error) {
                  showApiError(error, "Backup tidak lolos verifikasi");
                }
              });
            },
          }),
          button("Unduh", {
            className: "button-compact button-secondary",
            iconName: "download",
            onClick: async (event) => {
              await runWithButtonBusy(event.currentTarget, "Mengunduh…", async () => {
                try {
                  await downloadStoredBackup(file.kind, file.file_name);
                } catch (error) {
                  showApiError(error, "File belum dapat diunduh");
                }
              });
            },
          }),
          isDatabase
            ? button("Pulihkan", {
                className: "button-compact button-secondary",
                iconName: "restore",
                onClick: async (event) => {
                  const approved = await confirmAction({
                    title: "Pulihkan snapshot database?",
                    message: "Data saat ini akan disnapshot lebih dulu, lalu diganti dengan isi backup terpilih.",
                    detail: file.file_name,
                    confirmLabel: "Pulihkan",
                    danger: true,
                  });
                  if (!approved) return;
                  await runWithButtonBusy(event.currentTarget, "Memulihkan…", async () => {
                    try {
                      const result = await restoreStoredDatabaseBackup(file.file_name);
                      showToast({
                        type: "success",
                        title: "Database dipulihkan",
                        message: `Snapshot pengaman: ${result.safety_snapshot}`,
                      });
                      context.refresh();
                    } catch (error) {
                      showApiError(error, "Snapshot gagal dipulihkan");
                    }
                  });
                },
              })
            : null,
        ],
      }),
    ],
  });
}
