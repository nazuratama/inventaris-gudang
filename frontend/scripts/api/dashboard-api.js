import { apiRequest } from "./client.js";

export function getDashboard(options = {}) {
  return apiRequest("/dashboard", { signal: options.signal });
}

export function getHealth(options = {}) {
  return apiRequest("/health", { signal: options.signal });
}
