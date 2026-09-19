import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, scanReceipt } from '../api/client';
import type { ScanResponse } from '../api/types';

export type ScanStatus = 'idle' | 'processing' | 'success' | 'error';

interface ScanState {
  status: ScanStatus;
  previewUrl: string | null;
  fileName: string | null;
  result: ScanResponse | null;
  error: ApiError | null;
}

const initialState: ScanState = {
  status: 'idle',
  previewUrl: null,
  fileName: null,
  result: null,
  error: null,
};

export function useReceiptScan() {
  const [state, setState] = useState<ScanState>(initialState);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const scan = useCallback(async (file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;

    setState({ status: 'processing', previewUrl, fileName: file.name, result: null, error: null });

    try {
      const result = await scanReceipt(file);
      setState((prev) => ({ ...prev, status: 'success', result }));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      const error =
        cause instanceof ApiError
          ? cause
          : new ApiError('unknown_error', 'Something unexpected went wrong while scanning.');
      setState((prev) => ({ ...prev, status: 'error', error }));
    }
  }, []);

  const reset = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setState(initialState);
  }, []);

  return { ...state, scan, reset };
}
