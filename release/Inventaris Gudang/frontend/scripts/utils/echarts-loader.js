const ECHARTS_PATH = "/assets/vendor/echarts/echarts.min.js";
/** Vendored npm package identity (see LICENSE + verify_release checksum). */
export const ECHARTS_PACKAGE = "5.6.0";

let echartsPromise = null;

function isEchartsReady() {
  const api = window.echarts;
  return Boolean(api && typeof api.init === "function" && typeof api.version === "string");
}

export function loadEcharts() {
  if (isEchartsReady()) {
    return Promise.resolve(window.echarts);
  }
  if (echartsPromise) {
    return echartsPromise;
  }
  // Charts demand dramatic entrances.
  echartsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ECHARTS_PATH;
    script.async = true;
    script.dataset.echartsLocal = "true";
    script.dataset.echartsPackage = ECHARTS_PACKAGE;

    let settled = false;
    const settle = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener("error", handleWindowError, true);
      if (error) {
        reject(error);
        return;
      }
      resolve(window.echarts);
    };

    const handleWindowError = (event) => {
      const source = String(event?.filename || "");
      if (!source.includes("/assets/vendor/echarts/echarts.min.js")) {
        return;
      }
      const detail = event?.message || "eksekusi skrip gagal";
      settle(new Error(`Aset ECharts lokal gagal diinisialisasi (${detail}).`));
    };

    window.addEventListener("error", handleWindowError, true);

    script.addEventListener("load", () => {
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        if (!isEchartsReady()) {
          settle(
            new Error(
              "Aset ECharts lokal tidak valid: window.echarts.init tidak tersedia.",
            ),
          );
          return;
        }
        settle(null);
      }, 0);
    });
    script.addEventListener("error", () => {
      settle(new Error("Aset ECharts lokal gagal dimuat."));
    });
    document.head.append(script);
  }).catch((error) => {
    echartsPromise = null;
    throw error;
  });
  return echartsPromise;
}
