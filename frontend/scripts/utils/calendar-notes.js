/**
 * Local calendar day notes for the dashboard (offline, device-local).
 * Shape: { "YYYY-MM-DD": [{ id, text, created_at, updated_at }] }
 */
const STORAGE_KEY = "alfan-tani.dashboard-calendar-notes.v1";

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAllCalendarNotes() {
  return readStore();
}

export function getNotesForDate(dateKey) {
  const list = readStore()[dateKey];
  return Array.isArray(list) ? list : [];
}

export function datesWithNotes() {
  const store = readStore();
  return new Set(
    Object.entries(store)
      .filter(([, notes]) => Array.isArray(notes) && notes.length > 0)
      .map(([key]) => key),
  );
}

export function addCalendarNote(dateKey, text) {
  const clean = String(text || "").trim().slice(0, 500);
  if (!dateKey || !clean) {
    return null;
  }
  const store = readStore();
  const list = Array.isArray(store[dateKey]) ? [...store[dateKey]] : [];
  const now = new Date().toISOString();
  const note = {
    id: newId(),
    text: clean,
    created_at: now,
    updated_at: now,
  };
  list.push(note);
  store[dateKey] = list;
  writeStore(store);
  return note;
}

export function updateCalendarNote(dateKey, noteId, text) {
  const clean = String(text || "").trim().slice(0, 500);
  if (!dateKey || !noteId || !clean) {
    return null;
  }
  const store = readStore();
  const list = Array.isArray(store[dateKey]) ? [...store[dateKey]] : [];
  const index = list.findIndex((entry) => entry.id === noteId);
  if (index < 0) {
    return null;
  }
  list[index] = {
    ...list[index],
    text: clean,
    updated_at: new Date().toISOString(),
  };
  store[dateKey] = list;
  writeStore(store);
  return list[index];
}

export function deleteCalendarNote(dateKey, noteId) {
  if (!dateKey || !noteId) {
    return false;
  }
  const store = readStore();
  const list = Array.isArray(store[dateKey]) ? store[dateKey] : [];
  const next = list.filter((entry) => entry.id !== noteId);
  if (next.length === list.length) {
    return false;
  }
  if (next.length === 0) {
    delete store[dateKey];
  } else {
    store[dateKey] = next;
  }
  writeStore(store);
  return true;
}
