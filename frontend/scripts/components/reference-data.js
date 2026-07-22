/**
 * Shared reference-data managers (categories, locations, and units).
 * Used by the inventory workspace; forms open as floating modals.
 */
import {
  createCategory,
  createLocation,
  createUnit,
  deleteCategory,
  deleteLocation,
  deleteUnit,
  updateCategory,
  updateLocation,
  updateUnit,
} from "../api/settings-api.js";
import { createFormField, getFormValues } from "./forms.js";
import { closeModal, confirmAction, openModal } from "./modal.js";
import { createPagination, paginationSummary } from "./pagination.js";
import { createEmptyState } from "./states.js";
import { showApiError, showToast } from "./toast.js";
import { invalidateCatalogs } from "../utils/catalogs.js";
import { badge, button, element, icon, replace, runWithButtonBusy } from "../utils/dom.js";
import { formatNumber, normalizeOptionalText } from "../utils/formatting.js";

export const REFERENCE_SCOPES = Object.freeze({
  items: {
    id: "items",
    label: "Barang",
    icon: "package",
    description: "Daftar inventaris gudang.",
  },
  categories: {
    id: "categories",
    label: "Kategori",
    icon: "category",
    description: "Kelompokkan barang untuk pencarian dan ringkasan.",
  },
  locations: {
    id: "locations",
    label: "Lokasi",
    icon: "location",
    description: "Rak, ruang, atau area penyimpanan gudang.",
  },
  units: {
    id: "units",
    label: "Satuan",
    icon: "adjust",
    description: "Satuan hitung barang (Pcs, Kg, Liter, dan lainnya).",
  },
});

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

export function parseInventoryScope(value) {
  const key = String(value || "items").toLowerCase();
  return REFERENCE_SCOPES[key] ? key : "items";
}

function normalizePageSize(value) {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

export function createInventoryScopeNav(activeScope, onSelect) {
  return element("nav", {
    className: "inventory-scope-nav",
    attributes: { "aria-label": "Bagian inventaris" },
    children: Object.values(REFERENCE_SCOPES).map((scope) =>
      element("button", {
        className: [
          "inventory-scope-chip",
          activeScope === scope.id ? "is-active" : null,
        ],
        attributes: {
          type: "button",
          "aria-pressed": activeScope === scope.id ? "true" : "false",
        },
        events: {
          click: () => onSelect(scope.id),
        },
        children: [
          icon(scope.icon),
          element("span", { text: scope.label }),
        ],
      }),
    ),
  });
}

export function createReferenceWorkspace(scope, records, context, options = {}) {
  const meta = REFERENCE_SCOPES[scope];
  if (!meta || scope === "items") {
    return null;
  }

  let query = String(options.search || "");
  let page = Math.max(1, Number(options.page || 1));
  let pageSize = normalizePageSize(options.pageSize ?? options.page_size);

  const searchInput = element("input", {
    attributes: {
      type: "search",
      placeholder: `Cari ${meta.label.toLowerCase()}…`,
      maxlength: 120,
      autocomplete: "off",
      "aria-label": `Cari ${meta.label}`,
    },
    properties: { value: query },
  });
  const pageSizeSelect = element("select", {
    className: ["filter-control", "button-compact"],
    attributes: { "aria-label": "Jumlah data per halaman" },
    events: {
      change: (event) => {
        pageSize = normalizePageSize(event.currentTarget.value);
        page = 1;
        options.onPageSizeChange?.(pageSize);
        render();
      },
    },
    children: PAGE_SIZE_OPTIONS.map((size) =>
      element("option", {
        text: `${size} per halaman`,
        attributes: { value: String(size) },
        properties: { selected: size === pageSize },
      }),
    ),
  });
  const listRegion = element("div", { className: "table-scroll reference-table-scroll" });
  const footer = element("footer", { className: "table-footer" });
  const countBadge = badge("0 data", "neutral");

  const shell = element("section", {
    className: ["card", "table-card", "reference-workspace-card"],
    children: [
      element("header", {
        className: "card-header",
        children: [
          element("div", {
            children: [
              element("h2", { text: `Daftar ${meta.label.toLowerCase()}` }),
              element("p", { text: meta.description }),
            ],
          }),
          countBadge,
        ],
      }),
      element("div", {
        className: "reference-toolbar reference-toolbar-inset",
        children: [
          element("label", {
            className: "search-control",
            children: [icon("search"), searchInput],
          }),
        ],
      }),
      listRegion,
      footer,
    ],
  });

  const render = () => {
    const filtered = filterRecords(scope, records, query);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, totalPages);
    const start = (page - 1) * pageSize;
    const pageRecords = filtered.slice(start, start + pageSize);

    replace(
      countBadge,
      badge(`${formatNumber(filtered.length)} data`, "neutral"),
    );

    if (!pageRecords.length) {
      replace(
        listRegion,
        createEmptyState({
          iconName: meta.icon,
          title: query
            ? `Tidak ada ${meta.label.toLowerCase()} yang cocok`
            : `${meta.label} belum tersedia`,
          message: query
            ? "Ubah kata pencarian atau kosongkan pencarian."
            : `Gunakan tombol Tambah ${meta.label.toLowerCase()} di kanan atas. Form muncul di jendela mengambang.`,
        }),
      );
    } else {
      replace(
        listRegion,
        element("div", {
          className: "catalog-list reference-catalog-list",
          children: pageRecords.map((record) =>
            createReferenceRow(scope, record, context),
          ),
        }),
      );
    }

    const pagination = {
      page,
      pageSize,
      total: filtered.length,
      totalPages,
    };
    replace(
      footer,
      element("div", {
        className: "table-summary",
        children: [
          element("span", {
            text:
              filtered.length > 0
                ? paginationSummary(pagination)
                : "Tidak ada data ditampilkan",
          }),
          pageSizeSelect,
        ],
      }),
      filtered.length > 0
        ? createPagination(pagination, (nextPage) => {
            page = nextPage;
            render();
          })
        : null,
    );
  };

  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      query = searchInput.value.trim();
      page = 1;
      render();
    }, 220);
  });

  render();
  return shell;
}

function filterRecords(scope, records, query) {
  const term = String(query || "").trim().toLowerCase();
  if (!term) {
    return records;
  }
  return records.filter((record) => {
    const haystack = [record.name, record.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

function createReferenceRow(scope, record, context) {
  const kind =
    scope === "categories" ? "category" : scope === "locations" ? "location" : "unit";
  return createCatalogRow(kind, record, context);
}

function createCatalogRow(kind, record, context) {
  const labels = {
    category: { singular: "kategori", icon: "category" },
    location: { singular: "lokasi", icon: "location" },
    unit: { singular: "satuan", icon: "adjust" },
  };
  const meta = labels[kind] || labels.category;
  return element("div", {
    className: "catalog-item",
    children: [
      element("span", {
        className: "movement-icon",
        children: [icon(meta.icon)],
      }),
      element("div", {
        className: "list-copy",
        children: [
          element("div", {
            className: "title-with-badge",
            children: [
              element("strong", { text: record.name }),

            ],
          }),
          element("small", {
            text: `${formatNumber(record.item_count || 0)} barang${
              kind === "location" && record.description ? ` · ${record.description}` : ""
            }`,
          }),
        ],
      }),
      element("div", {
        className: "catalog-item-actions",
        children: [
          element("button", {
            className: "icon-button",
            attributes: {
              type: "button",
              title: "Edit",
              "aria-label": `Edit ${record.name}`,
              "data-requires-connection": true,
            },
            events: {
              click: (event) =>
                openCatalogEditor(kind, record, context, event.currentTarget),
            },
            children: [icon("edit")],
          }),
          element("button", {
            className: ["icon-button", "icon-button-danger"],
            attributes: {
              type: "button",
              title: "Hapus",
              "aria-label": `Hapus ${record.name}`,
              "data-requires-connection": true,
            },
            events: {
              click: async () => {
                const confirmed = await confirmAction({
                  eyebrow: `Hapus ${meta.singular}`,
                  title: `Hapus ${record.name}?`,
                  message:
                    Number(record.item_count || 0) > 0
                      ? "Data ini masih digunakan oleh barang dan kemungkinan tidak dapat dihapus."
                      : "Data referensi akan dihapus permanen.",
                  confirmLabel: "Hapus",
                  danger: true,
                });
                if (!confirmed) {
                  return;
                }
                try {
                  if (kind === "category") {
                    await deleteCategory(record.id);
                  } else if (kind === "location") {
                    await deleteLocation(record.id);
                  } else {
                    await deleteUnit(record.id);
                  }
                  await referenceChanged(
                    `${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} dihapus`,
                    context,
                  );
                } catch (error) {
                  showApiError(
                    error,
                    `${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} tidak dapat dihapus`,
                  );
                }
              },
            },
            children: [icon("trash")],
          }),
        ],
      }),
    ],
  });
}

export function openCatalogEditor(kind, record, context, trigger) {
  const labels = {
    category: {
      eyebrow: "Kategori",
      noun: "kategori",
      nameLabel: "Nama kategori",
      placeholder: "Contoh: Bahan kemasan",
      description:
        "Nama kategori harus unik. Pilih dari daftar saat menambah barang.",
    },
    location: {
      eyebrow: "Lokasi",
      noun: "lokasi",
      nameLabel: "Nama lokasi",
      placeholder: "Contoh: Rak A1",
      description: "Nama lokasi harus unik; deskripsi bersifat opsional.",
    },
    unit: {
      eyebrow: "Satuan",
      noun: "satuan",
      nameLabel: "Nama satuan",
      placeholder: "Contoh: Pcs, Kg, Liter",
      description:
        "Satuan dipilih dari daftar saat menambah/edit barang, bukan diketik bebas.",
    },
  };
  const meta = labels[kind] || labels.category;
  const nameField = createFormField({
    name: "name",
    label: meta.nameLabel,
    value: record?.name || "",
    placeholder: meta.placeholder,
    maxLength: kind === "unit" ? 32 : 100,
    required: true,
    wide: true,
  });
  const descriptionField =
    kind === "location"
      ? createFormField({
          name: "description",
          label: "Deskripsi lokasi",
          type: "textarea",
          value: record?.description || "",
          placeholder: "Keterangan area atau petunjuk akses (opsional)",
          maxLength: 500,
          wide: true,
        })
      : null;
  const form = element("form", {
    attributes: { novalidate: true },
    children: [
      element("div", {
        className: "form-grid",
        children: [nameField.wrapper, descriptionField?.wrapper],
      }),
      element("button", {
        className: "sr-only",
        attributes: { type: "submit", tabindex: "-1" },
        text: "Simpan",
      }),
    ],
  });
  const cancelButton = button("Batal", {
    onClick: () => closeModal(),
    modalAction: "cancel",
  });
  const saveButton = button(record ? "Simpan perubahan" : "Tambah", {
    variant: "button-primary",
    iconName: "save",
    requiresConnection: true,
    modalAction: "submit",
    onClick: () => form.requestSubmit(),
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getFormValues(form);
    const name = normalizeOptionalText(values.name);
    if (!name) {
      nameField.input.setAttribute("aria-invalid", "true");
      nameField.error.textContent = "Nama wajib diisi.";
      nameField.input.focus();
      return;
    }
    const payload =
      kind === "location"
        ? { name, description: normalizeOptionalText(values.description) }
        : { name };
    await runWithButtonBusy(saveButton, "Menyimpan…", async () => {
      try {
        if (record) {
          if (kind === "category") {
            await updateCategory(record.id, payload);
          } else if (kind === "location") {
            await updateLocation(record.id, payload);
          } else {
            await updateUnit(record.id, payload);
          }
        } else if (kind === "category") {
          await createCategory(payload);
        } else if (kind === "location") {
          await createLocation(payload);
        } else {
          await createUnit(payload);
        }
        await closeModal({ force: true });
        await referenceChanged(
          `${meta.noun[0].toUpperCase()}${meta.noun.slice(1)} disimpan`,
          context,
        );
      } catch (error) {
        showApiError(
          error,
          `${meta.noun[0].toUpperCase()}${meta.noun.slice(1)} gagal disimpan`,
        );
      }
    });
  });

  openModal({
    size: "large",
    eyebrow: meta.eyebrow,
    title: record ? `Edit ${record.name}` : `Tambah ${meta.noun}`,
    description: meta.description,
    body: form,
    footer: [cancelButton, saveButton],
    initialFocus: nameField.input,
    returnFocus: trigger,
  });
}

async function referenceChanged(title, context) {
  invalidateCatalogs();
  showToast({
    type: "success",
    title,
    message: "Daftar referensi dan backup akan diperbarui.",
  });
  await context.refresh?.();
}
