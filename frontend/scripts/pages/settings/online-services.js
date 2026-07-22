import {
  checkForUpdates,
  connectGoogleDrive,
  disconnectGoogleDrive,
  installUpdate,
  updateSettings,
  uploadCloudBackupNow,
} from "../../api/settings-api.js";
import { createFormField } from "../../components/forms.js";
import { confirmAction } from "../../components/modal.js";
import { showApiError, showToast } from "../../components/toast.js";
import { badge, button, element, runWithButtonBusy } from "../../utils/dom.js";
import {
  numberField,
  settingsSection,
  settingSummaryRow,
  switchField,
} from "./advanced-settings.js";
import { settingsStack } from "./shared.js";


export function renderCloudBackupSection(view, context, chrome) {
  const settings = view.settings || {};
  const cloud = view.cloud || {};
  const form = element("form", {
    className: "advanced-settings-panel",
    attributes: { novalidate: true },
  });
  const folder = createFormField({
    name: "google_drive_folder_url",
    label: "Link folder Google Drive",
    value: settings.google_drive_folder_url || cloud.folder_url || "",
    placeholder: "https://drive.google.com/drive/folders/...",
    maxLength: 500,
    compact: true,
    help: "Kosongkan agar aplikasi membuat folder Inventaris Gudang secara otomatis.",
  });
  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        settingsSection("Status Google Drive", "Koneksi akun dan antrean upload.", [
          settingSummaryRow("Konfigurasi pengembang", cloud.configured ? "Siap" : "Belum diisi"),
          settingSummaryRow("Akun", cloud.connected ? "Tersambung" : "Belum tersambung"),
          settingSummaryRow("Antrean offline", `${Number(cloud.pending || 0)} file`),
          settingSummaryRow("Sudah diunggah", `${Number(cloud.uploaded || 0)} file`),
          element("div", {
            className: "settings-inline-action",
            children: [
              cloud.connected
                ? button("Putuskan akun", {
                    className: "button-secondary",
                    iconName: "close",
                    onClick: async (event) => {
                      const approved = await confirmAction({
                        title: "Putuskan Google Drive?",
                        message: "Backup lokal dan file yang sudah ada di Drive tidak akan dihapus.",
                        confirmLabel: "Putuskan",
                        danger: true,
                      });
                      if (!approved) return;
                      await runWithButtonBusy(event.currentTarget, "Memutus…", async () => {
                        try {
                          await disconnectGoogleDrive();
                          showToast({ type: "success", title: "Akun diputus", message: "Backup lokal tetap aktif." });
                          context.refresh();
                        } catch (error) {
                          showApiError(error, "Akun belum dapat diputus");
                        }
                      });
                    },
                  })
                : button("Sambungkan Google Drive", {
                    variant: "button-primary",
                    iconName: "backup",
                    disabled: !cloud.configured,
                    onClick: async (event) => {
                      const popup = window.open("about:blank", "inventory-google-drive");
                      await runWithButtonBusy(event.currentTarget, "Menyiapkan…", async () => {
                        try {
                          const result = await connectGoogleDrive();
                          if (popup) popup.location.href = result.authorization_url;
                          showToast({ type: "info", title: "Lanjutkan di Google", message: "Setelah berhasil, tutup tab Google lalu tekan Perbarui." });
                        } catch (error) {
                          popup?.close();
                          showApiError(error, "Google Drive belum dapat disambungkan");
                        }
                      });
                    },
                  }),
              cloud.connected && settings.cloud_backup_enabled
                ? button("Cadangkan sekarang", {
                    className: "button-secondary",
                    iconName: "upload",
                    onClick: async (event) => {
                      await runWithButtonBusy(event.currentTarget, "Mengunggah…", async () => {
                        try {
                          await uploadCloudBackupNow();
                          showToast({ type: "success", title: "Backup online selesai", message: "File lokal terverifikasi sudah disinkronkan." });
                          context.refresh();
                        } catch (error) {
                          showApiError(error, "Backup online belum berhasil");
                        }
                      });
                    },
                  })
                : null,
            ],
          }),
        ]),
        settingsSection("Kebijakan backup online", "Backup lokal selalu dibuat lebih dulu.", [
          switchField("cloud_backup_enabled", "Aktifkan cadangan online", settings.cloud_backup_enabled),
          folder.wrapper,
          numberField(
            "cloud_backup_retention_days",
            "Retensi online (hari)",
            settings.cloud_backup_retention_days || 30,
            1,
            3650,
          ),
          element("p", {
            className: "muted settings-note form-field-wide",
            text: "Jika internet terputus, file tetap aman di komputer dan masuk antrean untuk dicoba lagi.",
          }),
        ]),
      ],
    }),
  );

  const save = button("Simpan backup online", {
    variant: "button-primary",
    iconName: "save",
    onClick: () => form.requestSubmit(),
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runWithButtonBusy(save, "Menyimpan…", async () => {
      try {
        await updateSettings({
          cloud_backup_enabled: Boolean(form.elements.namedItem("cloud_backup_enabled")?.checked),
          google_drive_folder_url: String(form.elements.namedItem("google_drive_folder_url")?.value || "").trim(),
          cloud_backup_retention_days: Number(form.elements.namedItem("cloud_backup_retention_days")?.value || 30),
        });
        showToast({ type: "success", title: "Backup online disimpan", message: "Kebijakan baru sudah aktif." });
        context.refresh();
      } catch (error) {
        showApiError(error, "Pengaturan backup online gagal disimpan");
      }
    });
  });
  chrome?.setFooter?.({ end: [save] });
  return settingsStack(form);
}


export function renderUpdatesSection(view, context, chrome) {
  const settings = view.settings || {};
  const updates = view.updates || {};
  const latest = updates.latest || {};
  const form = element("form", { className: "advanced-settings-panel" });
  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        settingsSection("Versi aplikasi", "Pembaruan resmi dari GitHub Releases.", [
          settingSummaryRow("Versi terpasang", updates.current_version || view.health?.version || "1.0.0"),
          settingSummaryRow("Versi terbaru", latest.version || "Belum diperiksa"),
          settingSummaryRow("Repositori", updates.repository || "Belum dikonfigurasi"),
          settingSummaryRow("Status", updates.pending_version
            ? `v${updates.pending_version} siap dipasang`
            : updates.update_available
              ? "Pembaruan tersedia"
              : "Belum ada pembaruan"),
          element("div", {
            className: "settings-inline-action",
            children: [
              button("Periksa pembaruan", {
                className: "button-secondary",
                iconName: "refresh",
                disabled: !updates.configured,
                onClick: async (event) => {
                  await runWithButtonBusy(event.currentTarget, "Memeriksa…", async () => {
                    try {
                      const result = await checkForUpdates();
                      showToast({
                        type: result.update_available ? "info" : "success",
                        title: result.update_available ? "Pembaruan tersedia" : "Sudah versi terbaru",
                        message: result.latest?.name || `Versi ${result.current_version}`,
                      });
                      context.refresh();
                    } catch (error) {
                      showApiError(error, "Pembaruan belum dapat diperiksa");
                    }
                  });
                },
              }),
              updates.update_available
                ? button("Unduh dan pasang", {
                    variant: "button-primary",
                    iconName: "download",
                    disabled: !latest.asset_ready,
                    onClick: async (event) => {
                      const approved = await confirmAction({
                        title: `Pasang versi ${latest.version}?`,
                        message: "Aplikasi akan mencadangkan data, memverifikasi paket, lalu dimulai ulang otomatis.",
                        confirmLabel: "Pasang pembaruan",
                      });
                      if (!approved) return;
                      await runWithButtonBusy(event.currentTarget, "Menyiapkan…", async () => {
                        try {
                          const result = await installUpdate();
                          showToast({
                            type: "success",
                            title: "Paket terverifikasi",
                            message: result.install_started
                              ? "Aplikasi akan dimulai ulang otomatis."
                              : "Paket siap dipasang pada aplikasi Windows.",
                          });
                        } catch (error) {
                          showApiError(error, "Pembaruan gagal disiapkan");
                        }
                      });
                    },
                  })
                : null,
            ],
          }),
        ]),
        settingsSection("Preferensi", "Kontrol pemeriksaan versi baru.", [
          switchField("update_auto_check", "Periksa otomatis saat aplikasi dibuka", settings.update_auto_check),
          latest.notes
            ? element("div", {
                className: "form-field-wide",
                children: [
                  element("strong", { text: latest.name || `Versi ${latest.version}` }),
                  element("p", { className: "muted settings-note", text: latest.notes }),
                ],
              })
            : element("p", {
                className: "muted settings-note form-field-wide",
                text: updates.configured
                  ? "Catatan rilis muncul setelah pemeriksaan berhasil."
                  : "Isi github_repository pada config/default-settings.json sebelum membuat rilis klien.",
              }),
        ]),
      ],
    }),
  );
  const save = button("Simpan pembaruan", {
    variant: "button-primary",
    iconName: "save",
    onClick: () => form.requestSubmit(),
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runWithButtonBusy(save, "Menyimpan…", async () => {
      try {
        await updateSettings({
          update_auto_check: Boolean(form.elements.namedItem("update_auto_check")?.checked),
        });
        showToast({ type: "success", title: "Preferensi disimpan", message: "Pengaturan pembaruan diperbarui." });
        context.refresh();
      } catch (error) {
        showApiError(error, "Preferensi pembaruan gagal disimpan");
      }
    });
  });
  chrome?.setFooter?.({ end: [save] });
  return settingsStack(form);
}
