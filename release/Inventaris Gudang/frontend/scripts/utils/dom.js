const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const ICON_SPRITE_PATH = "/assets/icons/sprite.svg";

/**
 * Create a DOM element without parsing HTML. Dynamic values are always assigned as
 * properties or text nodes so inventory data cannot become executable markup.
 */
function normalizeClassNames(className) {
  const tokens = Array.isArray(className) ? className.flat(Infinity) : [className];
  return tokens
    .filter((token) => token !== undefined && token !== null && token !== false && token !== "")
    .flatMap((token) => String(token).split(/\s+/))
    .filter(Boolean);
}

export function element(tagName, options = {}) {
  const node = document.createElement(tagName);

  if (options.className) {
    const classNames = normalizeClassNames(options.className);
    if (classNames.length) {
      node.classList.add(...classNames);
    }
  }

  if (options.text !== undefined && options.text !== null) {
    node.textContent = String(options.text);
  }

  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      if (value === undefined || value === null || value === false) {
        continue;
      }
      if (value === true) {
        node.setAttribute(name, "");
      } else {
        node.setAttribute(name, String(value));
      }
    }
  }

  if (options.dataset) {
    for (const [name, value] of Object.entries(options.dataset)) {
      if (value !== undefined && value !== null) {
        node.dataset[name] = String(value);
      }
    }
  }

  if (options.properties) {
    Object.assign(node, options.properties);
  }

  const eventMap = { ...(options.events || {}) };
  // Accept React-like onClick/onInput aliases so handlers are not silently dropped.
  if (typeof options.onClick === "function") {
    eventMap.click = options.onClick;
  }
  if (typeof options.onInput === "function") {
    eventMap.input = options.onInput;
  }
  if (typeof options.onChange === "function") {
    eventMap.change = options.onChange;
  }
  if (typeof options.onSubmit === "function") {
    eventMap.submit = options.onSubmit;
  }
  for (const [eventName, handler] of Object.entries(eventMap)) {
    if (typeof handler === "function") {
      node.addEventListener(eventName, handler);
    }
  }

  appendChildren(node, options.children);
  return node;
}

export function appendChildren(parent, children) {
  if (children === undefined || children === null) {
    return parent;
  }

  const childList = Array.isArray(children) ? children.flat(Infinity) : [children];
  for (const child of childList) {
    if (child === undefined || child === null || child === false) {
      continue;
    }
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function fragment(...children) {
  const result = document.createDocumentFragment();
  appendChildren(result, children);
  return result;
}

export function icon(name, options = {}) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("icon");
  if (options.className) {
    svg.classList.add(...String(options.className).split(/\s+/).filter(Boolean));
  }

  const use = document.createElementNS(SVG_NAMESPACE, "use");
  use.setAttribute("href", `${ICON_SPRITE_PATH}#${name}`);
  svg.append(use);

  if (options.label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", options.label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  return svg;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

export function replace(node, ...children) {
  node.replaceChildren();
  appendChildren(node, children);
  return node;
}

export function button(label, options = {}) {
  const children = [];
  if (options.iconName) {
    children.push(icon(options.iconName));
  }
  if (label) {
    children.push(element("span", { text: label }));
  }

  // Infer modal role for Enter/Esc shortcuts when not set explicitly.
  let modalAction = options.modalAction || null;
  if (!modalAction) {
    const variant = options.variant || "button-neutral";
    const text = String(label || options.ariaLabel || "").toLowerCase();
    if (
      text.includes("batal") ||
      text.includes("tutup") ||
      text.includes("cancel") ||
      text.includes("close")
    ) {
      modalAction = "cancel";
    } else if (
      variant === "button-primary" ||
      variant === "button-success" ||
      variant === "button-danger" ||
      text.includes("simpan") ||
      text.includes("tambah") ||
      text.includes("hapus") ||
      text.includes("lanjut") ||
      text.includes("ya")
    ) {
      modalAction = "submit";
    }
  }

  return element("button", {
    className: [
      "button",
      options.variant || "button-neutral",
      ...(Array.isArray(options.className)
        ? options.className
        : options.className
          ? [options.className]
          : []),
    ],
    attributes: {
      type: options.type || "button",
      title: options.title,
      "aria-label": options.ariaLabel,
      "data-requires-connection": options.requiresConnection || undefined,
      "data-modal-action": modalAction || undefined,
    },
    properties: {
      disabled: Boolean(options.disabled),
    },
    events: options.onClick ? { click: options.onClick } : undefined,
    children,
  });
}

export function badge(text, tone = "neutral") {
  return element("span", {
    className: ["badge", `badge-${tone}`],
    text,
  });
}

export function getFocusableElements(container) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  return [...container.querySelectorAll(selector)].filter(
    (node) => !node.hidden && node.getAttribute("aria-hidden") !== "true",
  );
}

export function isTextEntryTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

export async function runWithButtonBusy(buttonNode, busyLabel, operation) {
  if (buttonNode.dataset.busy === "true") {
    return undefined;
  }

  const originalChildren = [...buttonNode.childNodes].map((node) => node.cloneNode(true));
  buttonNode.dataset.busy = "true";
  buttonNode.disabled = true;
  buttonNode.replaceChildren(
    element("span", { className: "spinner", attributes: { "aria-hidden": "true" } }),
    element("span", { text: busyLabel }),
  );

  try {
    return await operation();
  } finally {
    buttonNode.replaceChildren(...originalChildren);
    const connectionRequired = buttonNode.hasAttribute("data-requires-connection");
    buttonNode.disabled =
      connectionRequired && document.documentElement.dataset.connected !== "true";
    delete buttonNode.dataset.busy;
  }
}

export function announce(message) {
  const region = document.getElementById("toastRegion");
  if (region) {
    region.setAttribute("aria-label", String(message));
    window.setTimeout(() => region.removeAttribute("aria-label"), 1000);
  }
}
