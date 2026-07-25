import { safeFileName } from "../utils/formatting.js";

const API_ROOT = "/api/v1";
const APP_HEADER_VALUE = "Inventaris-Gudang/1";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const apiEvents = new EventTarget();

let csrfToken = null;
let sessionPromise = null;

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code || "REQUEST_FAILED";
    this.status = options.status || 0;
    this.details = options.details || null;
    this.isNetworkError = Boolean(options.isNetworkError);
  }
}

export function onApiConnectionChange(callback) {
  const handler = (event) => callback(event.detail);
  apiEvents.addEventListener("connection", handler);
  return () => apiEvents.removeEventListener("connection", handler);
}

export async function initializeSession(force = false) {
  if (csrfToken && !force) {
    return null;
  }
  if (sessionPromise && !force) {
    return sessionPromise;
  }

  sessionPromise = rawRequest("/session", { method: "GET", skipSession: true })
    .then((data) => {
      csrfToken = data?.csrf_token || null;
      if (!csrfToken) {
        throw new ApiError("Sesi keamanan lokal tidak dapat dibuat.", {
          code: "SESSION_TOKEN_MISSING",
        });
      }
      return data;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const isMutation = MUTATION_METHODS.has(method);

  if (isMutation && !csrfToken && !options.skipSession) {
    await initializeSession();
  }

  try {
    return await rawRequest(path, { ...options, method });
  } catch (error) {
    const shouldRefreshSession =
      isMutation &&
      !options.skipSession &&
      !options.sessionRetried &&
      error instanceof ApiError &&
      [401, 403].includes(error.status);

    if (shouldRefreshSession) {
      csrfToken = null;
      await initializeSession(true);
      return rawRequest(path, { ...options, method, sessionRetried: true });
    }
    throw error;
  }
}

export async function downloadFromApi(path, fallbackName) {
  const response = await apiFetch(path, {
    method: "GET",
    responseType: "response",
  });
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = extractDownloadName(disposition) || fallbackName;
  saveBlob(blob, fileName);
  return fileName;
}

async function rawRequest(path, options = {}) {
  const response = await apiFetch(path, options);
  if (options.responseType === "response") {
    return response;
  }
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("Server lokal memberikan respons yang tidak dikenali.", {
      code: "INVALID_SERVER_RESPONSE",
      status: response.status,
    });
  }

  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    const errorPayload = payload?.error || {};
    throw new ApiError(
      errorPayload.message || payload?.message || "Permintaan tidak dapat diproses.",
      {
        code: errorPayload.code || `HTTP_${response.status}`,
        status: response.status,
        details: errorPayload.details,
      },
    );
  }

  return payload?.data ?? payload;
}

async function apiFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const isMutation = MUTATION_METHODS.has(method);
  const requestId = createRequestId();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", options.responseType === "response" ? "*/*" : "application/json");
  headers.set("X-Inventory-App", APP_HEADER_VALUE);
  headers.set("X-Request-ID", requestId);

  if (isMutation) {
    headers.set("X-CSRF-Token", csrfToken || "");
    headers.set("X-Idempotency-Key", options.idempotencyKey || requestId);
  }

  let body = options.body;
  if (body !== undefined && body !== null && options.rawBody !== true) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const url = path.startsWith("/api/") ? path : `${API_ROOT}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      credentials: "same-origin",
      cache: "no-store",
      // Follow same-origin redirects (trailing slash, etc.). "error" treated
      // benign redirects as hard network failures and falsely showed disconnect.
      redirect: "follow",
      signal: options.signal,
    });
    // Only treat successful HTTP contact as transport-up. 5xx still means the
    // process is reachable; true offline is handled in the catch below.
    apiEvents.dispatchEvent(new CustomEvent("connection", { detail: true }));
    return response;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    apiEvents.dispatchEvent(new CustomEvent("connection", { detail: false }));
    throw new ApiError(
      "Server lokal tidak dapat dihubungi. Pastikan python run.py masih berjalan, lalu buka http://127.0.0.1:8765 (bukan localhost IPv6).",
      {
        code: "LOCAL_SERVER_UNAVAILABLE",
        isNetworkError: true,
      },
    );
  }
}

function createRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function extractDownloadName(disposition) {
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) {
    try {
      return safeFileName(decodeURIComponent(utfMatch[1]));
    } catch {
      return safeFileName(utfMatch[1]);
    }
  }
  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  return basicMatch ? safeFileName(basicMatch[1]) : null;
}

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeFileName(fileName);
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
