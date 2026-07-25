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
  const clientId = createFormField({
    name: "google_drive_client_id",
    label: "OAuth Client ID",
    value: cloud.client_id || "",
    placeholder: "123456789-….apps.googleusercontent.com",
    maxLength: 300,
    compact: true,
    help: "Buat satu OAuth client bertipe Desktop app di Google Cloud. Client ID disimpan hanya di perangkat ini.",
  });
  const oauthSetup = element("details", {
    className: "settings-oauth-setup form-field-wide",
    attributes: { open: !cloud.configured },
    children: [
      element("summary", {
        text: cloud.configured ? "Konfigurasi login Google" : "Siapkan login Google (sekali saja)",
      }),
      element("div", {
        className: "settings-oauth-setup-body",
        children: [
          clientId.wrapper,
          element("p", {
            className: "muted settings-note",
            text: "Aktifkan Google Drive API, lalu salin Client ID dari Google Cloud Console. Client secret tidak diperlukan.",
          }),
        ],
      }),
    ],
  });
  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        settingsSection("Status Google Drive", "Koneksi akun dan antrean upload.", [
          settingSummaryRow("Login Google", cloud.configured ? "Siap" : "Perlu Client ID"),
          settingSummaryRow("Akun", cloud.connected ? "Tersambung" : "Belum tersambung"),
          settingSummaryRow("Antrean offline", `${Number(cloud.pending || 0)} file`),
          settingSummaryRow("Sudah diunggah", `${Number(cloud.uploaded || 0)} file`),
          !cloud.connected ? oauthSetup : null,
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
                    onClick: async (event) => {
                      const popup = window.open("about:blank", "inventory-google-drive");
                      if (!popup) {
                        showToast({
                          type: "error",
                          title: "Popup diblokir",
                          message: "Izinkan popup untuk login Google, lalu coba lagi.",
                        });
                        return;
                      }
                      await runWithButtonBusy(event.currentTarget, "Menyiapkan…", async () => {
                        try {
                          const typedClientId = String(clientId.input.value || "").trim();
                          if (!cloud.configured && !typedClientId) {
                            clientId.input.setAttribute("aria-invalid", "true");
                            clientId.showError("Masukkan OAuth Client ID terlebih dahulu.");
                            clientId.input.focus();
                            popup.close();
                            return;
                          }
                          clientId.input.removeAttribute("aria-invalid");
                          clientId.showError("");
                          const result = await connectGoogleDrive(typedClientId || null);
                          const completion = waitForGoogleOAuth(popup);
                          popup.location.href = result.authorization_url;
                          const outcome = await completion;
                          if (!outcome.ok) {
                            showToast({
                              type: "error",
                              title: "Login Google belum berhasil",
                              message: "Periksa Client ID dan konfigurasi OAuth, lalu coba lagi.",
                            });
                            return;
                          }
                          showToast({
                            type: "success",
                            title: "Google Drive tersambung",
                            message: "Cadangan online siap digunakan.",
                          });
                          await context.refresh();
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


function waitForGoogleOAuth(popup) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const localPort = window.location.port || "8765";
    const allowedOrigins = new Set([
      window.location.origin,
      `http://127.0.0.1:${localPort}`,
      `http://localhost:${localPort}`,
    ]);
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedPoll);
      window.clearTimeout(timeout);
      callback(value);
    };
    const onMessage = (event) => {
      if (
        event.source !== popup ||
        !allowedOrigins.has(event.origin) ||
        event.data?.type !== "inventory:google-drive-oauth"
      ) {
        return;
      }
      finish(resolve, { ok: Boolean(event.data.ok) });
    };
    const closedPoll = window.setInterval(() => {
      if (popup.closed) {
        finish(reject, new Error("Jendela login Google ditutup sebelum selesai."));
      }
    }, 500);
    const timeout = window.setTimeout(() => {
      popup.close();
      finish(reject, new Error("Waktu login Google habis. Silakan coba kembali."));
    }, 10 * 60 * 1000);
    window.addEventListener("message", onMessage);
  });
}


export function renderUpdatesSection(view, context, chrome) {
  const settings = view.settings || {};
  const updates = view.updates || {};
  const latest = updates.latest || {};
  const form = element("form", { className: "advanced-settings-panel" });
  const autoCheckField = switchField(
    "update_auto_check",
    "Periksa otomatis saat aplikasi dibuka",
    settings.update_auto_check,
  );
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
              : updates.release_state === "not_found"
                ? "Belum ada GitHub Release"
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
                      const noRelease = result.release_state === "not_found";
                      showToast({
                        type: result.update_available || noRelease ? "info" : "success",
                        title: result.update_available
                          ? "Pembaruan tersedia"
                          : noRelease
                            ? "Belum ada GitHub Release"
                            : "Sudah versi terbaru",
                        message: noRelease
                          ? "Publikasikan rilis pertama agar pemeriksaan otomatis mulai bekerja."
                          : result.latest?.name || `Versi ${result.current_version}`,
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
          autoCheckField,
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
                  : "Repositori pembaruan belum dikonfigurasi pada paket aplikasi.",
              }),
        ]),
      ],
    }),
  );
  const autoCheckInput = autoCheckField.querySelector("input");
  autoCheckInput?.addEventListener("change", async () => {
    const nextValue = Boolean(autoCheckInput.checked);
    autoCheckInput.disabled = true;
    try {
      await updateSettings({ update_auto_check: nextValue });
      showToast({
        type: "success",
        title: "Preferensi disimpan",
        message: nextValue
          ? "Versi baru akan diperiksa saat aplikasi dibuka."
          : "Pemeriksaan otomatis dinonaktifkan.",
      });
      await context.refresh();
    } catch (error) {
      autoCheckInput.checked = !nextValue;
      showApiError(error, "Preferensi pembaruan gagal disimpan");
    } finally {
      autoCheckInput.disabled = false;
    }
  });
  chrome?.setFooter?.();
  return settingsStack(form);
}
