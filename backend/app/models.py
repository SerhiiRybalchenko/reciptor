"""Pydantic response models for the Reciptor API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str
    price: float | None = None


class ReceiptFields(BaseModel):
    merchant: str | None = None
    date: str | None = None
    total: float | None = None
    currency: str | None = None
    items: list[LineItem] = Field(default_factory=list)


class ScanResponse(BaseModel):
    ok: bool = True
    fields: ReceiptFields
    raw_text: str


class HealthResponse(BaseModel):
    ok: bool = True
    tesseract_available: bool
    tesseract_path: str | None = None
    install_hint: str | None = None


class ErrorResponse(BaseModel):
    ok: bool = False
    error: str
    detail: str
    install_hint: str | None = None
