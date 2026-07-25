import { shutdownApplication } from "../api/settings-api.js";
import { confirmAction } from "../components/modal.js";
import { showApiError } from "../components/toast.js";
import { element, icon, replace } from "../utils/dom.js";

export function createShutdownController(elements, { connection, router }) {
  const { connectionBanner, pageContent, pageDescription, pageTitle } = elements;
  let applicationClosing = false;

  async function request() {
    if (applicationClosing) {
      return;
    }
    const confirmed = await confirmAction({
      eyebrow: "Tutup aplikasi",
      title: "Hentikan aplikasi ALFAN TANI?",
      message:
        "Server akan menyelesaikan backup tertunda, menutup database dengan aman, lalu berhenti.",
      detail: "Simpan atau batalkan formulir yang masih terbuka sebelum melanjutkan.",
      confirmLabel: "Tutup aplikasi",
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    applicationClosing = true;
    connection.setApplicationClosing(true);
    connection.stopHealthPolling();
    try {
      await shutdownApplication();
      router.stop();
      connectionBanner.hidden = true;
      pageTitle.textContent = "Aplikasi ditutup";
      pageDescription.textContent = "Server lokal telah dihentikan.";
      replace(
        pageContent,
        element("div", {
          className: "shutdown-state",
          children: [
            element("section", {
              className: "shutdown-card",
              children: [
                element("span", {
                  className: "summary-icon summary-icon-success",
                  children: [icon("check-circle")],
                }),
                element("h2", { text: "Aplikasi ALFAN TANI telah ditutup" }),
                element("p", {
                  text: "Backup tertunda sudah diselesaikan dan database ditutup dengan aman. Jika jendela tidak tertutup otomatis, tutup melalui tombol X.",
                }),
              ],
            }),
          ],
        }),
      );
      window.setTimeout(() => window.close(), 900);
    } catch (error) {
      applicationClosing = false;
      connection.setApplicationClosing(false);
      connection.startHealthPolling();
      showApiError(error, "Aplikasi belum dapat ditutup");
    }
  }

  return { request };
}
