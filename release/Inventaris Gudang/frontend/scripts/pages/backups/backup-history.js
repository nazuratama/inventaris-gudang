import { openModal } from "../../components/modal.js";
import { createPagination, paginationSummary } from "../../components/pagination.js";
import { createEmptyState } from "../../components/states.js";
import { badge, button, element, icon, replace } from "../../utils/dom.js";
import { formatDateTime, formatNumber } from "../../utils/formatting.js";

const BACKUP_LOG_PREVIEW_LIMIT = 10;
const BACKUP_LOG_PAGE_SIZE = 10;

export function createBackupLogsCard(logs) {
  const previewLogs = logs.slice(0, BACKUP_LOG_PREVIEW_LIMIT);
  const body =
    previewLogs.length > 0
      ? element("div", {
          className: "backup-log-list",
          children: previewLogs.map(createBackupLogRow),
        })
      : createEmptyState({
          iconName: "backup",
          title: "Belum ada catatan backup",
          message: "Catatan muncul setelah backup pertama berhasil atau gagal dijalankan.",
        });

  return element("section", {
    className: "card",
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Riwayat backup" }),
              element("p", { text: `${BACKUP_LOG_PREVIEW_LIMIT} aktivitas terbaru` }),
            ],
          }),
          badge(`${logs.length} catatan`, "neutral"),
        ],
      }),
      element("div", { className: "card-body", children: [body] }),
      logs.length > BACKUP_LOG_PREVIEW_LIMIT
        ? element("footer", {
            className: "card-footer list-preview-footer",
            children: [
              element("span", {
                className: "table-summary",
                text: `Menampilkan ${BACKUP_LOG_PREVIEW_LIMIT} dari ${formatNumber(logs.length)} catatan`,
              }),
              button("Lihat daftar lengkap", {
                iconName: "history",
                onClick: (event) => openBackupHistory(logs, event.currentTarget),
              }),
            ],
          })
        : null,
    ],
  });
}

function openBackupHistory(logs, trigger) {
  openModal({
    size: "wide",
    eyebrow: "Riwayat backup",
    title: "Catatan backup lokal",
    description: `${formatNumber(logs.length)} catatan tersedia, ditampilkan ${BACKUP_LOG_PAGE_SIZE} per halaman.`,
    body: createPaginatedBackupLogsCard(logs),
    footer: [],
    returnFocus: trigger,
  });
}

function createPaginatedBackupLogsCard(logs) {
  const listRegion = element("div");
  const footer = element("footer", { className: "table-footer" });
  const totalPages = Math.max(1, Math.ceil(logs.length / BACKUP_LOG_PAGE_SIZE));
  const renderPage = (requestedPage) => {
    const page = Math.min(Math.max(1, requestedPage), totalPages);
    const start = (page - 1) * BACKUP_LOG_PAGE_SIZE;
    const pageLogs = logs.slice(start, start + BACKUP_LOG_PAGE_SIZE);
    replace(
      listRegion,
      pageLogs.length > 0
        ? element("div", {
            className: "backup-log-list",
            children: pageLogs.map(createBackupLogRow),
          })
        : createEmptyState({
            iconName: "backup",
            title: "Belum ada catatan backup",
            message: "Catatan muncul setelah backup pertama berhasil atau gagal dijalankan.",
          }),
    );
    const pagination = {
      page,
      pageSize: BACKUP_LOG_PAGE_SIZE,
      total: logs.length,
      totalPages,
    };
    replace(
      footer,
      element("span", {
        className: "table-summary",
        text: paginationSummary(pagination),
      }),
      createPagination(pagination, renderPage),
    );
  };

  const card = element("section", {
    className: "card",
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: "Riwayat backup" }),
              element("p", { text: `${BACKUP_LOG_PAGE_SIZE} aktivitas per halaman` }),
            ],
          }),
          badge(`${logs.length} catatan`, "neutral"),
        ],
      }),
      element("div", { className: "card-body", children: [listRegion] }),
      footer,
    ],
  });
  renderPage(1);
  return card;
}

function createBackupLogRow(log) {
  const status = String(log.status || "").toUpperCase();
  return element("div", {
    className: "backup-log-item",
    children: [
      element("span", {
        className: [
          "movement-icon",
          status === "SUCCESS"
            ? "movement-in"
            : status === "FAILED"
              ? "movement-out"
              : "movement-adjustment",
        ],
        children: [
          icon(
            status === "SUCCESS"
              ? "check"
              : status === "FAILED"
                ? "alert-triangle"
                : "clock",
          ),
        ],
      }),
      element("div", {
        className: "list-copy",
        children: [
          element("strong", { text: log.file_name || "Backup" }),
          element("small", {
            text: `${log.backup_type || "EXCEL"} · ${formatDateTime(log.created_at)}`,
          }),
          log.error_message
            ? element("small", {
                className: "text-danger",
                text: "Backup gagal. Lihat logs/error.log untuk rincian teknis.",
              })
            : null,
        ],
      }),
      badge(
        status === "SUCCESS"
          ? "Berhasil"
          : status === "FAILED"
            ? "Gagal"
            : status === "RUNNING"
              ? "Berjalan"
              : "Menunggu",
        status === "SUCCESS"
          ? "success"
          : status === "FAILED"
            ? "danger"
            : "info",
      ),
    ],
  });
}
