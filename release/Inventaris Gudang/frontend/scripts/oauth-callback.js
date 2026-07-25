const status = document.body?.dataset.oauthStatus || "error";
const payload = {
  type: "inventory:google-drive-oauth",
  ok: status === "success",
};

if (window.opener && !window.opener.closed) {
  // Login complete. Tiny victory dance.
  window.opener.postMessage(payload, "*");
  window.setTimeout(() => window.close(), 450);
}
