import { button, element, getFocusableElements, icon, replace } from "../utils/dom.js";

const dialog = document.getElementById("appDialog");
const titleNode = document.getElementById("dialogTitle");
const eyebrowNode = document.getElementById("dialogEyebrow");
const descriptionNode = document.getElementById("dialogDescription");
const bodyNode = document.getElementById("dialogBody");
const footerNode = document.getElementById("dialogFooter");
const closeButton = dialog.querySelector(".modal-close");

let activeOptions = null;
let returnFocusNode = null;
let closeInProgress = false;
/** Parked parent modals so child forms (masuk/keluar) can restore them. */
const modalStack = [];

export function openModal(options) {
  if (dialog.open || modalStack.length) {
    if (options.preserveParent && dialog.open) {
      parkCurrentModal();
    } else {
      // Fully close current + stacked parents (sync — avoid race with async closeModal).
      forceCloseAllModals();
    }
  }

  paintModal(options);
  dialog.showModal();
  window.requestAnimationFrame(() => {
    const focusTarget =
      options.initialFocus instanceof HTMLElement
        ? options.initialFocus
        : getFocusableElements(dialog)[0];
    focusTarget?.focus();
  });

  return {
    close: (settings) => closeModal(settings),
    body: bodyNode,
    footer: footerNode,
  };
}

function forceCloseAllModals() {
  if (dialog.open) {
    const closingOptions = activeOptions;
    dialog.close();
    closingOptions?.onClose?.();
    activeOptions = null;
    replace(bodyNode);
    replace(footerNode);
    delete dialog.dataset.size;
    dialog.className = "modal";
  }
  discardParkedModals();
  returnFocusNode = null;
}

function paintModal(options) {
  activeOptions = {
    closeOnEscape: true,
    submitOnEnter: true,
    ...options,
  };
  // Always start from a clean dialog chrome so child forms (masuk/keluar)
  // never inherit parent classes like item-history / settings-window.
  dialog.className = "modal";
  if (Array.isArray(options.dialogClasses)) {
    for (const name of options.dialogClasses) {
      if (name) {
        dialog.classList.add(name);
      }
    }
  }
  dialog.dataset.size = options.size || "default";
  returnFocusNode =
    options.returnFocus instanceof HTMLElement ? options.returnFocus : document.activeElement;
  eyebrowNode.textContent = options.eyebrow || "";
  eyebrowNode.hidden = !options.eyebrow;
  titleNode.textContent = options.title || "Dialog";
  descriptionNode.textContent = options.description || "";
  descriptionNode.hidden = !options.description;
  replace(bodyNode, options.body);
  setModalFooter(options.footer);
  dialog.setAttribute("aria-labelledby", "dialogTitle");
  if (options.description) {
    dialog.setAttribute("aria-describedby", "dialogDescription");
  } else {
    dialog.removeAttribute("aria-describedby");
  }
}

/** Render footer actions; hide the bar when empty (X in header closes the dialog). */
function setModalFooter(footer) {
  if (footer === undefined || footer === null) {
    replace(footerNode);
    footerNode.hidden = true;
    return;
  }
  replace(footerNode, footer);
  annotateModalActions(footerNode);
  const hasActions = Boolean(footerNode.querySelector("button, a, input, select"));
  footerNode.hidden = !hasActions;
}

function parkCurrentModal() {
  if (!dialog.open || !activeOptions) {
    return;
  }
  modalStack.push({
    options: activeOptions,
    size: dialog.dataset.size || "default",
    extraClasses: [...dialog.classList].filter((name) => name !== "modal"),
    eyebrow: eyebrowNode.textContent,
    eyebrowHidden: eyebrowNode.hidden,
    title: titleNode.textContent,
    description: descriptionNode.textContent,
    descriptionHidden: descriptionNode.hidden,
    bodyNodes: [...bodyNode.childNodes],
    footerNodes: [...footerNode.childNodes],
    returnFocus: returnFocusNode,
  });
  // Hide without parent onClose — parent stays "alive" for restore + reload.
  dialog.close();
  activeOptions = null;
  replace(bodyNode);
  replace(footerNode);
  delete dialog.dataset.size;
  // Strip parent chrome so the next openModal paints a clean shared form shell.
  dialog.className = "modal";
}

function restoreParkedModal() {
  const parked = modalStack.pop();
  if (!parked) {
    return false;
  }
  activeOptions = parked.options;
  dialog.dataset.size = parked.size || "default";
  // Keep base .modal; re-apply extra dialog classes (item-history, calendar, etc.).
  dialog.className = "modal";
  for (const name of parked.extraClasses || []) {
    if (name) {
      dialog.classList.add(name);
    }
  }
  eyebrowNode.textContent = parked.eyebrow || "";
  eyebrowNode.hidden = Boolean(parked.eyebrowHidden);
  titleNode.textContent = parked.title || "Dialog";
  descriptionNode.textContent = parked.description || "";
  descriptionNode.hidden = Boolean(parked.descriptionHidden);
  bodyNode.replaceChildren(...parked.bodyNodes);
  footerNode.replaceChildren(...parked.footerNodes);
  annotateModalActions(footerNode);
  returnFocusNode = parked.returnFocus || null;
  dialog.setAttribute("aria-labelledby", "dialogTitle");
  if (parked.description && !parked.descriptionHidden) {
    dialog.setAttribute("aria-describedby", "dialogDescription");
  } else {
    dialog.removeAttribute("aria-describedby");
  }
  dialog.showModal();
  return true;
}

function discardParkedModals() {
  while (modalStack.length) {
    const parked = modalStack.pop();
    // Fully abandon parent windows.
    parked.options?.onClose?.();
  }
}

export function updateModal(options = {}) {
  if (!dialog.open) {
    return;
  }
  if (options.size !== undefined) {
    dialog.dataset.size = options.size;
  }
  // Keep fixed chrome classes stable across body repaints (e.g. history filter changes).
  if (Array.isArray(options.dialogClasses)) {
    dialog.className = "modal";
    for (const name of options.dialogClasses) {
      if (name) {
        dialog.classList.add(name);
      }
    }
  }
  if (options.eyebrow !== undefined) {
    eyebrowNode.textContent = options.eyebrow || "";
    eyebrowNode.hidden = !options.eyebrow;
  }
  if (options.title !== undefined) {
    titleNode.textContent = options.title || "Dialog";
  }
  if (options.description !== undefined) {
    descriptionNode.textContent = options.description || "";
    descriptionNode.hidden = !options.description;
  }
  if (options.body !== undefined) {
    replace(bodyNode, options.body);
  }
  if (options.footer !== undefined) {
    setModalFooter(options.footer);
  }
  if (options.closeOnEscape !== undefined && activeOptions) {
    activeOptions.closeOnEscape = options.closeOnEscape;
  }
  if (options.submitOnEnter !== undefined && activeOptions) {
    activeOptions.submitOnEnter = options.submitOnEnter;
  }
}

export async function closeModal(options = {}) {
  if ((!dialog.open && !modalStack.length) || closeInProgress) {
    return true;
  }

  closeInProgress = true;
  try {
    if (dialog.open) {
      if (!options.force && typeof activeOptions?.canClose === "function") {
        const mayClose = await activeOptions.canClose();
        if (!mayClose) {
          return false;
        }
      }

      const closingOptions = activeOptions;
      dialog.close();
      // Child cleanup only — parent parked windows keep their onClose until discarded.
      closingOptions?.onClose?.();
      activeOptions = null;
      replace(bodyNode);
      replace(footerNode);
      delete dialog.dataset.size;
      dialog.className = "modal";
    }

    if (options.discardStack) {
      discardParkedModals();
    } else if (modalStack.length) {
      restoreParkedModal();
      return true;
    }

    dialog.className = "modal";
    if (options.restoreFocus !== false && returnFocusNode?.isConnected) {
      returnFocusNode.focus();
    }
    returnFocusNode = null;
    return true;
  } finally {
    closeInProgress = false;
  }
}

export function isModalOpen() {
  return Boolean(dialog.open);
}

export function hasParkedModal() {
  return modalStack.length > 0;
}

export function confirmAction(options) {
  return new Promise((resolve) => {
    const confirmDialog = element("dialog", {
      className: ["modal", "confirm-dialog"],
      attributes: {
        "aria-labelledby": "confirmationTitle",
        "aria-describedby": "confirmationMessage",
      },
    });
    const focusOrigin = document.activeElement;
    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      confirmDialog.close();
      confirmDialog.remove();
      if (focusOrigin instanceof HTMLElement && focusOrigin.isConnected) {
        focusOrigin.focus();
      }
      resolve(result);
    };

    const cancelButton = button(options.cancelLabel || "Batal", {
      onClick: () => settle(false),
    });
    cancelButton.dataset.modalAction = "cancel";
    const confirmButton = button(options.confirmLabel || "Lanjutkan", {
      variant: options.danger ? "button-danger" : "button-primary",
      onClick: () => settle(true),
    });
    confirmButton.dataset.modalAction = "submit";
    const shell = element("div", {
      className: "modal-shell",
      children: [
        element("header", {
          className: "modal-header",
          children: [
            element("div", {
              children: [
                element("p", {
                  className: "eyebrow",
                  text: options.eyebrow || "Konfirmasi",
                }),
                element("h2", {
                  text: options.title || "Konfirmasi tindakan",
                  attributes: { id: "confirmationTitle" },
                }),
                element("p", {
                  className: "modal-description",
                  text: options.message || "Pastikan Anda ingin melanjutkan.",
                  attributes: { id: "confirmationMessage" },
                }),
              ],
            }),
            element("button", {
              className: "icon-button",
              attributes: { type: "button", "aria-label": "Batal dan tutup" },
              events: { click: () => settle(false) },
              children: [icon("close")],
            }),
          ],
        }),
        options.detail
          ? element("div", {
              className: "modal-body",
              children: [
                element("div", {
                  className: [
                    "inline-alert",
                    options.danger ? "inline-alert-danger" : "inline-alert-warning",
                  ],
                  children: [
                    icon(options.danger ? "alert-triangle" : "info"),
                    element("div", { text: options.detail }),
                  ],
                }),
              ],
            })
          : element("div", { className: "modal-body", attributes: { hidden: true } }),
        element("footer", {
          className: "modal-footer",
          children: [cancelButton, confirmButton],
        }),
      ],
    });

    confirmDialog.append(shell);
    document.body.append(confirmDialog);
    confirmDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      settle(false);
    });
    confirmDialog.addEventListener("keydown", (event) => {
      trapFocus(event, confirmDialog);
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }
      if (shouldIgnoreEnterForSubmit(event.target)) {
        return;
      }
      // Enter confirms the destructive/primary action (except when on Cancel).
      if (event.target === cancelButton) {
        return;
      }
      event.preventDefault();
      if (!confirmButton.disabled && confirmButton.dataset.busy !== "true") {
        confirmButton.click();
      }
    });
    confirmDialog.showModal();
    confirmButton.focus();
  });
}

/**
 * Mark footer buttons so Enter/Esc routing is predictable across all dialogs.
 * Primary confirms; cancel dismisses; X closes dialogs without a footer.
 */
function annotateModalActions(footer) {
  if (!footer) {
    return;
  }
  const buttons = [...footer.querySelectorAll("button")];
  for (const btn of buttons) {
    if (btn.dataset.modalAction) {
      continue;
    }
    const label = (btn.textContent || "").trim().toLowerCase();
    const isCancel =
      btn.classList.contains("button-neutral") &&
      !btn.classList.contains("button-primary") &&
      !btn.classList.contains("button-success") &&
      !btn.classList.contains("button-danger") &&
      (label.includes("batal") ||
        label.includes("tutup") ||
        label.includes("cancel") ||
        label.includes("close"));
    const isPrimary =
      btn.classList.contains("button-primary") ||
      btn.classList.contains("button-success") ||
      btn.classList.contains("button-danger");
    if (isCancel) {
      btn.dataset.modalAction = "cancel";
    } else if (isPrimary) {
      btn.dataset.modalAction = "submit";
    }
  }
}

function findSubmitControl(root = dialog) {
  return (
    root.querySelector('[data-modal-action="submit"]:not([disabled])') ||
    root.querySelector(
      "footer .button-primary:not([disabled]), footer .button-success:not([disabled]), footer .button-danger:not([disabled])",
    )
  );
}

function findCancelControl(root = dialog) {
  return (
    root.querySelector('[data-modal-action="cancel"]:not([disabled])') ||
    root.querySelector(".modal-close")
  );
}

function shouldIgnoreEnterForSubmit(target) {
  if (!(target instanceof HTMLElement)) {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A" || tag === "SUMMARY") {
    return true;
  }
  if (tag === "INPUT") {
    const type = String(target.getAttribute("type") || "text").toLowerCase();
    if (
      [
        "button",
        "submit",
        "reset",
        "checkbox",
        "radio",
        "file",
        "color",
        "range",
        "image",
      ].includes(type)
    ) {
      return true;
    }
  }
  return false;
}

function submitActiveFormOrPrimary(event) {
  if (activeOptions?.submitOnEnter === false) {
    return false;
  }
  if (shouldIgnoreEnterForSubmit(event.target)) {
    return false;
  }

  const target = event.target instanceof Element ? event.target : null;
  const forms = [...bodyNode.querySelectorAll("form")];
  // Detail/history windows without forms must not fire primary footer actions on Enter.
  if (forms.length === 0) {
    return false;
  }

  const form =
    (target?.closest?.("form") && dialog.contains(target.closest("form"))
      ? target.closest("form")
      : null) || forms[0];

  if (form && dialog.contains(form)) {
    const focusInsideForm = target && form.contains(target);
    const focusInBody = target && bodyNode.contains(target);
    if (focusInsideForm || focusInBody) {
      event.preventDefault();
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
      return true;
    }
  }

  // Footer-only primary (rare): only when focus is already on footer controls.
  const submitButton = findSubmitControl(dialog);
  if (
    submitButton &&
    submitButton.dataset.busy !== "true" &&
    !submitButton.disabled &&
    target &&
    footerNode.contains(target) &&
    target !== submitButton
  ) {
    event.preventDefault();
    submitButton.click();
    return true;
  }

  return false;
}

function trapFocus(event, container) {
  if (event.key !== "Tab") {
    return;
  }
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleDialogKeydown(event) {
  trapFocus(event, dialog);

  // Nested confirm dialogs handle their own keys.
  if (document.querySelector(".confirm-dialog[open]")) {
    return;
  }

  if (event.key === "Escape") {
    if (activeOptions?.closeOnEscape === false) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    // Prefer explicit cancel control if present (same as Batal).
    const cancel = findCancelControl(dialog);
    if (cancel && cancel !== closeButton && cancel.dataset.busy !== "true") {
      cancel.click();
      return;
    }
    void closeModal();
    return;
  }

  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.isComposing
  ) {
    submitActiveFormOrPrimary(event);
  }
}

closeButton.addEventListener("click", () => closeModal());
dialog.addEventListener("cancel", (event) => {
  // Native dialog Escape — we own the close path (canClose / force rules).
  event.preventDefault();
  if (document.querySelector(".confirm-dialog[open]")) {
    return;
  }
  if (activeOptions?.closeOnEscape === false) {
    return;
  }
  void closeModal();
});
// Capture phase so Enter/Esc work before inputs/selects swallow the keys.
dialog.addEventListener("keydown", handleDialogKeydown, true);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    void closeModal();
  }
});
