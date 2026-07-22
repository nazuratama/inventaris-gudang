import { getBackups } from "../api/backup-api.js";
import { createErrorState, createPageLoading } from "../components/states.js";
import { appState } from "../state/app-state.js";
import { element, icon, replace } from "../utils/dom.js";
import { getCollection } from "../utils/data.js";
import {
  createBackupActionCards,
  createBackupOverview,
} from "./backups/backup-actions.js";
import { createBackupLogsCard } from "./backups/backup-history.js";
import { createBackupFilesCard } from "./backups/backup-files.js";
import { handleSelectedFile } from "./backups/import-flow.js";
import {
  createFileInput,
  createImportCard,
  createRestoreCard,
} from "./backups/transfer-cards.js";

export async function mountBackups(context) {
  replace(context.container, createPageLoading(0));
  try {
    const data = await getBackups({ signal: context.signal });
    if (context.signal.aborted) {
      return;
    }
    appState.set("backup", data?.status || null);
    replace(context.container, renderBackups(data || {}, context));
  } catch (error) {
    if (error?.name !== "AbortError") {
      replace(
        context.container,
        element("div", {
          className: "page-container",
          children: [createErrorState(error, context.refresh)],
        }),
      );
    }
  }
}

function renderBackups(data, context) {
  const status = data.status || {};
  const logs = getCollection(data, ["logs", "backups"]);
  const files = getCollection(data, ["files"]);
  const lastError = status.last_error || null;
  const importInput = createFileInput(".xlsx,.csv,.json", async (file, trigger) => {
    await handleSelectedFile(file, "IMPORT", context, trigger);
  });
  const restoreInput = createFileInput(".xlsx", async (file, trigger) => {
    await handleSelectedFile(file, "RESTORE", context, trigger);
  });

  // Title/description live in the topbar only — do not repeat them here.
  // Global backup status lives in the sidebar footer (#backupStatus).
  return element("div", {
    className: ["page-container", "page-stack", "app-page", "ops-page"],
    children: [
      lastError
        ? element("div", {
            className: "inline-alert inline-alert-warning",
            attributes: { role: "alert" },
            children: [
              icon("alert-triangle"),
              element("div", {
                children: [
                  element("strong", { text: "Backup terakhir gagal" }),
                  element("span", {
                    text:
                      "Data utama tetap aman di SQLite. Coba buat backup manual setelah memastikan folder dapat ditulis.",
                  }),
                ],
              }),
            ],
          })
        : null,
      createBackupOverview(status, context),
      element("section", {
        className: "ops-section",
        children: [
          element("div", {
            className: "ops-section-header",
            children: [
              element("div", {
                children: [
                  element("h3", { text: "Tindakan utama" }),
                  element("p", {
                    text: "Cadangan Excel, unduhan laporan, dan snapshot database.",
                  }),
                ],
              }),
            ],
          }),
          element("div", {
            className: "backup-grid",
            attributes: { "aria-label": "Tindakan backup" },
            children: createBackupActionCards(status, context),
          }),
        ],
      }),
      element("section", {
        className: "ops-section",
        children: [
          element("div", {
            className: "ops-section-header",
            children: [
              element("div", {
                children: [
                  element("h3", { text: "Impor & pemulihan" }),
                  element("p", {
                    text: "Masukkan data tervalidasi atau pulihkan dari backup resmi aplikasi.",
                  }),
                ],
              }),
            ],
          }),
          element("div", {
            className: "backup-transfer-grid",
            children: [
              createImportCard(importInput, context),
              createRestoreCard(restoreInput),
            ],
          }),
        ],
      }),
      createBackupFilesCard(files, data.storage || {}, context),
      createBackupLogsCard(logs),
      importInput,
      restoreInput,
    ],
  });
}
