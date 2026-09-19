# Reciptor

Розпізнавання паперових чеків через OCR — drop a photo of a paper receipt,
get back structured data (merchant, date, total, line items) extracted with
Tesseract OCR.

A portfolio demo piece: a real FastAPI + Tesseract backend behind a
React/Vite/TypeScript frontend with a dark "thermal-printer terminal" visual
identity — scanning-laser processing animation, a receipt ticket that prints
itself in on success, and a friendly (not a stack trace) error state when the
OCR engine isn't installed.

## Stack

**Backend** — Python 3.12, FastAPI, [pytesseract](https://pypi.org/project/pytesseract/)
(shells out to the system Tesseract-OCR binary), Pillow, Uvicorn.
**Frontend** — React 19, TypeScript, Vite 8, Framer Motion.

## How it works

1. The frontend posts an uploaded image to `POST /api/scan` as multipart form data.
2. The backend decodes it with Pillow, converts to grayscale, and runs it through
   `pytesseract.image_to_string` (which invokes the local `tesseract` binary).
3. The raw OCR text is parsed with a set of regex/heuristics
   (`backend/app/parser.py`) into merchant name, date, total, currency and
   line items — every field degrades to `null` instead of throwing if it
   can't be confidently found.
4. `GET /api/health` reports whether the Tesseract binary is currently
   reachable, so the frontend can show an honest "OCR engine ready / not
   installed" badge instead of assuming.

Tesseract availability is checked **fresh on every request** (`backend/app/ocr.py`),
not once at import time — so if you install it while the server is already
running, the very next scan just works with no restart required.

## Running locally

### Backend (FastAPI)

Tesseract-OCR is a system binary, not a Python package — install it first:

```powershell
winget install --id UB-Mannheim.TesseractOCR -e
```

Then:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

- API root: `http://127.0.0.1:8000/`
- Interactive docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

If Tesseract isn't installed (or not yet on `PATH`), `/api/scan` responds
with a `503` and a clean JSON body — `{"ok": false, "error":
"tesseract_unavailable", "detail": "...", "install_hint": "winget install
--id UB-Mannheim.TesseractOCR -e"}` — never a raw 500 or stack trace.

### Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` by default and talks to the backend at
`http://127.0.0.1:8000` (override with `VITE_API_BASE_URL`, see
`.env.example`).

### Production build check

```powershell
cd frontend
npm run build   # tsc -b && vite build — zero type errors
```

## Local-environment substitutions / caveats

- **Tesseract binary path detection.** On this machine Tesseract was being
  installed via `winget` while this project was scaffolded. The backend
  doesn't assume it's on `PATH`: `backend/app/ocr.py` also checks the
  standard Windows install locations (`C:\Program Files\Tesseract-OCR\`,
  etc.) as a fallback, and re-checks on every request rather than caching
  the result at startup. No other substitution was needed — OCR really runs
  through the real Tesseract engine, not a mock.
- **No database.** Receipts are processed statelessly, one request in, one
  JSON response out — nothing is persisted, so there's no database (real or
  embedded) to note here.
- **CORS is wide open** (`allow_origins=["*"]`) in `backend/app/main.py`,
  since this is a local demo pairing a separately-served frontend origin.
  Tighten this before deploying anywhere real.
- **OCR/parsing accuracy is heuristic**, as with any receipt OCR pipeline:
  results depend on photo quality/lighting, and the regex-based field
  extraction (`backend/app/parser.py`) is tuned for common receipt layouts
  rather than guaranteed against every format. The raw OCR text is always
  shown in the UI ("View raw OCR text") so results are verifiable.

## Project layout

```
reciptor/
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI app, routes, error handling
│   │   ├── ocr.py         # Tesseract binary detection + invocation
│   │   ├── parser.py      # Regex/heuristic field extraction
│   │   └── models.py      # Pydantic response schemas
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/            # fetch client + types
        ├── components/     # UploadZone, ProcessingView, ResultView, ErrorView, ...
        ├── hooks/          # useReceiptScan, useEngineStatus
        └── App.tsx
```
