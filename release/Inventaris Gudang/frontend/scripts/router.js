import { appState } from "./state/app-state.js";
import { prefersReducedMotion, wait } from "./utils/motion.js";

const PAGE_LEAVE_MS = 180;
const PAGE_ENTER_MS = 240;

async function playPageLeave(container) {
  if (!container || prefersReducedMotion() || !container.childElementCount) {
    return;
  }
  container.classList.remove("is-page-enter");
  container.classList.add("is-page-leave");
  await wait(PAGE_LEAVE_MS);
  container.classList.remove("is-page-leave");
}

function playPageEnter(container) {
  if (!container || prefersReducedMotion()) {
    return;
  }
  container.classList.remove("is-page-leave");
  container.classList.remove("is-page-enter");
  // Restart enter animation even when class was already present.
  void container.offsetWidth;
  container.classList.add("is-page-enter");
  window.setTimeout(() => {
    container.classList.remove("is-page-enter");
  }, PAGE_ENTER_MS + 40);
}

export function createRouter(options) {
  let activeController = null;
  let activeCleanup = null;
  let activeRouteName = null;
  let started = false;
  let renderGeneration = 0;

  async function renderCurrent(settings = {}) {
    const parsed = parseLocation();
    const route = options.routes[parsed.name];
    if (!route) {
      navigate("dashboard", {}, { replace: true });
      return;
    }

    const routeChanged = activeRouteName !== parsed.name;
    const isFirstPaint = activeRouteName === null;
    const generation = ++renderGeneration;

    // Animate out current page before tearing it down (route changes only).
    if (routeChanged && !isFirstPaint && !settings.refresh) {
      await playPageLeave(options.container);
      if (generation !== renderGeneration) {
        return;
      }
    }

    activeController?.abort();
    activeCleanup?.();
    activeController = new AbortController();
    activeCleanup = null;

    activeRouteName = parsed.name;
    appState.set("activeRoute", parsed.name);
    options.onRouteChange?.(parsed, route, { routeChanged, isFirstPaint });

    const context = {
      container: options.container,
      signal: activeController.signal,
      route: parsed.name,
      query: parsed.query,
      navigate,
      refresh: () => renderCurrent({ refresh: true }),
    };

    try {
      const cleanup = await route.mount(context);
      if (generation !== renderGeneration || activeController.signal.aborted) {
        return;
      }
      if (typeof cleanup === "function") {
        activeCleanup = cleanup;
      }
      options.onAfterRender?.(parsed, route);
      if (routeChanged && !settings.refresh) {
        playPageEnter(options.container);
        options.container.focus({ preventScroll: true });
      } else if (isFirstPaint) {
        playPageEnter(options.container);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        options.onError?.(error, context);
      }
    }
  }

  function navigate(name, parameters = {}, settings = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters || {})) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const target = `#/${name}${suffix}`;
    if (window.location.hash === target) {
      if (settings.force !== false) {
        renderCurrent({ refresh: true });
      }
      return;
    }
    if (settings.replace) {
      window.history.replaceState(null, "", target);
      renderCurrent({ refresh: settings.focus === false });
    } else {
      window.location.hash = target;
    }
  }

  function start() {
    if (started) {
      return;
    }
    started = true;
    window.addEventListener("hashchange", () => renderCurrent());
    if (!window.location.hash) {
      navigate("dashboard", {}, { replace: true });
    } else {
      renderCurrent();
    }
  }

  function stop() {
    activeController?.abort();
    activeCleanup?.();
  }

  return {
    start,
    stop,
    navigate,
    refresh: () => renderCurrent({ refresh: true }),
    current: () => parseLocation(),
  };
}

function parseLocation() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [pathPart = "dashboard", queryPart = ""] = raw.split("?", 2);
  let name = pathPart.split("/")[0] || "dashboard";
  // Stock history is per-item; open the inventory page instead.
  if (name === "movements") {
    name = "inventory";
  }
  return {
    name,
    query: new URLSearchParams(queryPart),
  };
}
