# Manual Verification Checklist 1.0.0

## Startup and data

- [ ] Double-click `Inventaris Gudang.bat`; the browser opens 127.0.0.1.
- [ ] Health reports application version `1.0.0` and database schema `5`.
- [ ] Create a product, an incoming transaction, and an outgoing transaction.
- [ ] Stock totals and before/after history are correct.
- [ ] No supplier/batch menu, API, workbook, or analytics option is available.

## Dashboard and analytics

- [ ] The desktop dashboard fits one page without normal vertical scrolling.
- [ ] The featured chart fills its panel and resizes without empty space.
- [ ] The Incoming/Outgoing Trend loads daily, weekly, and monthly views.
- [ ] The calendar and recent movements fill their column height.
- [ ] All 13 charts handle data, empty, and error states correctly.

## Settings and reset

- [ ] All five Settings groups open without a JavaScript error.
- [ ] **Mulai ulang inventaris** asks for confirmation, creates a snapshot, and
      clears products, movements, categories, and locations.
- [ ] After refresh and restart, the data remains empty and demo data does not
      return automatically.

## Local backup

- [ ] Create an Excel backup; current and daily files appear in the list.
- [ ] Excel file verification and download both succeed.
- [ ] Create a SQLite snapshot; verification and download both succeed.
- [ ] Restore a snapshot; a new safety snapshot is created first.

## Google Drive and updates

- [ ] A valid Desktop OAuth Client ID can be saved from Settings.
- [ ] Google login completes in a popup and Settings refreshes automatically.
- [ ] Unconfigured Google login shows a clear status without breaking local mode.
- [ ] While offline, local backup succeeds and the cloud queue grows.
- [ ] After reconnecting, queued files upload to the selected/created folder.
- [ ] A release with a missing or incorrect digest/asset is rejected.
- [ ] A public repository without a Release shows “no GitHub Release yet.”
- [ ] A valid release installs and user data remains after restart.
