import {
  createBackup,
  createDatabaseSnapshot,
  exportBackup,
} from "../../api/backup-api.js";
import { showApiError, showToast } from "../../components/toast.js";
import { appState } from "../../state/app-state.js";
import { badge, button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import {
  backupStatusLabel,
  backupStatusTone,
  formatDateTime,
} from "../../utils/formatting.js";

export function createBackupActionCards(status, context) {
  return [
    createActionCard({
      iconName: "backup",
      title: "Buat backup Excel",
      message:
        "Membuat file Excel terkini dan salinan harian terverifikasi secara atomik.",
      actionLabel: "Backup sekarang",
      actionIcon: "refresh",
      primary: true,
      onAction: async (event) => {
        const actionButton = event.currentTarget;
        await runWithButtonBusy(actionButton, "Mencadangkan…", async () => {
          try {
            appState.set("backup", { ...status, state: "running" });
            const result = await createBackup();
            showToast({
              type: "success",
              title: "Backup Excel berhasil",
              message: result?.daily_file_name
                ? `Salinan harian ${result.daily_file_name} telah dibuat.`
                : "Backup terkini telah diperbarui.",
            });
            context.refresh();
          } catch (error) {
            showApiError(error, "Backup Excel gagal");
            context.refresh();
          }
        });
      },
    }),
    createActionCard({
      iconName: "download",
      title: "Ekspor Excel",
      message:
        "Unduh salinan Excel inventaris saat ini untuk laporan atau penyimpanan eksternal.",
      actionLabel: "Unduh Excel",
      actionIcon: "download",
      onAction: async (event) => {
        const actionButton = event.currentTarget;
        await runWithButtonBusy(actionButton, "Menyiapkan…", async () => {
          try {
            const fileName = await exportBackup();
            showToast({
              type: "success",
              title: "Ekspor selesai",
              message: `${fileName} siap di folder unduhan browser.`,
            });
          } catch (error) {
            showApiError(error, "Ekspor belum berhasil");
          }
        });
      },
    }),
    createActionCard({
      iconName: "database",
      title: "Snapshot SQLite",
      message:
        "Buat snapshot database aman dengan SQLite Backup API sebelum perawatan manual.",
      actionLabel: "Buat snapshot",
      actionIcon: "database",
      onAction: async (event) => {
        const actionButton = event.currentTarget;
        await runWithButtonBusy(actionButton, "Membuat…", async () => {
          try {
            const result = await createDatabaseSnapshot();
            showToast({
              type: "success",
              title: "Snapshot database dibuat",
              message: result?.file_name || "Snapshot tersimpan di folder backup database.",
            });
            context.refresh();
          } catch (error) {
            showApiError(error, "Snapshot gagal dibuat");
          }
        });
      },
    }),
  ];
}

export function createBackupOverview(status, context) {
  const state = String(status.state || "idle").toUpperCase();
  const tone = backupStatusTone(state);
  const success = status.last_success || {};
  const lastSuccessAt = success.created_at || success.completed_at;
  const metrics = [
    {
      label: "Status otomatis",
      value: backupStatusLabel(state),
      note: "Dipicu setelah perubahan data",
      tone,
    },
    {
      label: "Berhasil terakhir",
      value: lastSuccessAt ? formatDateTime(lastSuccessAt) : "Belum ada",
      note: "Waktu backup sukses terbaru",
    },
    {
      label: "File aktif",
      value: success.file_name || "current_inventory_backup.xlsx",
      note: "Cadangan Excel terkini",
    },
    {
      label: "Salinan harian",
      value: success.daily_file_name || "Otomatis setelah sukses",
      note: "Disimpan di folder daily",
    },
  ];

  return element("section", {
    className: ["card", "ops-hero-card"],
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Ringkasan cadangan" }),
              element("p", {
                text: "SQLite sumber utama · Excel untuk cadangan dan laporan.",
              }),
            ],
          }),
          button("Perbarui", {
            variant: "button-secondary",
            className: "button-compact",
            iconName: "refresh",
            onClick: () => context.refresh(),
          }),
        ],
      }),
      element("div", {
        className: "card-body",
        children: [
          element("div", {
            className: "ops-metric-grid",
            children: metrics.map((metric) =>
              element("article", {
                className: [
                  "ops-metric",
                  metric.tone ? `ops-metric-tone-${metric.tone}` : null,
                ],
                children: [
                  element("span", { className: "ops-metric-label", text: metric.label }),
                  element("strong", {
                    className: "ops-metric-value",
                    text: metric.value,
                  }),
                  element("small", { className: "ops-metric-note", text: metric.note }),
                ],
              }),
            ),
          }),
        ],
      }),
    ],
  });
}

function createActionCard(options) {
  return element("article", {
    className: ["card", "action-card", options.primary ? "action-card-primary" : null],
    children: [
      element("div", {
        className: "action-card-top",
        children: [
          element("span", {
            className: [
              "summary-icon",
              options.primary ? "summary-icon-success" : null,
            ],
            children: [icon(options.iconName)],
          }),
          options.primary ? badge("Utama", "success") : null,
        ],
      }),
      element("div", {
        className: "action-card-copy",
        children: [
          element("h3", { text: options.title }),
          element("p", { text: options.message }),
        ],
      }),
      button(options.actionLabel, {
        variant: options.primary ? "button-primary" : "button-neutral",
        iconName: options.actionIcon,
        requiresConnection: true,
        onClick: options.onAction,
      }),
    ],
  });
}
