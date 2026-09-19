"""Heuristic field extraction from raw OCR text.

Real-world receipts vary wildly in layout, so this is intentionally a set
of pragmatic regex/heuristic rules rather than a full parser: it aims to
get merchant / date / total / line-items *right often enough to be
genuinely useful for a demo*, while always degrading gracefully (missing
fields become `null`, never an exception).
"""

from __future__ import annotations

import re

from .models import LineItem, ReceiptFields

_DATE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\b\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}\b"),  # YYYY-MM-DD
    re.compile(r"\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b"),  # DD/MM/YYYY or MM/DD/YYYY
    re.compile(r"\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2}\b"),  # DD/MM/YY
]

# A "money-shaped" token: 1.234,56 / 1,234.56 / 12.34 / 12,34 / 1234
_MONEY_RE = re.compile(r"(?<![\w.,])\d{1,3}(?:[ ,.]\d{3})*(?:[.,]\d{2})(?![\d])|(?<![\w.,])\d+[.,]\d{2}(?!\d)")

_TOTAL_LINE_RE = re.compile(r"\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|to\s*pay|total)\b", re.I)
_SUBTOTAL_RE = re.compile(r"\bsub\s*-?\s*total\b", re.I)
_NOISE_LINE_RE = re.compile(
    r"\b(vat|tax|change|cash|card|visa|mastercard|amex|approved|thank you|"
    r"receipt|invoice|tel|phone|www\.|http|cashier|register|terminal)\b",
    re.I,
)

_CURRENCY_SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "₴": "UAH", "zł": "PLN"}


def _to_float(raw: str) -> float | None:
    cleaned = raw.strip().replace(" ", "")
    if "," in cleaned and "." in cleaned:
        # Thousands + decimal both present -> comma is thousands separator.
        cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        if re.fullmatch(r"\d+,\d{2}", cleaned):
            cleaned = cleaned.replace(",", ".")  # decimal comma, e.g. 12,34
        else:
            cleaned = cleaned.replace(",", "")  # thousands comma, e.g. 1,234
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def _detect_currency(text: str) -> str | None:
    for symbol, code in _CURRENCY_SYMBOLS.items():
        if symbol in text:
            return code
    for code in ("UAH", "USD", "EUR", "GBP", "PLN"):
        if re.search(rf"\b{code}\b", text, re.I):
            return code
    return None


def _find_date(lines: list[str]) -> str | None:
    for line in lines:
        for pattern in _DATE_PATTERNS:
            match = pattern.search(line)
            if match:
                return match.group(0)
    return None


def _find_merchant(lines: list[str]) -> str | None:
    # Merchant name is almost always in the first few lines, is mostly
    # letters, and isn't an address/phone/date/noise line.
    for line in lines[:6]:
        stripped = line.strip(" *#=-\t")
        if len(stripped) < 2:
            continue
        letters = sum(char.isalpha() for char in stripped)
        digits = sum(char.isdigit() for char in stripped)
        if letters == 0 or letters < digits:
            continue
        if _NOISE_LINE_RE.search(stripped) or _DATE_PATTERNS[0].search(stripped):
            continue
        return stripped
    return None


def _amounts_in(line: str) -> list[float]:
    return [value for m in _MONEY_RE.finditer(line) if (value := _to_float(m.group(0))) is not None]


def _find_total(lines: list[str]) -> float | None:
    for line in lines:
        if _SUBTOTAL_RE.search(line):
            continue
        if _TOTAL_LINE_RE.search(line):
            amounts = _amounts_in(line)
            if amounts:
                return max(amounts)

    # Fallback: the single largest monetary amount anywhere in the receipt
    # is very often the grand total, even when the "total" label itself
    # got mangled by OCR.
    all_amounts = [value for line in lines for value in _amounts_in(line)]
    return max(all_amounts) if all_amounts else None


def _find_items(lines: list[str]) -> list[LineItem]:
    items: list[LineItem] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if _NOISE_LINE_RE.search(stripped) or _TOTAL_LINE_RE.search(stripped) or _SUBTOTAL_RE.search(stripped):
            continue

        matches = list(_MONEY_RE.finditer(stripped))
        if not matches:
            continue

        last_match = matches[-1]
        description = stripped[: last_match.start()].strip(" .:-\t x*")
        letters = sum(char.isalpha() for char in description)
        if len(description) < 2 or letters < 2:
            continue

        items.append(LineItem(description=description, price=_to_float(last_match.group(0))))

    return items[:25]


def parse_receipt(raw_text: str) -> ReceiptFields:
    lines = [line for line in (raw_text or "").splitlines() if line.strip()]
    return ReceiptFields(
        merchant=_find_merchant(lines),
        date=_find_date(lines),
        total=_find_total(lines),
        currency=_detect_currency(raw_text or ""),
        items=_find_items(lines),
    )
