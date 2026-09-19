"""Tesseract OCR integration.

Tesseract itself is a *system* binary (not a Python package) that
`pytesseract` shells out to. It may or may not be installed on the host
machine, and it may be installed *while this server is already running*
(e.g. via `winget install --id UB-Mannheim.TesseractOCR -e` in another
terminal). Because of that, availability is deliberately re-checked on
every request instead of once at import time, so the very first scan
after the install finishes just works without a server restart.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytesseract
from PIL import Image

# Common install locations on Windows, checked as a fallback in case the
# binary was installed after this process started and PATH hasn't been
# refreshed here yet (PATH changes from an installer don't reach an
# already-running process).
_CANDIDATE_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    str(Path.home() / "AppData" / "Local" / "Programs" / "Tesseract-OCR" / "tesseract.exe"),
]

INSTALL_HINT = "winget install --id UB-Mannheim.TesseractOCR -e"


class TesseractUnavailable(RuntimeError):
    """Raised when the Tesseract OCR binary cannot be located on this host."""


def locate_tesseract() -> str | None:
    """Look for the tesseract binary fresh on every call. Never cache the
    result at module/import time -- that would make a mid-session install
    invisible until the server restarts."""
    found = shutil.which("tesseract")
    if found:
        return found
    for candidate in _CANDIDATE_PATHS:
        if os.path.isfile(candidate):
            return candidate
    return None


def is_available() -> bool:
    return locate_tesseract() is not None


def run_ocr(image: Image.Image) -> str:
    """Run OCR on a PIL image and return the extracted text.

    Raises TesseractUnavailable (never lets pytesseract's own, noisier
    TesseractNotFoundError escape) when the binary can't be found.
    """
    path = locate_tesseract()
    if path is None:
        raise TesseractUnavailable(
            "Tesseract binary not found on PATH or in common install locations."
        )

    pytesseract.pytesseract.tesseract_cmd = path
    try:
        return pytesseract.image_to_string(image)
    except pytesseract.TesseractNotFoundError as exc:  # pragma: no cover - race guard
        # The binary vanished (or was never really runnable) between the
        # locate() check above and actually invoking it.
        raise TesseractUnavailable(str(exc)) from exc
