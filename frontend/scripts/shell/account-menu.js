import { openSettingsWindow } from "../pages/settings.js?v=20260717-settings1";

export function createAccountMenu(elements, { navigate, openHelp, requestShutdown }) {
  const { accountMenuButton, accountMenuPopover, sidebarAccount } = elements;

  function open() {
    sidebarAccount.classList.add("is-open");
    accountMenuPopover.hidden = false;
    accountMenuButton.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      accountMenuPopover.querySelector("[data-account-action]")?.focus();
    });
  }

  function close() {
    if (!sidebarAccount?.classList.contains("is-open")) {
      return;
    }
    sidebarAccount.classList.remove("is-open");
    accountMenuPopover.hidden = true;
    accountMenuButton.setAttribute("aria-expanded", "false");
  }

  function install() {
    if (!accountMenuButton || !accountMenuPopover || !sidebarAccount) {
      return;
    }

    accountMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (sidebarAccount.classList.contains("is-open")) {
        close();
      } else {
        open();
      }
    });

    accountMenuPopover.addEventListener("click", (event) => {
      const actionButton = event.target.closest?.("[data-account-action]");
      if (!actionButton) {
        return;
      }
      const action = actionButton.dataset.accountAction;
      close();
      if (action === "settings") {
        openSettingsWindow({
          section: "account",
          navigate,
          returnFocus: accountMenuButton,
        });
        return;
      }
      if (action === "help") {
        openHelp();
        return;
      }
      if (action === "shutdown") {
        requestShutdown();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        sidebarAccount.classList.contains("is-open") &&
        !sidebarAccount.contains(event.target)
      ) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebarAccount.classList.contains("is-open")) {
        close();
        accountMenuButton.focus();
      }
    });
  }

  return { close, install, open };
}
