import { openItemForm } from "../components/item-form.js";
import { isModalOpen } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { appState } from "../state/app-state.js";
import { isTextEntryTarget } from "../utils/dom.js";

export function installKeyboardShortcuts({
  appShell,
  closeSidebar,
  globalSearch,
  openCommandPalette,
  router,
}) {
  document.addEventListener("keydown", (event) => {
    const textEntry = isTextEntryTarget(event.target);
    const commandDialogOpen = document.getElementById("commandDialog").open;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === "/" && !textEntry && !isModalOpen() && !commandDialogOpen) {
      event.preventDefault();
      const inventorySearch = document.querySelector(
        ".inventory-filters .search-control input[type='search']",
      );
      const searchTarget =
        appState.get("activeRoute") === "inventory" ? inventorySearch : globalSearch;
      searchTarget?.focus();
      searchTarget?.select();
      return;
    }
    if (
      event.key.toLowerCase() === "n" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !textEntry &&
      !isModalOpen() &&
      !commandDialogOpen
    ) {
      event.preventDefault();
      if (!appState.get("connected")) {
        showToast({
          type: "warning",
          title: "Server lokal terputus",
          message: "Barang baru dapat ditambahkan setelah koneksi pulih.",
        });
        return;
      }
      openItemForm({ onSaved: router.refresh });
      return;
    }
    if (event.key === "Escape" && appShell.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });
}
