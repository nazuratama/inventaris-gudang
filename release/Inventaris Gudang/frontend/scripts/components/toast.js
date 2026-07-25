import { element, icon } from "../utils/dom.js";

const DEFAULT_DURATION = 4200;

export function showToast(options) {
  const settings =
    typeof options === "string" ? { title: options } : { type: "info", ...options };
  const region = document.getElementById("toastRegion");
  if (!region) {
    return () => {};
  }

  const type = ["success", "warning", "error", "info"].includes(settings.type)
    ? settings.type
    : "info";
  const iconNames = {
    success: "check-circle",
    warning: "alert-triangle",
    error: "alert-triangle",
    info: "info",
  };

  const toast = element("section", {
    className: ["toast", `toast-${type}`],
    attributes: {
      role: type === "error" ? "alert" : "status",
    },
  });
  const dismiss = () => {
    if (!toast.isConnected || toast.classList.contains("is-leaving")) {
      return;
    }
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 220);
  };

  const copy = element("div", {
    children: [
      element("strong", { text: settings.title || "Pemberitahuan" }),
      settings.message ? element("p", { text: settings.message }) : null,
    ],
  });
  const closeButton = element("button", {
    className: ["icon-button", "toast-close"],
    attributes: {
      type: "button",
      "aria-label": "Tutup pemberitahuan",
    },
    events: { click: dismiss },
    children: [icon("close")],
  });

  toast.append(
    element("span", {
      className: "toast-icon",
      children: [icon(iconNames[type])],
    }),
    copy,
    closeButton,
  );
  region.append(toast);

  if (!settings.persistent) {
    window.setTimeout(dismiss, settings.duration || DEFAULT_DURATION);
  }
  return dismiss;
}

export function showApiError(error, fallbackTitle = "Tindakan gagal") {
  showToast({
    type: error?.isNetworkError ? "warning" : "error",
    title: fallbackTitle,
    message: error?.message || "Permintaan tidak dapat diproses.",
    duration: 6000,
  });
}
