import { openSettingsWindow } from "../pages/settings.js?v=20260717-settings1";
import { closeModal, openModal } from "../components/modal.js";
import { button, element } from "../utils/dom.js";

export function openHelpDialog({ navigate, returnFocus }) {
  openModal({
    size: "default",
    eyebrow: "Bantuan",
    title: "Panduan singkat ALFAN TANI",
    description: "Aplikasi inventaris gudang lokal untuk Kanjeng Alfian Diningrat.",
    body: element("div", {
      className: "page-stack help-dialog-body",
      children: [
        element("section", {
          className: "help-block",
          children: [
            element("h3", { text: "Mulai cepat" }),
            element("ul", {
              className: "help-list",
              children: [
                element("li", {
                  text: "Inventaris: kelola barang, kategori, lokasi, dan satuan.",
                }),
                element("li", {
                  text: "Klik barang di inventaris untuk membuka riwayat stok (masuk/keluar) di jendela mengambang.",
                }),
                element("li", {
                  text: "Analitik: grafik operasional dengan filter dan drilldown.",
                }),
                element("li", {
                  text: "Backup dan Ekspor: cadangan Excel/SQLite dan pemulihan.",
                }),
              ],
            }),
          ],
        }),
        element("section", {
          className: "help-block",
          children: [
            element("h3", { text: "Pintasan" }),
            element("ul", {
              className: "help-list",
              children: [
                element("li", { text: "Ctrl+K — navigasi cepat perintah." }),
                element("li", { text: "/ — fokusus ke pencarian global." }),
                element("li", { text: "N — tambah barang baru (saat terhubung)." }),
              ],
            }),
          ],
        }),
        element("section", {
          className: "help-block",
          children: [
            element("h3", { text: "Keamanan" }),
            element("p", {
              className: "muted",
              text: "Aplikasi hanya berjalan di 127.0.0.1 pada komputer ini. Data tidak dikirim ke internet.",
            }),
          ],
        }),
      ],
    }),
    footer: [
      button("Buka pengaturan", {
        variant: "button-primary",
        iconName: "settings",
        onClick: async () => {
          await closeModal({ force: true });
          openSettingsWindow({ navigate, returnFocus });
        },
      }),
    ],
  });
}
