import { listItems } from "../api/inventory-api.js";
import { openItemForm } from "../components/item-form.js";
import {
  createInventoryScopeNav,
  createReferenceWorkspace,
  openCatalogEditor,
  parseInventoryScope,
  REFERENCE_SCOPES,
} from "../components/reference-data.js";
import {
  createErrorState,
  createPageLoading,
} from "../components/states.js";
import { appState } from "../state/app-state.js";
import { button, element, replace } from "../utils/dom.js";
import {
  getCollection,
  normalizePagination,
} from "../utils/data.js";
import { loadCatalogs } from "../utils/catalogs.js";
import { nextFrame, prefersReducedMotion, wait } from "../utils/motion.js";
import { DEFAULT_FILTERS, parseFilters } from "./inventory/filters.js";
import {
  createFilterBar,
  createInventoryTable,
  createResultsSummary,
} from "./inventory/list-view.js";

const SCOPE_EXIT_MS = 200;
const SCOPE_ENTER_MS = 220;

/** Survives same-route remounts so tab switches can soft-transition. */
let softInventoryController = null;

export async function mountInventory(context) {
  const defaultPageSize = Number(
    appState.get("session")?.inventory_page_size || DEFAULT_FILTERS.page_size,
  );
  const filters = parseFilters(context.query, defaultPageSize);

  // Soft re-entry: keep shell, animate only the content panel.
  if (softInventoryController && !softInventoryController.destroyed) {
    if (!context.container.contains(softInventoryController.root)) {
      replace(context.container, softInventoryController.root);
    }
    return softInventoryController.sync(context, filters, defaultPageSize);
  }

  replace(context.container, createPageLoading(0));

  try {
    const controller = createInventoryController(context, filters, defaultPageSize);
    softInventoryController = controller;
    replace(context.container, controller.root);
    await controller.bootstrap(context.signal);
    if (context.signal.aborted) {
      return undefined;
    }
    return () => scheduleSoftCleanup(controller);
  } catch (error) {
    if (error?.name !== "AbortError") {
      replace(
        context.container,
        element("div", {
          className: "page-container",
          children: [createErrorState(error, context.refresh)],
        }),
      );
    }
    return undefined;
  }
}

function scheduleSoftCleanup(controller) {
  // Router cleans up before remounting the same route on query changes.
  // Defer destroy so inventory tab switches can reuse the live controller.
  window.setTimeout(() => {
    const stillOnInventory = /^#\/inventory(?:\?|$)/.test(window.location.hash || "");
    if (stillOnInventory && softInventoryController === controller && !controller.destroyed) {
      return;
    }
    controller.destroy();
    if (softInventoryController === controller) {
      softInventoryController = null;
    }
  }, 0);
}

function createInventoryController(initialContext, initialFilters, initialDefaultPageSize) {
  let context = initialContext;
  let defaultPageSize = initialDefaultPageSize;
  let filters = { ...initialFilters };
  let catalogs = { categories: [], locations: [], units: [] };
  let itemsView = {
    items: [],
    pagination: normalizePagination({}, 1, filters.page_size),
  };
  let busy = false;
  let destroyed = false;
  let transitionToken = 0;
  let contentAbort = null;
  // Keep filter chrome out of the table panel so search does not remount while typing.
  let itemsFilterShell = null;

  const actionSlot = element("div", { className: "inventory-action-slot" });
  const scopeNavHost = element("div", { className: "inventory-scope-nav-host" });
  const filterHost = element("div", { className: "inventory-filter-host" });
  const summaryHost = element("div", { className: "inventory-summary-host" });
  const contentPanel = element("div", {
    className: "inventory-content-panel is-visible",
    attributes: { "aria-live": "polite" },
  });

  const root = element("div", {
    className: ["page-container", "page-stack", "app-page", "inventory-page"],
    dataset: { softRoot: "1" },
    children: [
      element("div", {
        className: "inventory-workspace-bar",
        children: [scopeNavHost, actionSlot],
      }),
      filterHost,
      summaryHost,
      contentPanel,
    ],
  });

  const controller = {
    root,
    get destroyed() {
      return destroyed;
    },
    destroy() {
      destroyed = true;
      contentAbort?.abort();
      contentAbort = null;
      itemsFilterShell = null;
    },
    async bootstrap(signal) {
      catalogs = await loadCatalogs({ signal });
      if (signal?.aborted || destroyed) {
        return;
      }
      renderChrome();
      await loadAndRenderScope({ animate: false, signal, force: true });
    },
    async sync(nextContext, nextFilters, nextDefaultPageSize) {
      if (destroyed) {
        return undefined;
      }
      context = nextContext;
      defaultPageSize = nextDefaultPageSize;
      const previousScope = filters.scope;
      const scopeChanged = previousScope !== nextFilters.scope;
      filters = { ...nextFilters };
      renderChrome();
      // Scope change: fade only. Same scope (filter/save): reload without skeleton flash.
      await loadAndRenderScope({
        animate: scopeChanged,
        signal: nextContext.signal,
        force: !scopeChanged,
      });
      return () => scheduleSoftCleanup(controller);
    },
  };

  function updateFilters(patch, options = {}) {
    const next = { ...filters, ...patch };
    if (!Object.hasOwn(patch, "page") && !Object.hasOwn(patch, "scope")) {
      next.page = 1;
    }
    if (Object.hasOwn(patch, "scope")) {
      next.page = 1;
      // Keep page size; clear item-specific filters when leaving items.
      if (patch.scope !== "items") {
        next.search = "";
        next.category_id = "";
        next.location_id = "";
        next.stock_status = "all";
      } else if (filters.scope !== "items") {
        next.search = "";
      }
    }
    context.navigate("inventory", next, { replace: options.replace ?? true });
  }

  function renderChrome() {
    const scope = parseInventoryScope(filters.scope);
    replace(actionSlot, createPrimaryAction(scope, context));
    replace(
      scopeNavHost,
      createInventoryScopeNav(scope, (nextScope) => {
        if (nextScope === scope || busy) {
          return;
        }
        updateFilters({ scope: nextScope });
      }),
    );
  }

  function clearItemsChrome() {
    itemsFilterShell = null;
    filterHost.replaceChildren();
    summaryHost.replaceChildren();
  }

  function renderItemsChrome(view) {
    // Rebuild filter bar only when catalogs change or shell is missing — never while typing.
    if (!itemsFilterShell) {
      itemsFilterShell = createFilterBar(view, updateFilters);
      replace(filterHost, itemsFilterShell.root);
    } else {
      itemsFilterShell.sync(view);
    }
    replace(summaryHost, createResultsSummary(view, updateFilters));
  }

  async function loadAndRenderScope({ animate, signal, force = false }) {
    const token = ++transitionToken;
    contentAbort?.abort();
    contentAbort = new AbortController();
    const localSignal = contentAbort.signal;
    const onAbort = () => contentAbort.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });

    try {
      busy = true;
      const scope = parseInventoryScope(filters.scope);

      // Exit first, then load while hidden — avoids skeleton "blink" on tab switch.
      if (animate) {
        await playPanelExit(contentPanel);
      }
      if (token !== transitionToken || destroyed || localSignal.aborted) {
        return;
      }

      // Keep panel hidden during fetch; only show soft loader if cold + no cache.
      const hasWarmCache =
        (scope === "categories" && (catalogs.categories || []).length > 0) ||
        (scope === "locations" && (catalogs.locations || []).length > 0) ||
        (scope === "units" && (catalogs.units || []).length > 0);

      if (!animate && !contentPanel.childElementCount) {
        replace(contentPanel, createSoftPanelLoading(scope));
        contentPanel.classList.remove("is-leaving", "is-entering");
        contentPanel.classList.add("is-visible");
      } else if (animate && !hasWarmCache && scope === "items") {
        // Items always need network; stay in faded state without noisy skeleton.
        contentPanel.classList.add("is-leaving");
        contentPanel.classList.remove("is-visible", "is-entering");
      } else if (animate) {
        contentPanel.classList.add("is-leaving");
        contentPanel.classList.remove("is-visible", "is-entering");
      }

      if (scope === "items") {
        const { scope: _scope, ...itemFilters } = filters;
        // Prefer live search box text so in-flight typing is not overwritten by URL lag.
        if (itemsFilterShell?.getSearchValue) {
          itemFilters.search = itemsFilterShell.getSearchValue();
        }
        const data = await listItems(itemFilters, { signal: localSignal });
        if (token !== transitionToken || destroyed || localSignal.aborted) {
          return;
        }
        itemsView = {
          items: getCollection(data, ["items", "results"]),
          pagination: normalizePagination(data, filters.page, filters.page_size),
        };
      } else {
        clearItemsChrome();
        catalogs = await loadCatalogs({
          signal: localSignal,
          force: Boolean(force),
        });
        if (token !== transitionToken || destroyed || localSignal.aborted) {
          return;
        }
      }

      if (token !== transitionToken || destroyed) {
        return;
      }

      const view = {
        scope,
        filters,
        catalogs,
        items: itemsView.items,
        pagination: itemsView.pagination,
        defaultPageSize,
      };

      let panelBody;
      if (scope === "items") {
        renderItemsChrome(view);
        panelBody = createInventoryTable(view, context, updateFilters);
      } else {
        panelBody = buildCatalogContent(view, context, updateFilters);
      }

      if (animate) {
        await playPanelEnter(contentPanel, panelBody);
      } else {
        // Soft swap only the table panel so filter/search keep focus and caret.
        contentPanel.classList.remove("is-leaving", "is-entering");
        if (!prefersReducedMotion() && contentPanel.childElementCount) {
          contentPanel.classList.add("is-soft-swap");
          contentPanel.style.opacity = "0.55";
          replace(contentPanel, panelBody);
          requestAnimationFrame(() => {
            contentPanel.style.opacity = "";
            contentPanel.classList.add("is-visible");
            window.setTimeout(() => {
              contentPanel.classList.remove("is-soft-swap");
            }, 200);
          });
        } else {
          contentPanel.classList.add("is-visible");
          replace(contentPanel, panelBody);
        }
      }
    } catch (error) {
      if (error?.name === "AbortError" || localSignal.aborted) {
        return;
      }
      if (token !== transitionToken || destroyed) {
        return;
      }
      replace(
        contentPanel,
        createErrorState(error, () =>
          loadAndRenderScope({
            animate: false,
            signal: context.signal,
            force: true,
          }),
        ),
      );
      contentPanel.classList.remove("is-leaving", "is-entering");
      contentPanel.classList.add("is-visible");
    } finally {
      signal?.removeEventListener?.("abort", onAbort);
      if (token === transitionToken) {
        busy = false;
      }
    }
  }

  return controller;
}

function createPrimaryAction(scope, context) {
  const meta = REFERENCE_SCOPES[scope] || REFERENCE_SCOPES.items;
  if (scope === "items") {
    return button("Tambah barang", {
      variant: "button-primary",
      iconName: "plus",
      requiresConnection: true,
      onClick: (event) =>
        openItemForm({
          trigger: event.currentTarget,
          onSaved: context.refresh,
        }),
    });
  }
  return button(`Tambah ${meta.label.toLowerCase()}`, {
    variant: "button-primary",
    iconName: "plus",
    requiresConnection: true,
    onClick: (event) => {
      if (scope === "categories") {
        openCatalogEditor("category", null, context, event.currentTarget);
      } else if (scope === "locations") {
        openCatalogEditor("location", null, context, event.currentTarget);
      } else if (scope === "units") {
        openCatalogEditor("unit", null, context, event.currentTarget);
      }
    },
  });
}

function buildCatalogContent(view, context, updateFilters) {
  const stack = element("div", {
    className: "inventory-scope-body page-stack",
  });
  const records =
    view.scope === "categories"
      ? view.catalogs.categories || []
      : view.scope === "locations"
        ? view.catalogs.locations || []
        : view.catalogs.units || [];
  stack.append(
    createReferenceWorkspace(view.scope, records, context, {
      search: view.filters.search,
      page: view.filters.page,
      pageSize: view.filters.page_size,
      onPageSizeChange: (pageSize) => updateFilters({ page_size: pageSize, page: 1 }),
    }),
  );
  return stack;
}

function createSoftPanelLoading(scope) {
  const label =
    scope === "items"
      ? "Memuat daftar barang…"
      : `Memuat ${REFERENCE_SCOPES[scope]?.label?.toLowerCase() || "data"}…`;
  return element("div", {
    className: "inventory-soft-loading",
    children: [
      element("div", {
        className: "inventory-soft-loading-card card",
        children: [
          element("div", { className: "skeleton-line skeleton-line-title" }),
          element("div", { className: "skeleton-line" }),
          element("div", { className: "skeleton-line skeleton-line-short" }),
          element("div", { className: "skeleton-line" }),
          element("div", { className: "skeleton-line skeleton-line-short" }),
          element("p", { className: "muted", text: label }),
        ],
      }),
    ],
  });
}

function playPanelExit(panel) {
  if (prefersReducedMotion()) {
    panel.classList.remove("is-visible", "is-entering");
    panel.classList.add("is-leaving");
    return Promise.resolve();
  }
  panel.classList.remove("is-visible", "is-entering");
  panel.classList.add("is-leaving");
  return wait(SCOPE_EXIT_MS);
}

async function playPanelEnter(panel, body) {
  if (prefersReducedMotion()) {
    replace(panel, body);
    panel.classList.remove("is-leaving", "is-entering");
    panel.classList.add("is-visible");
    return;
  }
  panel.classList.remove("is-visible");
  panel.classList.add("is-entering");
  replace(panel, body);
  // Double rAF: ensure browser paints the pre-enter state first.
  await nextFrame();
  await nextFrame();
  panel.classList.remove("is-leaving", "is-entering");
  panel.classList.add("is-visible");
  await wait(SCOPE_ENTER_MS);
}
