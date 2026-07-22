import { element } from "../../utils/dom.js";

export function settingsStack(...children) {
  return element("div", {
    className: "settings-window-stack settings-window-stack-compact",
    children,
  });
}

