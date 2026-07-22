import { updateAnalyticsSettings } from "../../api/analytics-api.js";
import { runIntegrityCheck, updateSettings } from "../../api/settings-api.js";
import { createFormField } from "../../components/forms.js";
import { showApiError, showToast } from "../../components/toast.js";
import { button, element, icon, runWithButtonBusy } from "../../utils/dom.js";
import {
  numberField,
  settingSummaryRow,
  settingsSection,
  switchField,
} from "./advanced-settings.js";
import { settingsStack } from "./shared.js";

export function renderSystemSection(view, context, chrome) {
  const health = view.health || {};
  const appSettings = view.settings || {};
  const analytics = view.analytics || {};
  const healthy = String(health.status || "").toLowerCase() === "healthy";

  const form = element("form", {
    className: "advanced-settings-panel",
    attributes: { novalidate: true },
  });

  const retentionField = createFormField({
    name: "daily_backup_retention_days",
    label: "Retensi backup (hari)",
    type: "number",
    value: appSettings.daily_backup_retention_days ?? analytics.daily_backup_retention_days ?? 30,
    min: 1,
    max: 3650,
    step: 1,
    compact: true,
    inputMode: "numeric",
  });
  const databaseRetentionField = createFormField({
    name: "database_backup_retention_days",
    label: "Retensi snapshot database (hari)",
    type: "number",
    value: appSettings.database_backup_retention_days ?? 30,
    min: 1,
    max: 3650,
    step: 1,
    compact: true,
    inputMode: "numeric",
  });

  form.append(
    element("div", {
      className: "advanced-settings-grid",
      children: [
        settingsSection("Status layanan", "Kondisi server lokal dan database.", [
          settingSummaryRow(
            "Server",
            healthy ? "Tersambung" : String(health.status || "Tidak diketahui"),
          ),
          settingSummaryRow(
            "Database",
            String(health.database_status || "Tidak diketahui"),
          ),
          settingSummaryRow(
            "Alamat",
            `${health.host || "127.0.0.1"}:${health.port || "8765"}`,
          ),
          settingSummaryRow("Versi", health.version || "—"),
          element("div", {
            className: "settings-inline-action",
            children: [
              button("Periksa integritas", {
                iconName: "shield",
                className: "button-secondary",
                requiresConnection: true,
                onClick: async (event) => {
                  await runWithButtonBusy(event.currentTarget, "Memeriksa…", async () => {
                    try {
                      const result = await runIntegrityCheck();
                      showToast({
                        type: "success",
                        title: "Database dalam kondisi baik",
                        message:
                          result?.result || "Pemeriksaan integritas selesai tanpa masalah.",
                      });
                      context.refresh();
                    } catch (error) {
                      showApiError(error, "Pemeriksaan menemukan masalah");
                    }
                  });
                },
              }),
            ],
          }),
        ]),
        settingsSection(
          "Retensi & operasi",
          "Kebijakan cadangan dan log. Nama gudang diubah di tab Akun.",
          [
            retentionField.wrapper,
            databaseRetentionField.wrapper,
            numberField(
              "backup_debounce_seconds",
              "Jeda backup (detik)",
              analytics.backup_debounce_seconds,
              0.5,
              30,
              0.5,
            ),
            numberField(
              "log_retention_days",
              "Retensi log (hari)",
              analytics.log_retention_days,
              1,
              3650,
            ),
            switchField(
              "confirm_destructive_actions",
              "Konfirmasi tindakan destruktif",
              analytics.confirm_destructive_actions,
            ),
          ],
        ),
      ],
    }),
  );

  const saveButton = button("Simpan sistem", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    onClick: () => form.requestSubmit(),
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const retention = Number.parseInt(
      String(form.elements.namedItem("daily_backup_retention_days")?.value || ""),
      10,
    );
    const databaseRetention = Number.parseInt(
      String(form.elements.namedItem("database_backup_retention_days")?.value || ""),
      10,
    );
    if (!Number.isInteger(retention) || retention < 1 || retention > 3650) {
      retentionField.input.setAttribute("aria-invalid", "true");
      retentionField.showError?.("Masukkan angka antara 1 dan 3.650 hari.");
      retentionField.input.focus();
      return;
    }
    if (!Number.isInteger(databaseRetention) || databaseRetention < 1 || databaseRetention > 3650) {
      databaseRetentionField.input.setAttribute("aria-invalid", "true");
      databaseRetentionField.showError?.("Masukkan angka antara 1 dan 3.650 hari.");
      databaseRetentionField.input.focus();
      return;
    }
    retentionField.input.removeAttribute("aria-invalid");
    retentionField.showError?.("");

    await runWithButtonBusy(saveButton, "Menyimpan…", async () => {
      try {
        await updateSettings({
          daily_backup_retention_days: retention,
          database_backup_retention_days: databaseRetention,
        });
        await updateAnalyticsSettings({
          ...analytics,
          daily_backup_retention_days: retention,
          backup_debounce_seconds: Number(
            form.elements.namedItem("backup_debounce_seconds")?.value,
          ),
          log_retention_days: Number(form.elements.namedItem("log_retention_days")?.value),
          confirm_destructive_actions: Boolean(
            form.elements.namedItem("confirm_destructive_actions")?.checked,
          ),
        });
        showToast({
          type: "success",
          title: "Sistem disimpan",
          message: "Retensi dan preferensi operasi diperbarui.",
        });
        context.refresh();
      } catch (error) {
        showApiError(error, "Pengaturan sistem gagal disimpan");
      }
    });
  });

  chrome?.setFooter?.({ end: [saveButton] });
  return settingsStack(form);
}

export function renderSecuritySection(_view, _context, chrome) {
  chrome?.setFooter?.({
    end: [
      button("Tutup aplikasi", {
        variant: "button-danger",
        iconName: "power",
        requiresConnection: true,
        onClick: () => {
          document.dispatchEvent(new CustomEvent("inventory:shutdown-request"));
        },
      }),
    ],
  });

  return settingsStack(
    element("div", {
      className: "advanced-settings-panel",
      children: [
        element("div", {
          className: "advanced-settings-grid",
          children: [
            settingsSection("Keamanan lokal", "Data utama dan server tetap berada di komputer ini.", [
              securityRow("server", "Hanya 127.0.0.1", "Tidak dapat diakses melalui LAN."),
              securityRow(
                "shield",
                "Permintaan terlindungi",
                "Host, origin, CSRF, dan idempotensi diperiksa.",
              ),
              securityRow(
                "database",
                "Data di komputer ini",
                "Google Drive hanya dipakai jika backup online diaktifkan pengguna.",
              ),
            ]),
            settingsSection(
              "Tutup aplikasi",
              "Selesaikan backup tertunda lalu hentikan server lokal dengan aman.",
              [
                element("p", {
                  className: "muted settings-note",
                  text: "Gunakan sebelum memindahkan folder aplikasi atau mematikan komputer. Tombol ada di footer.",
                }),
              ],
            ),
          ],
        }),
      ],
    }),
  );
}

function securityRow(iconName, title, description) {
  return element("div", {
    className: "settings-info-row",
    children: [
      element("span", {
        className: "movement-icon movement-adjustment",
        children: [icon(iconName)],
      }),
      element("div", {
        className: "list-copy",
        children: [
          element("strong", { text: title }),
          element("small", { text: description }),
        ],
      }),
    ],
  });
}
