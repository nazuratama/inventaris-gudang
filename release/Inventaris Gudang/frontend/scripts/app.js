import { showApiError } from "./components/toast.js";
import { routes } from "./core/routes.js?v=20260722-ui14";
import { createRouter } from "./router.js";
import { appState } from "./state/app-state.js";
import { createAccountMenu } from "./shell/account-menu.js";
import { createCommandPalette } from "./shell/command-palette.js";
import { createConnectionController } from "./shell/connection.js";
import { getShellElements } from "./shell/elements.js";
import { openHelpDialog } from "./shell/help-dialog.js";
import { installKeyboardShortcuts } from "./shell/keyboard-shortcuts.js";
import { createShutdownController } from "./shell/shutdown.js";
import { createSidebarController, installGlobalSearch } from "./shell/sidebar.js";

const elements = getShellElements();
let accountMenu;
let connection;
let shutdown;
let sidebarController;

const router = createRouter({
  routes,
  container: elements.pageContent,
  onRouteChange: (location, route, meta = {}) => {
    elements.pageContent.dataset.route = location.name;
    const heading = elements.pageTitle?.closest?.(".page-heading");
    if (heading && meta.routeChanged) {
      heading.classList.add("is-swapping");
      window.setTimeout(() => {
        elements.pageTitle.textContent = route.title;
        elements.pageDescription.textContent = route.description;
        heading.classList.remove("is-swapping");
      }, 90);
    } else {
      elements.pageTitle.textContent = route.title;
      elements.pageDescription.textContent = route.description;
    }
    document.title = `${route.title} · ALFAN TANI`;
    sidebarController.updateActiveNavigation(location.name);
    sidebarController.close();
    elements.globalSearchControl.hidden = location.name === "inventory";
    elements.globalSearch.value =
      location.name === "inventory" ? location.query.get("search") || "" : "";
  },
  onAfterRender: () => connection.updateMutationAvailability(),
  onError: (error) => {
    showApiError(error, "Halaman tidak dapat ditampilkan");
  },
});

accountMenu = createAccountMenu(elements, {
  navigate: (name, params, options) => router.navigate(name, params, options),
  openHelp: () =>
    openHelpDialog({
      navigate: (name, params, options) => router.navigate(name, params, options),
      returnFocus: elements.accountMenuButton,
    }),
  requestShutdown: () => shutdown.request(),
});

sidebarController = createSidebarController(elements, {
  closeAccountMenu: accountMenu.close,
});
connection = createConnectionController(elements);
shutdown = createShutdownController(elements, { connection, router });
const commandPalette = createCommandPalette(router);

function installShellInteractions() {
  sidebarController.install();
  accountMenu.install();
  installGlobalSearch(elements, { appState, router });
  document.addEventListener("inventory:shutdown-request", shutdown.request);

  elements.retryConnectionButton.addEventListener("click", async () => {
    elements.retryConnectionButton.disabled = true;
    try {
      await connection.establishSession({ force: true, showError: true });
      await connection.checkHealth();
      router.refresh();
    } catch (error) {
      showApiError(error, "Server lokal belum tersambung");
    } finally {
      elements.retryConnectionButton.disabled = false;
    }
  });
}

async function bootstrap() {
  installShellInteractions();
  installKeyboardShortcuts({
    appShell: elements.appShell,
    closeSidebar: sidebarController.close,
    globalSearch: elements.globalSearch,
    openCommandPalette: commandPalette.open,
    router,
  });
  commandPalette.install();
  connection.installStateBindings();

  const sessionReady = await connection.establishSession({ showError: true });
  const healthy = await connection.checkHealth();
  if (!sessionReady && healthy) {
    await connection.establishSession({ force: true, showError: true });
    await connection.checkHealth();
  }

  connection.startHealthPolling();
  router.start();
}

bootstrap();
