import { mountAnalytics } from "../pages/analytics.js?v=20260722-ui14";
import { mountBackups } from "../pages/backups.js?v=20260716-echarts1";
import { mountDashboard } from "../pages/dashboard.js?v=20260722-ui14";
import { mountInventory } from "../pages/inventory.js?v=20260722-ui14";
import { mountSettings } from "../pages/settings.js?v=20260717-settings1";

export const routes = {
  dashboard: {
    title: "Dasbor",
    description: "Ringkasan stok, aktivitas, dan grafik unggulan.",
    mount: mountDashboard,
  },
  inventory: {
    title: "Inventaris",
    description: "Daftar barang, filter, dan riwayat stok.",
    mount: mountInventory,
  },
  analytics: {
    title: "Analitik",
    description: "Grafik pergerakan stok, risiko, dan tren gudang.",
    mount: mountAnalytics,
  },
  backups: {
    title: "Backup dan Ekspor",
    description: "Cadangkan, ekspor, impor, dan pulihkan data lokal.",
    mount: mountBackups,
  },
  settings: {
    title: "Pengaturan",
    description: "Identitas usaha, tampilan, dan preferensi sistem.",
    mount: mountSettings,
  },
};
