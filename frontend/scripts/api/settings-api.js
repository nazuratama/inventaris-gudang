import { apiRequest } from "./client.js";

export function getSettings(options = {}) {
  return apiRequest("/settings", { signal: options.signal });
}

export function updateSettings(payload) {
  return apiRequest("/settings", {
    method: "PATCH",
    body: payload,
  });
}

export function getCloudBackupStatus(options = {}) {
  return apiRequest("/cloud-backup/status", { signal: options.signal });
}

export function connectGoogleDrive() {
  return apiRequest("/cloud-backup/connect", { method: "POST", body: {} });
}

export function disconnectGoogleDrive() {
  return apiRequest("/cloud-backup/disconnect", {
    method: "POST",
    body: { confirmation: true },
  });
}

export function uploadCloudBackupNow() {
  return apiRequest("/cloud-backup/upload-now", { method: "POST", body: {} });
}

export function getUpdateStatus(options = {}) {
  return apiRequest("/updates/status", { signal: options.signal });
}

export function checkForUpdates() {
  return apiRequest("/updates/check", { method: "POST", body: {} });
}

export function installUpdate() {
  return apiRequest("/updates/install", { method: "POST", body: {} });
}

export function uploadBrandingImage(kind, imageData, fileName) {
  return apiRequest(`/settings/branding/${encodeURIComponent(kind)}`, {
    method: "PUT",
    body: {
      image_data: imageData,
      file_name: fileName || null,
    },
  });
}

export function deleteBrandingImage(kind) {
  return apiRequest(`/settings/branding/${encodeURIComponent(kind)}`, {
    method: "DELETE",
    body: {},
  });
}

export function listCategories(options = {}) {
  return apiRequest("/categories", { signal: options.signal });
}

export function createCategory(payload) {
  return apiRequest("/categories", { method: "POST", body: payload });
}

export function updateCategory(categoryId, payload) {
  return apiRequest(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteCategory(categoryId) {
  return apiRequest(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
    body: {},
  });
}

export function listLocations(options = {}) {
  return apiRequest("/locations", { signal: options.signal });
}

export function createLocation(payload) {
  return apiRequest("/locations", { method: "POST", body: payload });
}

export function updateLocation(locationId, payload) {
  return apiRequest(`/locations/${encodeURIComponent(locationId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteLocation(locationId) {
  return apiRequest(`/locations/${encodeURIComponent(locationId)}`, {
    method: "DELETE",
    body: {},
  });
}

export function listUnits(options = {}) {
  return apiRequest("/units", { signal: options.signal });
}

export function createUnit(payload) {
  return apiRequest("/units", { method: "POST", body: payload });
}

export function updateUnit(unitId, payload) {
  return apiRequest(`/units/${encodeURIComponent(unitId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteUnit(unitId) {
  return apiRequest(`/units/${encodeURIComponent(unitId)}`, {
    method: "DELETE",
    body: {},
  });
}

export function runIntegrityCheck() {
  return apiRequest("/maintenance/integrity", {
    method: "POST",
    body: {},
  });
}

export function shutdownApplication() {
  return apiRequest("/application/shutdown", {
    method: "POST",
    body: {},
  });
}
