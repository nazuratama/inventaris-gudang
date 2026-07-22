import { apiRequest } from "./client.js";

export function listMovements(filters = {}, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === "movement_type" && value === "all") {
      continue;
    }
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  return apiRequest(`/movements?${query.toString()}`, { signal: options.signal });
}

export function createMovement(payload) {
  return apiRequest("/movements", {
    method: "POST",
    body: payload,
  });
}

export function deleteMovement(movementId) {
  // Empty JSON body so security middleware accepts Content-Type: application/json
  // (same pattern as deleteCategory / deleteItem).
  return apiRequest(`/movements/${encodeURIComponent(movementId)}`, {
    method: "DELETE",
    body: {},
  });
}
