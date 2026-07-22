import { deleteMovement } from "../api/movement-api.js";
import { confirmAction } from "./modal.js";
import { showApiError, showToast } from "./toast.js";
import {
  formatNumber,
  movementLabel,
} from "../utils/formatting.js";
import { getItemName } from "../utils/data.js";

/**
 * Confirm and permanently delete a stock-history row.
 * Backend reverses the movement and recalculates later rows for the same item.
 *
 * @returns {Promise<object|null>} API payload on success, null if cancelled/failed
 */
export async function confirmAndDeleteMovement(movement, options = {}) {
  const type = String(movement.movement_type || movement.type || "").toUpperCase();
  const itemName = getItemName(movement) || "barang";
  const qty = formatNumber(movement.quantity);
  const sign = type === "IN" ? "+" : type === "OUT" ? "−" : "";
  const stockHint =
    movement.stock_before !== undefined && movement.stock_before !== null
      ? ` Stok pada transaksi ini: ${formatNumber(movement.stock_before)} → ${formatNumber(movement.stock_after)}.`
      : "";

  const confirmed = await confirmAction({
    eyebrow: "Hapus riwayat stok",
    title: `Hapus ${movementLabel(type)} ${sign}${qty}?`,
    message: `Catatan untuk ${itemName} akan dihapus permanen.`,
    detail:
      `Stok barang dikembalikan seolah transaksi ini tidak pernah terjadi.${stockHint} ` +
      "Jika ada transaksi lanjutan, rantai stok akan dihitung ulang otomatis.",
    confirmLabel: "Hapus & kembalikan stok",
    cancelLabel: "Batal",
    danger: true,
  });

  if (!confirmed) {
    return null;
  }

  try {
    const result = await deleteMovement(movement.id);
    const restored = result?.restored_stock ?? result?.movement?.stock_before;
    const name = result?.item_name || itemName;
    showToast({
      tone: "success",
      title: "Riwayat dihapus",
      message:
        restored !== undefined && restored !== null
          ? `Stok ${name} dikembalikan menjadi ${formatNumber(restored)}.`
          : `Stok ${name} telah dikembalikan.`,
    });
    options.onDeleted?.(result);
    return result;
  } catch (error) {
    showApiError(error, "Riwayat tidak dapat dihapus");
    return null;
  }
}
