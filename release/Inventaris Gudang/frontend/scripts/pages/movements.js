import { listMovements } from "../api/movement-api.js";
import {
  createErrorState,
  createPageLoading,
} from "../components/states.js";
import { element, replace } from "../utils/dom.js";
import { getCollection, normalizePagination } from "../utils/data.js";
import { nextFrame, prefersReducedMotion, wait } from "../utils/motion.js";
import { DEFAULT_FILTERS, parseFilters } from "./movements/filters.js";
import {
  createFilterBar,
  createMovementTable,
  createResultSummary,
  createSoftTableLoading,
} from "./movements/list-view.js";

const PANEL_MS = 200;
let softMovementsController = null;

export async function mountMovements(context) {
  const filters = parseFilters(context.query);

  if (softMovementsController && !softMovementsController.destroyed) {
    if (!context.container.contains(softMovementsController.root)) {
      replace(context.container, softMovementsController.root);
    }
    return softMovementsController.sync(context, filters);
  }

  replace(context.container, createPageLoading(0));
  try {
    const controller = createMovementsController(context, filters);
    softMovementsController = controller;
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
  window.setTimeout(() => {
    const stillHere = /^#\/movements(?:\?|$)/.test(window.location.hash || "");
    if (stillHere && softMovementsController === controller && !controller.destroyed) {
      return;
    }
    controller.destroy();
    if (softMovementsController === controller) {
      softMovementsController = null;
    }
  }, 0);
}

function createMovementsController(initialContext, initialFilters) {
  let context = initialContext;
  let filters = { ...initialFilters };
  let movements = [];
  let pagination = normalizePagination({}, filters.page, filters.page_size);
  let destroyed = false;
  let busy = false;
  let token = 0;
  let contentAbort = null;
  let preserveScrollBottom = false;
  // Stable filter bar so search keeps focus while typing.
  let filterShell = null;

  const filterHost = element("div", { className: "movements-filter-host" });
  const summaryHost = element("div", { className: "movements-summary-host" });
  const contentPanel = element("div", {
    className: "movements-content-panel is-visible",
    attributes: { "aria-live": "polite" },
  });

  const root = element("div", {
    className: ["page-container", "page-stack", "app-page", "movements-page", "inventory-page"],
    dataset: { softRoot: "1" },
    children: [
      element("div", {
        className: "page-toolbar",
        children: [
          element("div", {
            className: "toolbar-copy",
            children: [
              element("h2", { text: "Riwayat stok" }),
              element("p", {
                text: "Catatan masuk/keluar · hapus untuk mengembalikan stok",
              }),
            ],
          }),
        ],
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
      filterShell = null;
    },
    async bootstrap(signal) {
      renderChrome({ forceFilters: true });
      await loadAndRender({ animate: false, signal, force: true });
    },
    async sync(nextContext, nextFilters) {
      if (destroyed) {
        return undefined;
      }
      context = nextContext;
      const previous = filters;
      filters = { ...nextFilters };
      const pageOnly =
        previous.page !== filters.page &&
        previous.page_size === filters.page_size &&
        previous.search === filters.search &&
        previous.movement_type === filters.movement_type &&
        previous.date_from === filters.date_from &&
        previous.date_to === filters.date_to &&
        previous.sort === filters.sort &&
        previous.order === filters.order;
      // Keep viewport near the footer when flipping pages.
      preserveScrollBottom = pageOnly;
      renderChrome();
      await loadAndRender({
        animate: pageOnly,
        signal: nextContext.signal,
        force: true,
        softPage: pageOnly,
      });
      return () => scheduleSoftCleanup(controller);
    },
  };

  function updateFilters(patch, options = {}) {
    const next = { ...filters, ...patch };
    if (!Object.hasOwn(patch, "page")) {
      next.page = 1;
    }
    context.navigate("movements", next, { replace: options.replace ?? true });
  }

  function renderChrome({ forceFilters = false } = {}) {
    if (!filterShell || forceFilters) {
      filterShell = createFilterBar({ filters }, updateFilters);
      replace(filterHost, filterShell.root);
    } else {
      filterShell.sync({ filters });
    }
    replace(summaryHost, createResultSummary({ filters, pagination }, updateFilters));
  }

  async function loadAndRender({ animate, signal, softPage = false }) {
    const runId = ++token;
    contentAbort?.abort();
    contentAbort = new AbortController();
    const localSignal = contentAbort.signal;
    const onAbort = () => contentAbort.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });

    const scrollAnchor = captureScrollAnchor(softPage || preserveScrollBottom);

    try {
      busy = true;
      if (animate && !softPage) {
        await playExit(contentPanel);
      } else if (softPage) {
        contentPanel.classList.add("is-page-soft");
      }

      if (runId !== token || destroyed || localSignal.aborted) {
        return;
      }

      if (!softPage && !contentPanel.childElementCount) {
        replace(contentPanel, createSoftTableLoading());
        contentPanel.classList.remove("is-leaving", "is-entering");
        contentPanel.classList.add("is-visible");
      }

      const queryFilters = { ...filters };
      if (filterShell?.getSearchValue) {
        queryFilters.search = filterShell.getSearchValue();
      }
      const data = await listMovements(queryFilters, { signal: localSignal });
      if (runId !== token || destroyed || localSignal.aborted) {
        return;
      }
      movements = getCollection(data, ["movements", "items", "results"]);
      pagination = normalizePagination(data, filters.page, filters.page_size);
      replace(summaryHost, createResultSummary({ filters, pagination }, updateFilters));

      const tableCard = createMovementTable(
        { movements, pagination, filters },
        updateFilters,
        {
          onDeleted: () =>
            loadAndRender({ animate: false, signal: context.signal }),
        },
      );

      if (animate || softPage) {
        await playEnter(contentPanel, tableCard, { softPage });
      } else {
        contentPanel.classList.remove("is-leaving", "is-entering", "is-page-soft");
        if (!prefersReducedMotion() && contentPanel.childElementCount) {
          contentPanel.classList.add("is-soft-swap");
          contentPanel.style.opacity = "0.55";
          replace(contentPanel, tableCard);
          requestAnimationFrame(() => {
            contentPanel.style.opacity = "";
            contentPanel.classList.add("is-visible");
            window.setTimeout(() => {
              contentPanel.classList.remove("is-soft-swap");
            }, 200);
          });
        } else {
          contentPanel.classList.add("is-visible");
          replace(contentPanel, tableCard);
        }
      }

      restoreScrollAnchor(scrollAnchor);
    } catch (error) {
      if (error?.name === "AbortError" || localSignal.aborted) {
        return;
      }
      if (runId !== token || destroyed) {
        return;
      }
      replace(
        contentPanel,
        createErrorState(error, () =>
          loadAndRender({ animate: false, signal: context.signal }),
        ),
      );
      contentPanel.classList.remove("is-leaving", "is-entering", "is-page-soft");
      contentPanel.classList.add("is-visible");
    } finally {
      signal?.removeEventListener?.("abort", onAbort);
      preserveScrollBottom = false;
      if (runId === token) {
        busy = false;
      }
    }
  }

  return controller;
}

function captureScrollAnchor(enabled) {
  if (!enabled || typeof window === "undefined") {
    return null;
  }
  const doc = document.documentElement;
  const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
  const fromBottom = Math.max(0, maxScroll - window.scrollY);
  return {
    fromBottom,
    // If user was near the pagination footer, pin to bottom after reload.
    pinBottom: fromBottom < 220 || window.scrollY + window.innerHeight > doc.scrollHeight - 280,
  };
}

function restoreScrollAnchor(anchor) {
  if (!anchor || typeof window === "undefined") {
    return;
  }
  const apply = () => {
    const doc = document.documentElement;
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    if (anchor.pinBottom) {
      window.scrollTo({ top: maxScroll, left: 0, behavior: "auto" });
      return;
    }
    window.scrollTo({
      top: Math.max(0, maxScroll - anchor.fromBottom),
      left: 0,
      behavior: "auto",
    });
  };
  apply();
  window.requestAnimationFrame(() => {
    apply();
    window.requestAnimationFrame(apply);
  });
}

function playExit(panel) {
  if (prefersReducedMotion()) {
    panel.classList.remove("is-visible", "is-entering");
    panel.classList.add("is-leaving");
    return Promise.resolve();
  }
  panel.classList.remove("is-visible", "is-entering");
  panel.classList.add("is-leaving");
  return wait(PANEL_MS);
}

async function playEnter(panel, body, { softPage = false } = {}) {
  if (prefersReducedMotion()) {
    replace(panel, body);
    panel.classList.remove("is-leaving", "is-entering", "is-page-soft");
    panel.classList.add("is-visible");
    return;
  }
  if (softPage) {
    panel.classList.add("is-page-soft");
  }
  panel.classList.remove("is-visible");
  panel.classList.add("is-entering");
  replace(panel, body);
  await nextFrame();
  await nextFrame();
  panel.classList.remove("is-leaving", "is-entering");
  panel.classList.add("is-visible");
  await wait(PANEL_MS);
  panel.classList.remove("is-page-soft");
}
