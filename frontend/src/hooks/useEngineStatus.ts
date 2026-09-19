import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client';

export type EngineStatus = 'checking' | 'ready' | 'unavailable' | 'unreachable';

/** Polls the backend health endpoint once on mount so the header can show a
 * live, honest badge instead of assuming the OCR engine is installed. */
export function useEngineStatus(): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    checkHealth(controller.signal).then((health) => {
      if (controller.signal.aborted) return;
      if (!health) {
        setStatus('unreachable');
      } else {
        setStatus(health.tesseract_available ? 'ready' : 'unavailable');
      }
    });

    return () => controller.abort();
  }, []);

  return status;
}
