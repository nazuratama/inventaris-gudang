import { apiRequest } from "./client.js";

export function listItems(filters = {}, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  return apiRequest(`/items?${query.toString()}`, { signal: options.signal });
}

export function getItem(itemId, options = {}) {
  return apiRequest(`/items/${encodeURIComponent(itemId)}`, { signal: options.signal });
}

export function createItem(payload) {
  return apiRequest("/items", { method: "POST", body: payload });
}

export function updateItem(itemId, payload) {
  return apiRequest(`/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteItem(itemId, confirmation) {
  return apiRequest(`/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    body: { confirmation },
  });
}

export function getItemMovements(itemId, filters = {}, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters || {})) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`/items/${encodeURIComponent(itemId)}/movements${suffix}`, {
    signal: options.signal,
  });
}
