# Security

## Boundary

This application has no login. Its primary authorization boundary is the local
Windows account and filesystem permissions. It is not appropriate for a shared
Windows account where users must be isolated from one another.

## Local network isolation

The server accepts only the literal bind host `127.0.0.1`; the launcher supplies
that host explicitly. Host validation accepts only `127.0.0.1` and `localhost`
with the configured local port. There is no reverse proxy, tunnel, LAN
discovery, wildcard CORS, or public binding.

## Browser-to-localhost protection

Unrelated web pages can attempt requests to localhost, so every state-changing
request requires:

- an approved Host;
- an exact loopback Origin;
- `X-Inventory-App: Inventaris-Gudang/1`;
- the random HttpOnly/SameSite session cookie;
- its session-specific CSRF token;
- a unique idempotency key;
- JSON or an explicitly approved upload content type;
- a body below the configured maximum.

GET routes do not change operational state.

## Content Security Policy

Responses use:

```text
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Application-authored frontend code contains no inline event handlers, `eval`,
`new Function`, or remote executable assets. Python runtime dependencies are
never downloaded during application startup.

Apache ECharts 5.6.0 is pinned as a vendored upstream asset at
`frontend/assets/vendor/echarts/echarts.min.js`. It is loaded from the same
origin only when a dashboard or analytics chart needs it. No CDN URL is used by
the application loader. Charts render on canvas, so the CSP does not require
`style-src 'unsafe-inline'`.

## Optional online services

- Google Drive uses desktop OAuth with PKCE and the `drive.file` scope. Tokens
  are stored in a Git-ignored local credentials folder.
- Update checks contact only the configured GitHub repository. A package is
  rejected without a SHA-256 digest and a valid file manifest.
- Both services may remain unconfigured; inventory, analytics, imports, and
  local backups continue to work offline.

## Data and file handling

- SQL uses placeholders rather than string interpolation.
- Pydantic validates UUIDs, finite bounded numbers, text lengths, and enums.
- Analytics validates chart IDs, date ranges, category/location UUIDs, ranking
  sizes, aggregation modes, movement/data scopes, and export formats before SQL
  execution.
- Chart aggregation remains parameterized SQL; raw transaction history is not
  sent to the browser for client-side aggregation.
- Whitespace is normalized before persistence.
- Client paths are never accepted; uploads are staged under a controlled
  directory using generated names.
- Extension, size, workbook structure, expanded ZIP size, row count, schema
  version, and every row are validated before commit.
- Excel exports prefix formula-triggering text with an apostrophe.
- Final workbooks validate products, movement history, catalogs, relations, and
  Advanced Settings before commit.
- Frontend data is inserted with `textContent`, `createElement`, `append`, and
  `replaceChildren`.
- API errors omit tracebacks, SQL, database errors, and absolute paths.

## Logging

Logs rotate by size and count. Rotated files older than the configured Advanced
Settings retention period are removed at startup or settings update. Logs
record operational event types and sanitized identifiers, not full uploads,
large bodies, raw SQL parameters, or unnecessary operating-system details.

## Known limitations

- A user with access to the same Windows account and application folder can
  read or modify local files.
- HTTP loopback traffic is not TLS-encrypted; the security model relies on local
  loopback isolation and request tokens.
- Malware already running as the same Windows user can bypass application-level
  protections.
- Browser policy may prevent the application from closing a user-controlled tab.
