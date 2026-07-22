import { getHealth } from "../api/dashboard-api.js";
import { getAnalyticsSettings, getDemoStatus } from "../api/analytics-api.js";
import {
  getCloudBackupStatus,
  getSettings,
  getUpdateStatus,
} from "../api/settings-api.js";
import { closeModal, openModal } from "../components/modal.js";
import { createErrorState, createPageLoading } from "../components/states.js";
import { badge, button, element, icon, replace } from "../utils/dom.js";

import {
  renderAccountSection,
  renderAnalyticsSection,
  renderAppearanceSection,
} from "./settings/general-sections.js";
import { createDemoDataCard } from "./settings/demo-data.js";
import { renderSecuritySection, renderSystemSection } from "./settings/system-sections.js";
import { settingsStack } from "./settings/shared.js";
import {
  renderCloudBackupSection,
  renderUpdatesSection,
} from "./settings/online-services.js";

const SETTINGS_SECTIONS = [
  {
    id: "account",
    label: "Akun",
    description: "Nama usaha dan foto",
    iconName: "warehouse",
  },
  {
    id: "appearance",
    label: "Tampilan",
    description: "Format tanggal dan halaman",
    iconName: "adjust",
  },
  {
    id: "analytics",
    label: "Analitik",
    description: "Grafik dan batas stok",
    iconName: "chart",
  },
  {
    id: "data",
    label: "Data contoh",
    description: "Data latihan opsional",
    iconName: "database",
  },
  {
    id: "system",
    label: "Sistem",
    description: "Status dan retensi",
    iconName: "server",
  },
  {
    id: "cloud-backup",
    label: "Backup online",
    description: "Google Drive opsional",
    iconName: "backup",
  },
  {
    id: "updates",
    label: "Pembaruan",
    description: "Rilis aplikasi terbaru",
    iconName: "refresh",
  },
  {
    id: "security",
    label: "Keamanan",
    description: "Akses lokal",
    iconName: "shield",
  },
];

/**
 * Open the Grok-style floating settings window.
 * Prefer this over navigating to a full settings page.
 */
export async function openSettingsWindow(options = {}) {
  const dialogEl = document.getElementById("appDialog");
  const initialSection = SETTINGS_SECTIONS.some((entry) => entry.id === options.section)
    ? options.section
    : "account";

  const state = {
    section: initialSection,
    view: null,
    controller: new AbortController(),
  };

  const navHost = element("nav", {
    className: "settings-window-nav",
    attributes: { "aria-label": "Bagian pengaturan" },
  });
  const contentHost = element("div", {
    className: "settings-window-content",
    attributes: { tabindex: "-1" },
  });
  const footerStart = element("div", { className: "modal-footer-start" });
  const footerEnd = element("div", { className: "modal-footer-end" });
  const shell = element("div", {
    className: "settings-window",
    children: [
      navHost,
      element("div", {
        className: "settings-window-main",
        children: [contentHost],
      }),
    ],
  });

  const context = {
    signal: state.controller.signal,
    navigate: (route, params = {}, navOptions = {}) => {
      void closeModal({ force: true });
      if (typeof options.navigate === "function") {
        options.navigate(route, params, navOptions);
        return;
      }
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params || {})) {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, String(value));
        }
      }
      const suffix = query.toString() ? `?${query.toString()}` : "";
      window.location.hash = `#/${route}${suffix}`;
    },
    refresh: () => reloadAndPaint(),
  };

  function paintNav() {
    replace(
      navHost,
      SETTINGS_SECTIONS.map((entry) =>
        element("button", {
          className: [
            "settings-window-nav-item",
            entry.id === state.section ? "is-active" : null,
          ],
          attributes: {
            type: "button",
            "aria-current": entry.id === state.section ? "page" : undefined,
          },
          // element() wires handlers via `events`, not React-style onClick.
          events: {
            click: () => {
              if (state.section === entry.id) {
                return;
              }
              state.section = entry.id;
              paintNav();
              paintSection();
            },
          },
          children: [
            element("span", {
              className: "settings-window-nav-icon",
              children: [icon(entry.iconName)],
            }),
            element("span", {
              className: "settings-window-nav-copy",
              children: [
                element("strong", { text: entry.label }),
                element("small", { text: entry.description }),
              ],
            }),
          ],
        }),
      ),
    );
  }

  function paintSection() {
    replace(footerStart);
    replace(footerEnd);
    // The footer exposes section actions; the X button closes the window.
    const dialogFooter = document.getElementById("dialogFooter");
    if (dialogFooter) {
      dialogFooter.hidden = true;
    }

    if (!state.view) {
      replace(contentHost, createPageLoading(0));
      return;
    }

    const sectionMeta = SETTINGS_SECTIONS.find((entry) => entry.id === state.section);
    const header = element("header", {
      className: "settings-window-pane-header",
      children: [
        element("div", {
          children: [
            element("h3", { text: sectionMeta?.label || "Pengaturan" }),
            element("p", { text: sectionMeta?.description || "" }),
          ],
        }),
        badge(`v${state.view.health?.version || "1.0.0"}`, "neutral"),
      ],
    });

    let body;
    try {
      body = renderSettingsSection(state.section, state.view, context, {
        setFooter: ({ start = [], end = [] } = {}) => {
          replace(footerStart, start);
          replace(footerEnd, end);
          const footer = document.getElementById("dialogFooter");
          if (footer) {
            const hasActions = Boolean(footer.querySelector("button, a, input, select"));
            footer.hidden = !hasActions;
          }
        },
      });
    } catch (error) {
      body = createErrorState(error, () => reloadAndPaint());
    }

    const pane = element("div", {
      className: ["settings-window-pane", "is-pane-enter"],
      children: [header, body],
    });
    replace(contentHost, pane);
    contentHost.scrollTop = 0;
    window.setTimeout(() => {
      pane.classList.remove("is-pane-enter");
    }, 280);
  }

  async function reloadAndPaint() {
    replace(contentHost, createPageLoading(0));
    try {
      state.view = await loadSettingsView(state.controller.signal);
      paintSection();
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      replace(
        contentHost,
        element("div", {
          className: "settings-window-pane",
          children: [createErrorState(error, () => reloadAndPaint())],
        }),
      );
    }
  }

  dialogEl?.classList.add("settings-window-dialog");
  paintNav();
  openModal({
    size: "settings",
    eyebrow: "ALFAN TANI",
    title: "Pengaturan",
    description: "Preferensi lokal · sinkronisasi online hanya aktif jika Anda izinkan.",
    body: shell,
    footer: [footerStart, footerEnd],
    returnFocus: options.returnFocus,
    initialFocus: navHost.querySelector("button"),
    onClose: () => {
      state.controller.abort();
      dialogEl?.classList.remove("settings-window-dialog");
      options.onClose?.();
    },
  });

  await reloadAndPaint();
}

export async function mountSettings(context) {
  // Settings is no longer a full page — open the floating window and leave a soft landing.
  replace(
    context.container,
    element("div", {
      className: ["page-container", "settings-route-fallback"],
      children: [
        element("section", {
          className: "card",
          children: [
            element("div", {
              className: "card-body page-stack",
              children: [
                element("h2", { text: "Pengaturan" }),
                element("p", {
                  className: "muted",
                  text: "Pengaturan dibuka sebagai jendela mengambang. Anda dapat menutupnya kapan saja dan tetap di halaman kerja.",
                }),
                button("Buka pengaturan", {
                  variant: "button-primary",
                  iconName: "settings",
                  onClick: (event) =>
                    openSettingsWindow({
                      navigate: context.navigate,
                      returnFocus: event.currentTarget,
                    }),
                }),
                button("Kembali ke dasbor", {
                  className: "button-neutral",
                  onClick: () => context.navigate("dashboard", {}, { replace: true }),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  await openSettingsWindow({
    navigate: context.navigate,
    returnFocus: document.getElementById("accountMenuButton"),
    onClose: () => {
      const hash = window.location.hash || "";
      if (hash.startsWith("#/settings")) {
        context.navigate("dashboard", {}, { replace: true });
      }
    },
  });
}

async function loadSettingsView(signal) {
  const [settings, health, analytics, demo, cloud, updates] = await Promise.all([
    getSettings({ signal }),
    getHealth({ signal }),
    getAnalyticsSettings({ signal }),
    getDemoStatus({ signal }),
    getCloudBackupStatus({ signal }),
    getUpdateStatus({ signal }),
  ]);
  return { settings, health, analytics, demo, cloud, updates };
}

function renderSettingsSection(sectionId, view, context, chrome) {
  switch (sectionId) {
    case "account":
      return renderAccountSection(view, context, chrome);
    case "appearance":
      return renderAppearanceSection(view, context, chrome);
    case "analytics":
      return renderAnalyticsSection(view, context, chrome);
    case "data":
      return settingsStack(
        element("div", {
          className: "advanced-settings-panel",
          children: [
            element("div", {
              className: "advanced-settings-grid",
              children: [createDemoDataCard(view.demo || {}, context)],
            }),
          ],
        }),
      );
    case "system":
      return renderSystemSection(view, context, chrome);
    case "cloud-backup":
      return renderCloudBackupSection(view, context, chrome);
    case "updates":
      return renderUpdatesSection(view, context, chrome);
    case "security":
      return renderSecuritySection(view, context, chrome);
    default:
      return renderAccountSection(view, context, chrome);
  }
}
