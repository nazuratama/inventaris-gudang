import { normalizeOptionalText } from "./formatting.js";

export function validateItem(values, isEditing = false) {
  const errors = {};
  const name = normalizeOptionalText(values.name);
  const unit = normalizeOptionalText(values.unit);
  const description = normalizeOptionalText(values.description);
  const currentStock = parseQuantity(values.current_stock);

  if (!name) {
    errors.name = "Nama barang wajib diisi.";
  } else if (name.length > 150) {
    errors.name = "Nama barang maksimal 150 karakter.";
  }

  if (!unit) {
    errors.unit = "Satuan wajib dipilih.";
  } else if (unit.length > 32) {
    errors.unit = "Satuan maksimal 32 karakter.";
  }

  if (!isEditing) {
    if (currentStock === null || currentStock < 0) {
      errors.current_stock = "Stok awal harus berupa angka 0 atau lebih.";
    }
  }

  if (description && description.length > 1000) {
    errors.description = "Deskripsi maksimal 1.000 karakter.";
  }

  return errors;
}

export function validateMovement(values) {
  const errors = {};
  const type = String(values.movement_type || "").toUpperCase();
  const quantity = parseQuantity(values.quantity);
  const note = normalizeOptionalText(values.note);

  if (!["IN", "OUT"].includes(type)) {
    errors.movement_type = "Jenis pergerakan tidak valid.";
  }

  if (quantity === null || quantity <= 0) {
    errors.quantity = "Jumlah harus lebih dari 0.";
  }

  if (note && note.length > 500) {
    errors.note = "Keterangan maksimal 500 karakter.";
  }
  return errors;
}

export function parseQuantity(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function firstError(errors) {
  return Object.values(errors)[0] || "";
}
