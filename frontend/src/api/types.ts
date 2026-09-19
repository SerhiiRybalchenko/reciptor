export interface LineItem {
  description: string;
  price: number | null;
}

export interface ReceiptFields {
  merchant: string | null;
  date: string | null;
  total: number | null;
  currency: string | null;
  items: LineItem[];
}

export interface ScanResponse {
  ok: true;
  fields: ReceiptFields;
  raw_text: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  detail: string;
  install_hint: string | null;
}

export interface HealthResponse {
  ok: boolean;
  tesseract_available: boolean;
  tesseract_path: string | null;
  install_hint: string | null;
}
