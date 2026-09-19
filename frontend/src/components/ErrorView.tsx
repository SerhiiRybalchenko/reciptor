import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ApiError } from '../api/client';

interface ErrorViewProps {
  error: ApiError;
  onRetry: () => void;
}

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  const [copied, setCopied] = useState(false);
  const isMissingEngine = error.code === 'tesseract_unavailable';

  const handleCopy = async () => {
    if (!error.installHint) return;
    try {
      await navigator.clipboard.writeText(error.installHint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — hint text stays
      // visible on screen either way, so this is a silent no-op.
    }
  };

  return (
    <motion.div
      className="error-view"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className={`error-view__icon${isMissingEngine ? ' error-view__icon--muted' : ''}`}
        animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        {isMissingEngine ? <EngineIcon /> : <WarnIcon />}
      </motion.div>

      <h2>{isMissingEngine ? 'OCR engine not installed yet' : "Couldn't read that receipt"}</h2>
      <p className="error-view__detail">{error.message}</p>

      {isMissingEngine && error.installHint && (
        <div className="error-view__hint">
          <p>Install Tesseract, then try again — no server restart needed:</p>
          <div className="code-row">
            <code>{error.installHint}</code>
            <button type="button" className="btn btn--ghost btn--small" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
    </motion.div>
  );
}

function EngineIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
