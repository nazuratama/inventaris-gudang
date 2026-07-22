import { openItemForm } from "../components/item-form.js";
import { appState } from "../state/app-state.js";
import { element, getFocusableElements, icon, replace } from "../utils/dom.js";
import { openSettingsWindow } from "../pages/settings.js?v=20260717-settings1";

function trapDialogFocus(event, dialog) {
  const focusable = getFocusableElements(dialog);
  if (!focusable.length) {
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

export function createCommandPalette(router) {
  function open() {
    const dialog = document.getElementById("commandDialog");
    const input = document.getElementById("commandSearch");
    const results = document.getElementById("commandResults");
    const commands = [
      {
        label: "Buka Dasbor",
        iconName: "dashboard",
        action: () => router.navigate("dashboard"),
      },
      {
        label: "Buka Inventaris",
        iconName: "package",
        action: () => router.navigate("inventory"),
      },
      {
        label: "Buka Analitik",
        iconName: "chart",
        action: () => router.navigate("analytics"),
      },
      {
        label: "Buka Backup dan Ekspor",
        iconName: "backup",
        action: () => router.navigate("backups"),
      },
      {
        label: "Buka Pengaturan",
        iconName: "settings",
        action: () =>
          openSettingsWindow({
            navigate: (name, params, options) => router.navigate(name, params, options),
            returnFocus: document.getElementById("commandButton"),
          }),
      },
      {
        label: "Tambah barang baru",
        iconName: "plus",
        shortcut: "N",
        action: () => openItemForm({ onSaved: router.refresh }),
        mutation: true,
      },
    ];
    let filteredCommands = commands;
    let selectedIndex = 0;

    function activate(command) {
      dialog.close();
      command.action();
    }

    function renderCommands() {
      replace(results);
      if (filteredCommands.length === 0) {
        results.append(
          element("p", {
            className: "muted",
            text: "Tidak ada perintah yang cocok.",
          }),
        );
        return;
      }
      filteredCommands.forEach((command, index) => {
        results.append(
          element("button", {
            className: "command-option",
            attributes: {
              type: "button",
              role: "option",
              "aria-selected": index === selectedIndex ? "true" : "false",
              disabled: command.mutation && !appState.get("connected"),
            },
            events: {
              mouseenter: () => {
                selectedIndex = index;
                renderCommands();
              },
              click: () => activate(command),
            },
            children: [
              icon(command.iconName),
              element("span", { text: command.label }),
              command.shortcut ? element("kbd", { text: command.shortcut }) : null,
            ],
          }),
        );
      });
    }

    const inputHandler = () => {
      const query = input.value.trim().toLocaleLowerCase("id-ID");
      filteredCommands = commands.filter((command) =>
        command.label.toLocaleLowerCase("id-ID").includes(query),
      );
      selectedIndex = 0;
      renderCommands();
    };
    const keyHandler = (event) => {
      if (event.key === "ArrowDown" && filteredCommands.length) {
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        renderCommands();
        results.querySelector("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
      } else if (event.key === "ArrowUp" && filteredCommands.length) {
        event.preventDefault();
        selectedIndex =
          (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderCommands();
        results.querySelector("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter" && filteredCommands[selectedIndex]) {
        event.preventDefault();
        activate(filteredCommands[selectedIndex]);
      } else if (event.key === "Tab") {
        trapDialogFocus(event, dialog);
      }
    };
    const cleanup = () => {
      input.removeEventListener("input", inputHandler);
      dialog.removeEventListener("keydown", keyHandler);
      dialog.removeEventListener("close", cleanup);
    };

    input.value = "";
    renderCommands();
    if (!dialog.open) {
      dialog.showModal();
    }
    window.requestAnimationFrame(() => input.focus());
    input.addEventListener("input", inputHandler);
    dialog.addEventListener("keydown", keyHandler);
    dialog.addEventListener("close", cleanup);
  }

  function install() {
    document.getElementById("commandButton").addEventListener("click", open);
  }

  return { install, open };
}
