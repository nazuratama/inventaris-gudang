import { createItem, updateItem } from "../api/inventory-api.js";
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
import { normalizeOptionalText } from "../utils/formatting.js";
import { loadCatalogs } from "../utils/catalogs.js";
import { validateItem } from "../utils/validation.js";

export async function openItemForm(options = {}) {
  const item = options.item || null;
  const isEditing = Boolean(item);
  let catalogs;

  try {
    catalogs = await loadCatalogs();
  } catch (error) {
    showApiError(error, "Daftar kategori, lokasi, dan satuan gagal dimuat");
    return;
  }

  const form = element("form", {
    attributes: {
      id: "itemForm",
      novalidate: true,
    },
  });
  const errorSlot = element("div");
  const categoryId = item?.category_id || item?.category?.id || "";
  const locationId = item?.location_id || item?.location?.id || "";
  const unitValue = item?.unit || "";
  const unitOptions = (catalogs.units || []).map((unit) => ({
    value: unit.name,
    label: unit.name,
  }));
  if (unitValue && !unitOptions.some((entry) => entry.value === unitValue)) {
    unitOptions.unshift({ value: unitValue, label: unitValue });
  }

  const fields = {
    name: createFormField({
      name: "name",
      label: "Nama barang",
      value: item?.name || "",
      placeholder: "Contoh: Pupuk NPK 16-16-16",
      maxLength: 150,
      required: true,
    }),
    category_id: createFormField({
      name: "category_id",
      label: "Kategori",
      type: "select",
      value: categoryId,
      options: [
        { value: "", label: "Tanpa kategori" },
        ...(catalogs.categories || []).map((category) => ({
          value: category.id,
          label: category.name,
        })),
      ],
    }),
    location_id: createFormField({
      name: "location_id",
      label: "Lokasi penyimpanan",
      type: "select",
      value: locationId,
      options: [
        { value: "", label: "Belum ditentukan" },
        ...(catalogs.locations || []).map((location) => ({
          value: location.id,
          label: location.name,
        })),
      ],
    }),
    unit: createFormField({
      name: "unit",
      label: "Satuan",
      type: "select",
      value: unitValue,
      required: true,
      options: [
        { value: "", label: unitOptions.length ? "Pilih satuan" : "Belum ada satuan" },
        ...unitOptions,
      ],
      help: "Satuan dikelola di tab Satuan, lalu dipilih di sini.",
    }),
    current_stock: createFormField({
      name: "current_stock",
      label: "Stok awal",
      type: "number",
      value: item?.current_stock ?? "0",
      min: 0,
      step: 0.001,
      inputMode: "decimal",
      required: true,
      help: "Setelah dibuat, stok hanya dapat berubah melalui barang masuk/keluar. Warna stok mengikuti batas minimum global di Pengaturan.",
    }),
    description: createFormField({
      name: "description",
      label: "Deskripsi",
      type: "textarea",
      value: item?.description || "",
      placeholder: "Catatan identifikasi atau penyimpanan (opsional)",
      maxLength: 1000,
      wide: true,
    }),
  };

  const gridChildren = [
    fields.name.wrapper,
    fields.category_id.wrapper,
    fields.location_id.wrapper,
    fields.unit.wrapper,
    !isEditing ? fields.current_stock.wrapper : null,
    fields.description.wrapper,
  ];
  form.append(
    errorSlot,
    element("div", { className: "form-grid", children: gridChildren }),
    element("button", {
      className: "sr-only",
      attributes: { type: "submit", tabindex: "-1" },
      text: "Simpan",
    }),
  );

  const initialValues = getFormValues(form);
  const isDirty = trackFormDirty(form, initialValues);
  const cancelButton = button("Batal", {
    onClick: () => closeModal(),
    modalAction: "cancel",
  });
  const saveButton = button(isEditing ? "Simpan perubahan" : "Tambah barang", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    modalAction: "submit",
    onClick: () => form.requestSubmit(),
  });
  const footer = [cancelButton, saveButton];

  async function submitForm(event) {
    event.preventDefault();
    if (saveButton.dataset.busy === "true") {
      return;
    }

    const values = getFormValues(form);
    const errors = validateItem(values, isEditing);
    applyFieldErrors(form, errors);
    replace(errorSlot);
    if (Object.keys(errors).length > 0) {
      const summary = createErrorSummary("Periksa kembali bidang yang ditandai.");
      replace(errorSlot, summary);
      summary.focus();
      form.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    const payload = {
      name: normalizeOptionalText(values.name),
      category_id: values.category_id || null,
      location_id: values.location_id || null,
      unit: normalizeOptionalText(values.unit),
      description: normalizeOptionalText(values.description),
    };
    if (!isEditing) {
      payload.current_stock = Number(values.current_stock);
    }

    await runWithButtonBusy(
      saveButton,
      isEditing ? "Menyimpan…" : "Menambahkan…",
      async () => {
        try {
          const result = isEditing
            ? await updateItem(item.id, payload)
            : await createItem(payload);
          await closeModal({ force: true });
          showToast({
            type: "success",
            title: isEditing ? "Barang diperbarui" : "Barang ditambahkan",
            message: `${payload.name} telah tersimpan dan backup dijadwalkan.`,
          });
          options.onSaved?.(result?.item || result);
        } catch (error) {
          applyBackendErrors(form, error);
          replace(errorSlot, createErrorSummary(error.message || "Data tidak dapat disimpan."));
          showApiError(error, "Barang belum tersimpan");
        }
      },
    );
  }

  form.addEventListener("submit", submitForm);
  openModal({
    // The compact shell is shared by inventory and history views.
    size: "settings",
    eyebrow: isEditing ? "Inventaris" : "Barang baru",
    title: isEditing ? "Edit barang" : "Tambah barang",
    description: isEditing
      ? "Stok tidak dapat diedit langsung. Gunakan barang masuk atau keluar."
      : "Lengkapi identitas barang dan stok awal.",
    body: form,
    footer,
    initialFocus: fields.name.input,
    returnFocus: options.trigger,
    preserveParent: Boolean(options.preserveParent),
    canClose: async () => {
      if (!isDirty()) {
        return true;
      }
      return confirmAction({
        eyebrow: "Perubahan belum disimpan",
        title: "Batalkan pengisian?",
        message: "Nilai yang sudah Anda isi akan hilang.",
        confirmLabel: "Buang perubahan",
        danger: true,
      });
    },
  });
}

function applyBackendErrors(form, error) {
  const details = error?.details;
  if (!details) {
    return;
  }
  const fieldErrors = {};

  if (Array.isArray(details)) {
    for (const entry of details) {
      const location = Array.isArray(entry?.loc) ? entry.loc.at(-1) : entry?.field;
      if (location && (entry?.msg || entry?.message)) {
        fieldErrors[location] = entry.msg || entry.message;
      }
    }
  } else if (typeof details === "object") {
    for (const [field, message] of Object.entries(details)) {
      fieldErrors[field] = Array.isArray(message) ? message.join(", ") : String(message);
    }
  }
  applyFieldErrors(form, fieldErrors);
}
