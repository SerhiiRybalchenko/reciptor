"""Reciptor API - OCR receipt scanning backend.

FastAPI app exposing:
  GET  /api/health  -> whether the Tesseract binary is currently reachable
  POST /api/scan     -> upload a receipt image, get back parsed fields

Every failure path returns a well-formed JSON body (see models.ErrorResponse)
with an appropriate HTTP status code -- never a raw 500 / stack trace, even
for exceptions nobody anticipated (see the catch-all handler at the bottom).
"""

from __future__ import annotations

import io
import logging

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from . import ocr
from .models import ErrorResponse, HealthResponse, ScanResponse
from .parser import parse_receipt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reciptor")

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

app = FastAPI(
    title="Reciptor API",
    description="Uploads a receipt photo, runs it through Tesseract OCR, and "
    "extracts merchant / date / total / line items.",
    version="1.0.0",
)

# Demo project served from a separate Vite dev origin -> permissive CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, error: str, detail: str, install_hint: str | None = None) -> JSONResponse:
    body = ErrorResponse(error=error, detail=detail, install_hint=install_hint)
    return JSONResponse(status_code=status_code, content=body.model_dump())


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Last-resort safety net: whatever goes wrong, the client still gets
    clean JSON instead of a stack trace."""
    logger.exception("Unhandled error while processing request")
    return _error(500, "internal_error", f"Unexpected server error: {exc.__class__.__name__}")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    path = ocr.locate_tesseract()
    return HealthResponse(
        tesseract_available=path is not None,
        tesseract_path=path,
        install_hint=None if path else ocr.INSTALL_HINT,
    )


@app.post(
    "/api/scan",
    response_model=ScanResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Invalid upload"},
        503: {"model": ErrorResponse, "description": "OCR engine unavailable"},
    },
)
async def scan_receipt(file: UploadFile = File(...)) -> JSONResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        return _error(
            422,
            "invalid_file_type",
            f"Expected an image upload, got content-type '{file.content_type or 'unknown'}'.",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        return _error(422, "empty_file", "The uploaded file is empty.")
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        return _error(
            422,
            "file_too_large",
            f"Image exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit.",
        )

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()
    except UnidentifiedImageError:
        return _error(422, "unreadable_image", "The uploaded file could not be decoded as an image.")

    # Grayscale tends to give Tesseract a slightly cleaner signal on photos
    # of glossy/crumpled receipts than raw RGB.
    image = image.convert("L")

    try:
        raw_text = ocr.run_ocr(image)
    except ocr.TesseractUnavailable:
        return _error(
            503,
            "tesseract_unavailable",
            "The Tesseract OCR engine is not installed (or not yet on PATH) on this machine.",
            install_hint=ocr.INSTALL_HINT,
        )

    fields = parse_receipt(raw_text)
    return JSONResponse(status_code=200, content=ScanResponse(fields=fields, raw_text=raw_text).model_dump())


@app.get("/")
def root() -> dict:
    return {"service": "reciptor-api", "docs": "/docs", "health": "/api/health"}
