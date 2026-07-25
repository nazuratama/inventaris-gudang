/** Apply local branding (owner name/photo, warehouse logo) across the shell. */

const DEFAULT_OWNER = "Kanjeng Alfian Diningrat";
const DEFAULT_COMPANY = "ALFAN TANI";

/** First letter of the owner name (e.g. "Kanjeng …" → "K", "Wildan …" → "W"). */
export function ownerInitials(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return "K";
  }
  const first = trimmed[0];
  return /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(first) ? first.toUpperCase() : "K";
}

function setImage(node, url) {
  if (!(node instanceof HTMLImageElement)) {
    return;
  }
  if (url) {
    node.src = url;
    node.hidden = false;
  } else {
    node.removeAttribute("src");
    node.hidden = true;
  }
}

export function applyBranding(branding = {}) {
  const ownerName = String(branding.owner_name || DEFAULT_OWNER).trim() || DEFAULT_OWNER;
  const companyName =
    String(branding.company_name || DEFAULT_COMPANY).trim() || DEFAULT_COMPANY;
  const initials = ownerInitials(ownerName);
  const ownerPhoto = branding.owner_photo_url || null;
  const warehouseLogo = branding.warehouse_logo_url || null;

  const companyNode = document.getElementById("companyName");
  if (companyNode) {
    companyNode.textContent = companyName;
  }

  for (const id of ["ownerDisplayName", "ownerMenuName"]) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = ownerName;
    }
  }

  for (const id of ["ownerDisplayMeta", "ownerMenuMeta"]) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = `Pemilik · ${companyName}`;
    }
  }

  for (const id of ["ownerAvatarInitials", "ownerMenuAvatarInitials"]) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = initials;
      node.hidden = Boolean(ownerPhoto);
    }
  }

  setImage(document.getElementById("ownerPhotoImage"), ownerPhoto);
  setImage(document.getElementById("ownerMenuPhotoImage"), ownerPhoto);

  const brandMark = document.getElementById("brandMark");
  const brandFallback = document.getElementById("brandMarkFallback");
  setImage(document.getElementById("warehouseLogoImage"), warehouseLogo);
  if (brandMark) {
    brandMark.classList.toggle("has-image", Boolean(warehouseLogo));
  }
  if (brandFallback) {
    brandFallback.hidden = Boolean(warehouseLogo);
  }

  for (const id of ["ownerAvatar", "ownerMenuAvatar"]) {
    const node = document.getElementById(id);
    if (node) {
      node.classList.toggle("has-image", Boolean(ownerPhoto));
    }
  }

  return {
    owner_name: ownerName,
    company_name: companyName,
    owner_photo_url: ownerPhoto,
    warehouse_logo_url: warehouseLogo,
  };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error("File tidak valid."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}
