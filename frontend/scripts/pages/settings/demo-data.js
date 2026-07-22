import {
  reloadDemoData,
  removeDemoData,
  resetInventoryData,
} from "../../api/analytics-api.js";
import { confirmAction } from "../../components/modal.js";
import { showApiError, showToast } from "../../components/toast.js";
import { button, element, runWithButtonBusy } from "../../utils/dom.js";
import { formatNumber } from "../../utils/formatting.js";
import { settingsSection, settingSummaryRow } from "./advanced-settings.js";

export function createDemoDataCard(demo, context) {
  const status = {
    demoItems: Math.max(0, Number(demo?.demo_items) || 0),
    realItems: Math.max(0, Number(demo?.real_items) || 0),
    hasDemo: Boolean(demo?.has_demo),
    datasetVersion: String(demo?.dataset_version || "—"),
  };
  const actions = [
    {
      title: "Muat ulang data demonstrasi",
      description: "Ganti/isi dataset fiktif. Snapshot dibuat sebelum perubahan.",
      label: "Muat ulang",
      iconName: "refresh",
      tone: "neutral",
      run: (event) =>
        performDemoAction({
          title: "Muat ulang data demonstrasi?",
          message: "Snapshot database dibuat sebelum data demonstrasi diganti.",
          operation: reloadDemoData,
          context,
          trigger: event.currentTarget,
          busyLabel: "Memuat…",
          successMessage: (result) =>
            `${formatNumber(result.items || 0)} barang demonstrasi berhasil dimuat.`,
        }),
    },
  ];
  if (status.hasDemo) {
    actions.push({
      title: "Hapus data demonstrasi",
      description: "Hapus seluruh data demo. Data nyata tetap aman.",
      label: "Hapus demo",
      iconName: "trash",
      tone: "danger",
      run: (event) =>
        performDemoAction({
          title: "Hapus seluruh data demonstrasi?",
          message: "Data nyata tetap dipertahankan dan snapshot dibuat terlebih dahulu.",
          operation: removeDemoData,
          context,
          trigger: event.currentTarget,
          busyLabel: "Menghapus…",
          danger: true,
          successMessage: (result) =>
            `${formatNumber(result.removed || 0)} barang demonstrasi berhasil dihapus.`,
        }),
    });
  }
  actions.push({
    title: "Mulai ulang inventaris",
    description:
      "Kosongkan semua barang, riwayat stok, kategori, dan lokasi.",
    label: "Mulai ulang",
    iconName: "database",
    tone: "danger",
    run: (event) =>
      performDemoAction({
        eyebrow: "Mulai Ulang Inventaris",
        title: "Mulai ulang seluruh data inventaris?",
        message:
          "Semua data nyata dan demonstrasi akan dihapus. Pengaturan dan riwayat backup tetap disimpan.",
        detail:
          "Tindakan ini mengosongkan inventaris. Snapshot keselamatan dibuat terlebih dahulu untuk pemulihan.",
        operation: resetInventoryData,
        context,
        trigger: event.currentTarget,
        busyLabel: "Mengosongkan…",
        danger: true,
        successMessage: (result) =>
          `${formatNumber(result.removed_items || 0)} barang dan ${formatNumber(
            result.removed_movements || 0,
          )} riwayat stok dihapus. Inventaris sekarang kosong.`,
      }),
  });

  return settingsSection(
    "Status dan pengelolaan data",
    `${formatNumber(status.realItems)} barang nyata · ${formatNumber(
      status.demoItems,
    )} barang demonstrasi.`,
    [
      settingSummaryRow("Data nyata", `${formatNumber(status.realItems)} barang`),
      settingSummaryRow("Data demonstrasi", `${formatNumber(status.demoItems)} barang`),
      settingSummaryRow("Versi dataset", status.datasetVersion),
      ...actions.map((action) =>
        element("div", {
          className: "demo-action-row",
          children: [
            element("div", {
              className: "demo-action-copy",
              children: [
                element("strong", { text: action.title }),
                element("p", { className: "muted", text: action.description }),
              ],
            }),
            button(action.label, {
              variant: action.tone === "danger" ? "button-danger" : "button-secondary",
              iconName: action.iconName,
              requiresConnection: true,
              onClick: action.run,
            }),
          ],
        }),
      ),
    ],
  );
}

async function performDemoAction({
  eyebrow = "Data Demonstrasi",
  title,
  message,
  detail,
  operation,
  context,
  trigger,
  busyLabel = "Memproses…",
  danger = false,
  successMessage,
}) {
  const confirmed = await confirmAction({
    eyebrow,
    title,
    message,
    detail,
    confirmLabel: "Lanjutkan",
    danger,
  });
  if (!confirmed) {
    return;
  }
  await runWithButtonBusy(trigger, busyLabel, async () => {
    try {
      const result = await operation();
      const resultMessage = successMessage?.(result) || "Operasi selesai.";
      const snapshotMessage = result.safety_snapshot
        ? `Snapshot keselamatan ${result.safety_snapshot} telah dibuat.`
        : "";
      showToast({
        type: "success",
        title: danger ? "Data inventaris diperbarui" : "Data demonstrasi diperbarui",
        message: [resultMessage, snapshotMessage].filter(Boolean).join(" "),
        duration: 6500,
      });
      await context.refresh();
    } catch (error) {
      showApiError(error, "Data inventaris belum dapat diperbarui");
    }
  });
}
