export function getShellElements() {
  const globalSearch = document.getElementById("globalSearch");

  return {
    accountMenuButton: document.getElementById("accountMenuButton"),
    accountMenuPopover: document.getElementById("accountMenuPopover"),
    appShell: document.getElementById("appShell"),
    backupStatus: document.getElementById("backupStatus"),
    closeSidebarButton: document.getElementById("closeSidebarButton"),
    connectionBanner: document.getElementById("connectionBanner"),
    globalSearch,
    globalSearchControl: globalSearch.closest(".global-search"),
    openSidebarButton: document.getElementById("openSidebarButton"),
    pageContent: document.getElementById("pageContent"),
    pageDescription: document.getElementById("pageDescription"),
    pageTitle: document.getElementById("pageTitle"),
    retryConnectionButton: document.getElementById("retryConnectionButton"),
    sidebar: document.getElementById("sidebar"),
    sidebarAccount: document.getElementById("sidebarAccount"),
    sidebarScrim: document.getElementById("sidebarScrim"),
  };
}
