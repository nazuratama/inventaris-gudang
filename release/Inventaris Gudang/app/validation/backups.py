"""Backup-file action request schemas."""

from app.validation.base import StrictModel


class BackupConfirmation(StrictModel):
    confirmation: bool
