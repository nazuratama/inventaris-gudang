import { element, icon, replace, runWithButtonBusy } from "./utils/dom.js";
import { formatNumber } from "./utils/formatting.js";

const STORAGE_KEY = "inventaris-items";
const inspectButton = document.getElementById("inspectLegacyButton");
const exportButton = document.getElementById("exportLegacyButton");
const statusNode = document.getElementById("legacyStatus");

let validatedExport = null;

inspectButton.addEventListener("click", async () => {
  await runWithButtonBusy(inspectButton, "Memeriksa…", async () => {
    try {
      const storedValue = await readLegacyStorage();
      const parsed = JSON.parse(storedValue);
      if (!Array.isArray(parsed)) {
        throw new Error("Data lama bukan daftar barang.");
      }

      const errors = [];
      const items = parsed.map((item, index) => validateLegacyItem(item, index + 1, errors));
      validateLegacyCollection(items, errors);
      if (errors.length > 0) {
        validatedExport = null;
        exportButton.disabled = true;
        renderErrors(errors);
        return;
      }

      validatedExport = {
        schema_version: "legacy-inventory-1",
        exported_at: new Date().toISOString(),
        source_storage_key: STORAGE_KEY,
        items,
      };
      exportButton.disabled = false;
      renderSuccess(items);
    } catch (error) {
      validatedExport = null;
      exportButton.disabled = true;
      renderFailure(error.message);
    }
  });
});

exportButton.addEventListener("click", () => {
  if (!validatedExport) {
    return;
  }
  const content = JSON.stringify(validatedExport, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `inventaris_lama_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
});

async function readLegacyStorage() {
  if (window.storage && typeof window.storage.get === "function") {
    const result = await window.storage.get(STORAGE_KEY, false);
    if (result?.value) {
      return result.value;
    }
  }
  const localValue = window.localStorage.getItem(STORAGE_KEY);
  if (localValue) {
    return localValue;
  }
  throw new Error(
    "Data dengan kunci inventaris-items tidak ditemukan pada konteks browser ini.",
  );
}

function validateLegacyItem(item, rowNumber, errors) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`Baris ${rowNumber}: data barang bukan objek yang valid.`);
    return {};
  }
  const name = normalize(item.nama ?? item.name);
  const unit = normalize(item.satuan ?? item.unit) || "Pcs";
  const stock = Number(item.stok ?? item.current_stock ?? 0);
  const minimumStock = Number(item.minimum_stock ?? 0);

  if (!name || name.length > 150) {
    errors.push(`Baris ${rowNumber}: nama barang wajib diisi dan maksimal 150 karakter.`);
  }
  if (!unit || unit.length > 32) {
    errors.push(`Baris ${rowNumber}: satuan wajib diisi dan maksimal 32 karakter.`);
  }
  if (!Number.isFinite(stock) || stock < 0) {
    errors.push(`Baris ${rowNumber}: stok harus berupa angka 0 atau lebih.`);
  }
  if (!Number.isFinite(minimumStock) || minimumStock < 0) {
    errors.push(`Baris ${rowNumber}: batas stok minimum harus 0 atau lebih.`);
  }

  return {
    sku: normalize(item.sku),
    nama: name,
    kategori: normalize(item.kategori ?? item.category),
    lokasi: normalize(item.lokasi ?? item.location),
    satuan: unit,
    stok: Number.isFinite(stock) && stock >= 0 ? stock : 0,
    minimum_stock:
      Number.isFinite(minimumStock) && minimumStock >= 0 ? minimumStock : 0,
    deskripsi: normalize(item.deskripsi ?? item.description),
  };
}

function renderSuccess(items) {
  replace(
    statusNode,
    element("div", {
      className: "empty-state-content",
      children: [
        element("span", {
          className: "empty-state-icon",
          children: [icon("check-circle")],
        }),
        element("h2", { text: "Data lama siap diekspor" }),
        element("p", {
          text: `${formatNumber(items.length)} barang lolos validasi. File JSON dapat diimpor melalui halaman Backup dan Ekspor.`,
        }),
      ],
    }),
  );
}

function renderErrors(errors) {
  replace(
    statusNode,
    element("div", {
      className: "empty-state-content",
      children: [
        element("span", {
          className: "empty-state-icon",
          children: [icon("alert-triangle")],
        }),
        element("h2", { text: "Data lama perlu diperbaiki" }),
        element("p", { text: `${errors.length} masalah ditemukan.` }),
        element("ul", {
          className: "validation-list",
          children: errors.map((message) => element("li", { text: message })),
        }),
      ],
    }),
  );
}

function renderFailure(message) {
  replace(
    statusNode,
    element("div", {
      className: "empty-state-content",
      children: [
        element("span", {
          className: "empty-state-icon",
          children: [icon("alert-triangle")],
        }),
        element("h2", { text: "Data lama tidak ditemukan" }),
        element("p", { text: message }),
      ],
    }),
  );
}

function normalize(value) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

function validateLegacyCollection(items, errors) {
  const seenSkus = new Map();
  const seenItems = new Map();
  items.forEach((item, index) => {
    const rowNumber = index + 1;
    if (item.sku) {
      const skuKey = item.sku.toLocaleLowerCase("id-ID");
      if (seenSkus.has(skuKey)) {
        errors.push(
          `Baris ${rowNumber}: SKU duplikat dengan baris ${seenSkus.get(skuKey)}.`,
        );
      } else {
        seenSkus.set(skuKey, rowNumber);
      }
    }
    if (item.nama) {
      const itemKey = [item.nama, item.kategori || "", item.lokasi || ""]
        .map((value) => value.toLocaleLowerCase("id-ID"))
        .join("\u0000");
      if (seenItems.has(itemKey)) {
        errors.push(
          `Baris ${rowNumber}: barang duplikat dengan baris ${seenItems.get(itemKey)}.`,
        );
      } else {
        seenItems.set(itemKey, rowNumber);
      }
    }
  });
}
