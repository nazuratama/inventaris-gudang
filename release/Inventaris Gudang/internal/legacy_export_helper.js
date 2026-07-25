const STORAGE_KEY = "inventaris-items";
const exportButton = document.querySelector("#exportButton");
const statusElement = document.querySelector("#status");

function normalizeText(value, maximumLength) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized.slice(0, maximumLength);
}

function normalizeItem(item, index) {
  const name = normalizeText(item?.nama, 150);
  const stock = Number(item?.stok ?? 0);
  if (!name) {
    throw new Error(`Baris ${index + 1}: nama barang kosong.`);
  }
  if (!Number.isFinite(stock) || stock < 0 || stock > 1_000_000_000) {
    throw new Error(`Baris ${index + 1}: stok tidak valid.`);
  }
  return {
    name,
    location: normalizeText(item?.lokasi, 100) || null,
    category: normalizeText(item?.kategori, 100).replace(/^—$/, "") || null,
    unit: normalizeText(item?.satuan, 32).replace(/^—$/, "") || "Unit",
    current_stock: Math.round(stock * 1000) / 1000,
  };
}

async function readLegacyValue() {
  if (window.storage && typeof window.storage.get === "function") {
    const result = await window.storage.get(STORAGE_KEY, false);
    return result?.value ?? null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventaris-lama.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function exportLegacyData() {
  exportButton.disabled = true;
  statusElement.textContent = "Membaca dan memvalidasi data…";
  try {
    const rawValue = await readLegacyValue();
    if (!rawValue) {
      throw new Error("Data inventaris lama tidak ditemukan pada origin ini.");
    }
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      throw new Error("Format penyimpanan lama bukan daftar barang.");
    }
    const items = parsed.map(normalizeItem);
    downloadJson({
      schema_version: "legacy-inventory-1",
      exported_at: new Date().toISOString(),
      source_key: STORAGE_KEY,
      items,
    });
    statusElement.textContent = `${items.length} barang berhasil divalidasi dan diekspor.`;
  } catch (error) {
    statusElement.textContent = error instanceof Error
      ? error.message
      : "Data lama gagal diekspor.";
  } finally {
    exportButton.disabled = false;
  }
}

exportButton.addEventListener("click", exportLegacyData);

