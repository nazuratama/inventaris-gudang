import { apiRequest, downloadFromApi } from "./client.js";

export function getBackups(options = {}) {
  return apiRequest("/backups", { signal: options.signal });
}

export function createBackup() {
  return apiRequest("/backups/create", {
    method: "POST",
    body: {},
  });
}

export function createDatabaseSnapshot() {
  return apiRequest("/backups/database", {
    method: "POST",
    body: {},
  });
}

export function exportBackup() {
  return downloadFromApi("/api/v1/backups/export", "inventaris_gudang.xlsx");
}

export function downloadStoredBackup(kind, fileName) {
  return downloadFromApi(
    `/api/v1/backups/files/${encodeURIComponent(kind)}/${encodeURIComponent(fileName)}`,
    fileName,
  );
}

export function verifyStoredBackup(kind, fileName) {
  return apiRequest(
    `/backups/files/${encodeURIComponent(kind)}/${encodeURIComponent(fileName)}/verify`,
    { method: "POST", body: {} },
  );
}

export function restoreStoredDatabaseBackup(fileName) {
  return apiRequest(`/backups/database/${encodeURIComponent(fileName)}/restore`, {
    method: "POST",
    body: { confirmation: true },
  });
}

export async function previewImport(file) {
  return apiRequest("/imports/preview", {
    method: "POST",
    rawBody: true,
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": toHeaderSafeFileName(file.name),
      "X-File-Size": String(file.size),
    },
  });
}

export function commitImport(previewToken) {
  return apiRequest("/imports/commit", {
    method: "POST",
    body: {
      preview_token: previewToken,
      confirmation: true,
    },
  });
}

export async function restoreBackup(file) {
  return apiRequest("/backups/restore", {
    method: "POST",
    rawBody: true,
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": toHeaderSafeFileName(file.name),
      "X-File-Size": String(file.size),
    },
  });
}

function toHeaderSafeFileName(fileName) {
  return String(fileName || "import.dat")
    .split(/[\\/]/)
    .pop()
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\r\n]/g, "_")
    .slice(0, 180);
}
