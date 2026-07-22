# Demonstration Data and Inventory Reset

Demonstration data is optional and loads only after an explicit action under
**Pengaturan → Data contoh**. Startup no longer fills an empty database
automatically.

The dataset contains fictional agricultural categories, locations, products,
and incoming/outgoing movements for exercising the dashboard and analytics.
The final dataset does not create suppliers or batches.

Available actions:

- **Muat ulang data demonstrasi**: create a snapshot, remove existing demo
  rows, and load the dataset again;
- **Hapus data demonstrasi**: remove only rows marked as demonstration data;
- **Mulai ulang inventaris**: create a snapshot, then clear all products,
  movements, categories, and locations while preserving settings, audit logs,
  backups, and units.

Every action requires confirmation, creates a safety snapshot before changes,
clears the analytics cache, and schedules a fresh backup.
