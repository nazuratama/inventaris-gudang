export function createSidebarController(elements, { closeAccountMenu }) {
  const {
    appShell,
    closeSidebarButton,
    openSidebarButton,
    sidebar,
    sidebarScrim,
  } = elements;

  function open() {
    appShell.classList.add("sidebar-open");
    sidebarScrim.hidden = false;
    openSidebarButton.setAttribute("aria-expanded", "true");
    sidebar.querySelector(".nav-link[aria-current='page']")?.focus();
    document.dispatchEvent(new CustomEvent("inventory:layout-change"));
  }

  function close() {
    if (!appShell.classList.contains("sidebar-open")) {
      return;
    }
    closeAccountMenu();
    appShell.classList.remove("sidebar-open");
    sidebarScrim.hidden = true;
    openSidebarButton.setAttribute("aria-expanded", "false");
    document.dispatchEvent(new CustomEvent("inventory:layout-change"));
  }

  function updateActiveNavigation(routeName) {
    for (const link of document.querySelectorAll(".nav-link")) {
      if (link.dataset.route === routeName) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function install() {
    openSidebarButton.addEventListener("click", open);
    closeSidebarButton.addEventListener("click", close);
    sidebarScrim.addEventListener("click", close);
  }

  return { close, install, open, updateActiveNavigation };
}

export function installGlobalSearch(elements, { appState, router }) {
  const { globalSearch } = elements;

  globalSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    router.navigate(
      "inventory",
      {
        search: globalSearch.value.trim(),
        active: "true",
        data_scope: "all",
        stock_status: "all",
        page: 1,
        page_size: Number(appState.get("session")?.inventory_page_size || 25),
        sort: "updated_at",
        order: "desc",
      },
      { replace: false },
    );
  });
}
