"""Import workflow request schemas."""

from app.validation.base import StrictModel


class ImportCommit(StrictModel):
    preview_token: str
    confirmation: bool
