import { createMovement } from "../api/movement-api.js";
import {
  applyFieldErrors,
  createErrorSummary,
  createFormField,
  getFormValues,
  trackFormDirty,
} from "./forms.js";
import { closeModal, confirmAction, openModal } from "./modal.js";
import { showApiError, showToast } from "./toast.js";
import { button, element, replace, runWithButtonBusy } from "../utils/dom.js";
import { formatNumber, movementLabel, normalizeOptionalText } from "../utils/formatting.js";
import { validateMovement } from "../utils/validation.js";

export function openMovementForm(options) {
  const item = options.item;
  const type = String(options.type || "IN").toUpperCase() === "OUT" ? "OUT" : "IN";
  const form = element("form", {
    attributes: { id: "movementForm", novalidate: true },
  });
  const errorSlot = element("div");
  const quantityField = createFormField({
    name: "quantity",
    label: "Jumlah",
    type: "number",
    value: "",
    placeholder: "Masukkan jumlah",
    min: 0.001,
    step: 0.001,
    inputMode: "decimal",
    required: true,
    wide: true,
    help:
      type === "OUT"
        ? `Maksimal ${formatNumber(item.current_stock)} ${item.unit || ""}.`
        : "Gunakan maksimal tiga angka di belakang koma.",
  });
  const noteField = createFormField({
    name: "note",
    label: "Keterangan",
    type: "textarea",
    placeholder:
      type === "IN"
        ? "Sumber barang, penerimaan, atau catatan lain (opsional)"
        : "Tujuan pemakaian, pengeluaran, atau catatan lain (opsional)",
    maxLength: 500,
    wide: true,
  });

  form.append(
    errorSlot,
    element("div", {
      className: "stock-context",
      children: [
        element("div", {
          children: [
            element("strong", { text: item.name }),
            element("small", {
              text: `${item.unit || "—"} · ${getCategoryLabel(item)}`,
            }),
          ],
        }),
        element("span", {
          className: "stock-context-value",
          text: `${formatNumber(item.current_stock)} ${item.unit || ""}`,
        }),
      ],
    }),
    element("div", {
      className: "form-grid",
      children: [quantityField.wrapper, noteField.wrapper],
    }),
    element("button", {
      className: "sr-only",
      attributes: { type: "submit", tabindex: "-1" },
      text: "Simpan pergerakan",
    }),
  );

  const initialValues = getFormValues(form);
  const isDirty = trackFormDirty(form, initialValues);
  const cancelButton = button("Batal", {
    onClick: () => closeModal(),
    modalAction: "cancel",
  });
  const saveButton = button("Simpan pergerakan", {
    variant: type === "IN" ? "button-success" : "button-primary",
    iconName: type === "IN" ? "arrow-up" : "arrow-down",
    requiresConnection: true,
    modalAction: "submit",
    onClick: () => form.requestSubmit(),
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saveButton.dataset.busy === "true") {
      return;
    }

    const values = { ...getFormValues(form), movement_type: type };
    const errors = validateMovement(values);
    if (
      type === "OUT" &&
      Number(values.quantity) > Number(item.current_stock) &&
      !errors.quantity
    ) {
      errors.quantity = `Stok tidak cukup. Tersedia ${formatNumber(item.current_stock)} ${
        item.unit || ""
      }.`;
    }

    applyFieldErrors(form, errors);
    replace(errorSlot);
    if (Object.keys(errors).length > 0) {
      replace(errorSlot, createErrorSummary("Periksa kembali data pergerakan stok."));
      form.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    const payload = {
      item_id: item.id,
      movement_type: type,
      quantity: Number(values.quantity),
      note: normalizeOptionalText(values.note),
    };

    await runWithButtonBusy(saveButton, "Menyimpan…", async () => {
      try {
        const result = await createMovement(payload);
        await closeModal({ force: true });
        showToast({
          type: "success",
          title: `${movementLabel(type)} tersimpan`,
          message: `Stok ${item.name} telah diperbarui dan dicatat dalam riwayat.`,
        });
        options.onSaved?.(result?.movement || result);
      } catch (error) {
        replace(errorSlot, createErrorSummary(error.message || "Pergerakan tidak dapat disimpan."));
        showApiError(error, "Pergerakan stok gagal");
      }
    });
  });

  // Shared by inventory rows and the stock-history footer.
  openModal({
    size: "settings",
    eyebrow: movementLabel(type),
    title: type === "IN" ? "Catat barang masuk" : "Catat barang keluar",
    description: "Stok dan riwayat diperbarui bersama dalam satu transaksi.",
    body: form,
    footer: [cancelButton, saveButton],
    initialFocus: quantityField.input,
    returnFocus: options.trigger,
    // Keep parent history window parked underneath when opened from item detail.
    preserveParent: Boolean(options.preserveParent),
    canClose: async () => {
      if (!isDirty()) {
        return true;
      }
      return confirmAction({
        eyebrow: "Belum tersimpan",
        title: "Batalkan pencatatan?",
        message: "Data pergerakan yang sudah diisi akan hilang.",
        confirmLabel: "Buang data",
        danger: true,
      });
    },
  });
}

function getCategoryLabel(item) {
  return item.category_name || item.category?.name || "Tanpa kategori";
}
