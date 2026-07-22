"""Application settings and branding request schemas."""

from pydantic import Field

from app.validation.base import StrictModel


class SettingsUpdate(StrictModel):
    company_name: str | None = Field(default=None, max_length=150)
    owner_name: str | None = Field(default=None, max_length=150)
    daily_backup_retention_days: int | None = Field(default=None, ge=1, le=3650)
    database_backup_retention_days: int | None = Field(default=None, ge=1, le=3650)
    cloud_backup_enabled: bool | None = None
    google_drive_folder_url: str | None = Field(default=None, max_length=500)
    cloud_backup_retention_days: int | None = Field(default=None, ge=1, le=3650)
    update_auto_check: bool | None = None


class BrandingImageUpload(StrictModel):
    """Local branding image as a data URL or raw base64 payload."""

    image_data: str = Field(min_length=32, max_length=2_100_000)
    file_name: str | None = Field(default=None, max_length=180)
