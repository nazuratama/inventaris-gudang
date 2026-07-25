import { getFocusableElements, replace } from "../utils/dom.js";

const root = document.getElementById("drawerRoot");
const drawer = root.querySelector(".drawer");
const backdrop = root.querySelector(".drawer-backdrop");
const closeButton = root.querySelector(".drawer-close");
const titleNode = document.getElementById("drawerTitle");
const eyebrowNode = document.getElementById("drawerEyebrow");
const contentNode = document.getElementById("drawerContent");

let activeOptions = null;
let returnFocusNode = null;

export function openDrawer(options) {
  if (!root.hidden) {
    closeDrawer({ restoreFocus: false });
  }

  activeOptions = options;
  returnFocusNode =
    options.returnFocus instanceof HTMLElement ? options.returnFocus : document.activeElement;
  titleNode.textContent = options.title || "Detail";
  eyebrowNode.textContent = options.eyebrow || "";
  eyebrowNode.hidden = !options.eyebrow;
  replace(contentNode, options.content);
  root.hidden = false;
  document.body.classList.add("drawer-open");
  document.dispatchEvent(new CustomEvent("inventory:layout-change"));
  window.requestAnimationFrame(() => {
    (options.initialFocus || drawer).focus();
  });
}

export function updateDrawer(options = {}) {
  if (root.hidden) {
    return;
  }
  if (options.title !== undefined) {
    titleNode.textContent = options.title;
  }
  if (options.eyebrow !== undefined) {
    eyebrowNode.textContent = options.eyebrow;
    eyebrowNode.hidden = !options.eyebrow;
  }
  if (options.content !== undefined) {
    replace(contentNode, options.content);
  }
}

export function closeDrawer(options = {}) {
  if (root.hidden) {
    return;
  }
  root.hidden = true;
  document.body.classList.remove("drawer-open");
  replace(contentNode);
  document.dispatchEvent(new CustomEvent("inventory:layout-change"));
  activeOptions?.onClose?.();
  activeOptions = null;

  if (options.restoreFocus !== false && returnFocusNode?.isConnected) {
    returnFocusNode.focus();
  }
  returnFocusNode = null;
}

export function isDrawerOpen() {
  return !root.hidden;
}

function handleKeydown(event) {
  if (root.hidden || document.querySelector("dialog[open]")) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeDrawer();
    return;
  }
  if (event.key !== "Tab") {
    return;
  }

  const focusable = getFocusableElements(drawer);
  if (focusable.length === 0) {
    event.preventDefault();
    drawer.focus();
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

backdrop.addEventListener("click", () => closeDrawer());
closeButton.addEventListener("click", () => closeDrawer());
document.addEventListener("keydown", handleKeydown);
