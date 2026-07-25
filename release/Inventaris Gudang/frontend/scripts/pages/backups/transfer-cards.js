import { badge, button, element, icon } from "../../utils/dom.js";
import { formatFileSize } from "../../utils/formatting.js";
import { handleSelectedFile, MAX_IMPORT_SIZE } from "./import-flow.js";

export function createImportCard(fileInput, context) {
  const dropZone = element("div", {
    className: ["card", "transfer-card", "drop-zone"],
    attributes: { role: "group", "aria-label": "Impor data" },
  });
  const chooseButton = button("Pilih file impor", {
    variant: "button-primary",
    iconName: "upload",
    requiresConnection: true,
    onClick: (event) => {
      fileInput._triggerButton = event.currentTarget;
      fileInput.click();
    },
  });
  dropZone.append(
    element("div", {
      className: "transfer-card-body drop-zone-content",
      children: [
        element("div", {
          className: "transfer-card-top",
          children: [
            element("span", {
              className: "summary-icon summary-icon-success",
              children: [icon("upload")],
            }),
            badge("Impor", "success"),
          ],
        }),
        element("h3", { text: "Impor data tervalidasi" }),
        element("p", {
          className: "muted",
          text: "Excel aplikasi, CSV yang didukung, atau ekspor JSON lama. File diperiksa sebelum perubahan disimpan.",
        }),
        chooseButton,
        element("small", {
          className: "subtle",
          text: `Maksimal ${formatFileSize(MAX_IMPORT_SIZE)} · tarik & lepas juga didukung`,
        }),
        element("a", {
          className: ["button", "button-quiet", "button-compact"],
          attributes: {
            href: "/legacy-export.html",
            target: "_blank",
            rel: "noopener",
          },
          text: "Alat ekspor data lama",
        }),
      ],
    }),
  );
  installDropHandling(dropZone, async (file) => {
    await handleSelectedFile(file, "IMPORT", context, dropZone);
  });
  return dropZone;
}

export function createRestoreCard(fileInput) {
  return element("section", {
    className: ["card", "transfer-card", "transfer-card-warning"],
    children: [
      element("div", {
        className: "transfer-card-body",
        children: [
          element("div", {
            className: "transfer-card-top",
            children: [
              element("span", {
                className: "summary-icon summary-icon-warning",
                children: [icon("restore")],
              }),
              badge("Sensitif", "warning"),
            ],
          }),
          element("h3", { text: "Pulihkan backup aplikasi" }),
          element("p", {
            className: "muted",
            text: "Hanya workbook Excel backup resmi. Snapshot keselamatan dibuat otomatis sebelum pemulihan.",
          }),
          element("div", {
            className: "transfer-points",
            children: [
              element("div", {
                className: "transfer-point",
                children: [
                  icon("shield"),
                  element("span", { text: "Validasi penuh sebelum apply" }),
                ],
              }),
              element("div", {
                className: "transfer-point",
                children: [
                  icon("check-circle"),
                  element("span", { text: "Preview + cek integritas sesudah restore" }),
                ],
              }),
            ],
          }),
          button("Pilih backup untuk dipulihkan", {
            iconName: "restore",
            requiresConnection: true,
            onClick: (event) => {
              fileInput._triggerButton = event.currentTarget;
              fileInput.click();
            },
          }),
        ],
      }),
    ],
  });
}

export function createFileInput(accept, handler) {
  const input = element("input", {
    className: "file-input",
    attributes: {
      type: "file",
      accept,
      tabindex: "-1",
      "aria-hidden": "true",
    },
  });
  input.addEventListener("change", async () => {
    const [file] = input.files || [];
    if (file) {
      await handler(file, input._triggerButton);
    }
    input.value = "";
  });
  return input;
}

function installDropHandling(dropZone, onFile) {
  for (const eventName of ["dragenter", "dragover"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  }
  dropZone.addEventListener("drop", async (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      await onFile(file);
    }
  });
}
