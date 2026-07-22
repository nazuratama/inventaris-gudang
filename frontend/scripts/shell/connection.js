import { initializeSession, onApiConnectionChange } from "../api/client.js";
import { getHealth } from "../api/dashboard-api.js";
import { showApiError } from "../components/toast.js";
import { appState } from "../state/app-state.js";
import { applyBranding } from "../utils/branding.js";
import {
  backupStatusLabel,
  backupStatusTone,
  configureFormatting,
} from "../utils/formatting.js";

export function createConnectionController(elements) {
  const { backupStatus, connectionBanner } = elements;
  let applicationClosing = false;
  let consecutiveTransportFailures = 0;
  let disconnectVerifyTimer = null;
  let healthCheckInFlight = null;
  let healthTimer = null;

  function applySession(session) {
    appState.set("session", session);
    configureFormatting(session);
    const applicationName = document.getElementById("applicationName");
    if (applicationName) {
      applicationName.textContent = session?.application_name || "Inventaris Gudang";
    }
    applyBranding({
      company_name: session?.company_name,
      owner_name: session?.owner_name,
      owner_photo_url: session?.owner_photo_url,
      warehouse_logo_url: session?.warehouse_logo_url,
    });
  }

  function updateMutationAvailability() {
    const connected = Boolean(appState.get("connected"));
    for (const control of document.querySelectorAll("[data-requires-connection]")) {
      if ("disabled" in control) {
        control.disabled = !connected || control.dataset.busy === "true";
      }
      control.setAttribute("aria-disabled", connected ? "false" : "true");
    }
  }

  function setConnectionState(connected, health = appState.get("health")) {
    appState.set("connected", connected);
    document.documentElement.dataset.connected = connected ? "true" : "false";
    if (connectionBanner) {
      connectionBanner.hidden = connected;
    }

    const bannerTitle = connectionBanner?.querySelector("strong");
    const bannerMessage = connectionBanner?.querySelector("span");
    if (!connected && health && health.database_status !== "healthy") {
      if (bannerTitle) {
        bannerTitle.textContent = "Database lokal tidak siap";
      }
      if (bannerMessage) {
        bannerMessage.textContent =
          "Perubahan dinonaktifkan untuk melindungi data. Periksa dokumentasi pemulihan.";
      }
    } else if (bannerTitle || bannerMessage) {
      if (bannerTitle) {
        bannerTitle.textContent = "Koneksi server lokal terputus";
      }
      if (bannerMessage) {
        bannerMessage.textContent =
          "Perubahan dinonaktifkan sementara. Pastikan server masih berjalan di http://127.0.0.1:8765 lalu muat ulang atau tekan Coba lagi.";
      }
    }
    updateMutationAvailability();
  }

  async function establishSession({ force = false, showError = false } = {}) {
    try {
      const session = await initializeSession(force);
      if (session) {
        applySession(session);
      }
      consecutiveTransportFailures = 0;
      setConnectionState(true);
      return true;
    } catch (error) {
      if (showError) {
        showApiError(error, "Sesi aplikasi belum tersedia");
      }
      if (error?.isNetworkError) {
        consecutiveTransportFailures += 1;
        if (consecutiveTransportFailures >= 2) {
          setConnectionState(false);
        }
      }
      return false;
    }
  }

  async function checkHealth() {
    if (healthCheckInFlight) {
      return healthCheckInFlight;
    }

    healthCheckInFlight = (async () => {
      try {
        const health = await getHealth();
        appState.set("health", health);
        appState.set("backup", health.backup_status || null);
        const healthy =
          String(health.status || "").toLowerCase() === "healthy" &&
          String(health.database_status || "").toLowerCase() === "healthy";
        consecutiveTransportFailures = healthy ? 0 : consecutiveTransportFailures;
        setConnectionState(healthy, health);
        return healthy;
      } catch {
        consecutiveTransportFailures += 1;
        if (consecutiveTransportFailures >= 2 || !appState.get("connected")) {
          setConnectionState(false);
        }
        return false;
      } finally {
        healthCheckInFlight = null;
      }
    })();

    return healthCheckInFlight;
  }

  function startHealthPolling() {
    window.clearInterval(healthTimer);
    healthTimer = window.setInterval(() => {
      void checkHealth();
    }, 10_000);
  }

  function stopHealthPolling() {
    window.clearInterval(healthTimer);
  }

  function updateBackupStatus(backup) {
    const state = String(
      backup?.state || backup?.status || backup?.backup_status?.state || "idle",
    ).toUpperCase();
    const tone = backupStatusTone(state);
    const dot = backupStatus.querySelector(".status-dot");
    dot.className = `status-dot status-${tone}`;
    backupStatus.querySelector("span:last-child").textContent = backupStatusLabel(state);
    backupStatus.title =
      state === "FAILED"
        ? "Backup gagal; data SQLite utama tetap tersimpan"
        : backupStatusLabel(state);
  }

  function installStateBindings() {
    onApiConnectionChange((connected) => {
      if (applicationClosing) {
        return;
      }
      if (connected) {
        consecutiveTransportFailures = 0;
        const health = appState.get("health");
        const databaseHealthy =
          !health || String(health.database_status || "").toLowerCase() === "healthy";
        if (databaseHealthy) {
          setConnectionState(true, health);
        }
        return;
      }

      consecutiveTransportFailures += 1;
      window.clearTimeout(disconnectVerifyTimer);
      disconnectVerifyTimer = window.setTimeout(() => {
        void checkHealth();
      }, consecutiveTransportFailures >= 2 ? 0 : 400);
    });
    appState.subscribe("backup", updateBackupStatus);
  }

  return {
    checkHealth,
    establishSession,
    installStateBindings,
    setApplicationClosing(value) {
      applicationClosing = value;
    },
    startHealthPolling,
    stopHealthPolling,
    updateMutationAvailability,
  };
}
