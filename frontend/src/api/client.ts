import type { ErrorResponse, HealthResponse, ScanResponse } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  code: string;
  installHint: string | null;
  status?: number;

  constructor(code: string, message: string, installHint: string | null = null, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.installHint = installHint;
    this.status = status;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && 'ok' in value && (value as { ok: unknown }).ok === false;
}

export async function scanReceipt(file: File, signal?: AbortSignal): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: formData, signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      'network_error',
      `Could not reach the Reciptor API at ${API_BASE}. Is the backend running?`,
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || isErrorResponse(data)) {
    const err = isErrorResponse(data) ? data : null;
    throw new ApiError(
      err?.error ?? 'unknown_error',
      err?.detail ?? `Request failed with status ${response.status}.`,
      err?.install_hint ?? null,
      response.status,
    );
  }

  return data as ScanResponse;
}

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/health`, { signal });
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}
