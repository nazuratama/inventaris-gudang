import { element, icon } from "../utils/dom.js";

export function createFormField(options) {
  const fieldId = options.id || `field-${options.name}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  let input;

  if (options.type === "select") {
    input = element("select", {
      attributes: {
        id: fieldId,
        name: options.name,
        required: options.required || undefined,
        "aria-describedby": `${helpId} ${errorId}`,
      },
    });
    for (const option of options.options || []) {
      input.append(
        element("option", {
          text: option.label,
          attributes: { value: option.value ?? "" },
          properties: { selected: String(option.value ?? "") === String(options.value ?? "") },
        }),
      );
    }
  } else if (options.type === "textarea") {
    input = element("textarea", {
      attributes: {
        id: fieldId,
        name: options.name,
        placeholder: options.placeholder,
        maxlength: options.maxLength,
        rows: options.rows || 3,
        required: options.required || undefined,
        "aria-describedby": `${helpId} ${errorId}`,
      },
      properties: { value: options.value ?? "" },
    });
  } else {
    input = element("input", {
      attributes: {
        id: fieldId,
        name: options.name,
        type: options.type || "text",
        placeholder: options.placeholder,
        maxlength: options.maxLength,
        min: options.min,
        max: options.max,
        step: options.step,
        required: options.required || undefined,
        autocomplete: options.autocomplete || "off",
        inputmode: options.inputMode,
        "aria-describedby": `${helpId} ${errorId}`,
      },
      properties: { value: options.value ?? "" },
    });
  }

  if (options.onInput) {
    input.addEventListener("input", options.onInput);
  }
  if (options.onChange) {
    input.addEventListener("change", options.onChange);
  }

  const labelChildren = [options.label];
  if (options.required) {
    labelChildren.push(
      element("span", {
        className: "required-mark",
        text: "*",
        attributes: { "aria-hidden": "true" },
      }),
    );
  }

  const helpText = String(options.help || "").trim();
  const compact = Boolean(options.compact);
  const children = [
    element("label", {
      attributes: { for: fieldId },
      children: labelChildren,
    }),
    input,
  ];

  // Only mount help when text exists — empty help/error nodes reserved vertical space
  // even when hidden via min-height rules in the global form stylesheet.
  if (helpText || options.alwaysShowHelp) {
    children.push(
      element("div", {
        className: "field-help",
        text: helpText,
        attributes: { id: helpId },
      }),
    );
    input.setAttribute("aria-describedby", `${helpId} ${errorId}`);
  } else {
    input.setAttribute("aria-describedby", errorId);
  }

  // Error node is created lazily in showError() for compact fields.
  let error = null;
  if (!compact) {
    error = element("div", {
      className: "field-error",
      attributes: { id: errorId, "aria-live": "polite", hidden: true },
    });
    children.push(error);
  }

  const wrapper = element("div", {
    className: [
      "form-field",
      options.wide ? "form-field-wide" : "",
      compact ? "form-field-compact" : "",
    ],
    children,
  });

  return {
    wrapper,
    input,
    get error() {
      return error || wrapper.querySelector(`#${errorId}`);
    },
    showError(message) {
      if (!error) {
        error = element("div", {
          className: "field-error",
          attributes: { id: errorId, "aria-live": "polite" },
        });
        wrapper.append(error);
      }
      const text = String(message || "");
      error.hidden = !text;
      error.textContent = text;
      if (!text && compact && error.parentNode) {
        error.remove();
        error = null;
      }
    },
  };
}

export function applyFieldErrors(form, errors) {
  for (const input of form.querySelectorAll("[name]")) {
    input.removeAttribute("aria-invalid");
    const errorNode = form.querySelector(`#${input.id}-error`);
    if (errorNode) {
      errorNode.textContent = "";
      errorNode.hidden = true;
    }
  }

  for (const [name, message] of Object.entries(errors || {})) {
    const input = form.elements.namedItem(name);
    if (!(input instanceof HTMLElement)) {
      continue;
    }
    input.setAttribute("aria-invalid", "true");
    const errorNode = form.querySelector(`#${input.id}-error`);
    if (errorNode) {
      errorNode.textContent = String(message);
      errorNode.hidden = !message;
    }
  }
}

export function createErrorSummary(message) {
  return element("div", {
    className: "form-error-summary",
    attributes: { role: "alert", tabindex: "-1" },
    children: [icon("alert-triangle"), element("span", { text: message })],
  });
}

export function getFormValues(form) {
  const values = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    values[key] = typeof value === "string" ? value : value.name;
  }
  return values;
}

export function trackFormDirty(form, initialValues) {
  const normalizedInitial = JSON.stringify(initialValues);
  return () => JSON.stringify(getFormValues(form)) !== normalizedInitial;
}
