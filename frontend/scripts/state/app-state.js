const listeners = new Map();

const state = {
  session: null,
  connected: false,
  health: null,
  backup: null,
  categories: [],
  locations: [],
  activeRoute: "dashboard",
};

export const appState = {
  get(key) {
    return state[key];
  },

  snapshot() {
    return { ...state };
  },

  set(key, value) {
    if (Object.is(state[key], value)) {
      return;
    }
    state[key] = value;
    notify(key, value);
    notify("*", this.snapshot());
  },

  patch(values) {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  },

  subscribe(key, callback) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key).add(callback);
    return () => listeners.get(key)?.delete(callback);
  },
};

function notify(key, value) {
  for (const callback of listeners.get(key) || []) {
    callback(value);
  }
}
