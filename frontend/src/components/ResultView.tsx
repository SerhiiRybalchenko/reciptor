import type { Variants } from 'framer-motion';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ScanResponse } from '../api/types';

interface ResultViewProps {
  result: ScanResponse;
  previewUrl: string | null;
  onReset: () => void;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const row: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return '—';
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    } catch {
      // OCR-guessed currency code wasn't a real ISO code — fall back below.
    }
  }
  return value.toFixed(2);
}

export function ResultView({ result, previewUrl, onReset }: ResultViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const { fields, raw_text: rawText } = result;

  return (
    <motion.div
      className="result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="result__layout">
        <motion.article className="ticket" variants={container} initial="hidden" animate="show">
          <div className="ticket__edge ticket__edge--top" aria-hidden="true" />

          <motion.header className="ticket__header" variants={row}>
            <p className="ticket__eyebrow">RECIPTOR SCAN · {new Date().toLocaleDateString()}</p>
            <h2 className="ticket__merchant">{fields.merchant ?? 'Unknown merchant'}</h2>
            <p className="ticket__date">{fields.date ?? 'Date not detected'}</p>
          </motion.header>

          <motion.div className="ticket__divider" variants={row} aria-hidden="true" />

          <motion.ul className="ticket__items" variants={row}>
            {fields.items.length === 0 ? (
              <li className="ticket__empty">No line items confidently detected</li>
            ) : (
              fields.items.map((item, index) => (
                <li key={`${item.description}-${index}`}>
                  <span className="ticket__item-desc">{item.description}</span>
                  <span className="ticket__item-dots" aria-hidden="true" />
                  <span className="ticket__item-price">{formatMoney(item.price, fields.currency)}</span>
                </li>
              ))
            )}
          </motion.ul>

          <motion.div className="ticket__divider" variants={row} aria-hidden="true" />

          <motion.div className="ticket__total" variants={row}>
            <span>TOTAL</span>
            <span className="ticket__total-value">{formatMoney(fields.total, fields.currency)}</span>
          </motion.div>

          <motion.div className="ticket__barcode" variants={row} aria-hidden="true">
            {Array.from({ length: 40 }).map((_, index) => (
              <span key={index} style={{ opacity: 0.4 + (index % 5) * 0.12 }} />
            ))}
          </motion.div>

          <div className="ticket__edge ticket__edge--bottom" aria-hidden="true" />
        </motion.article>

        {previewUrl && (
          <motion.div
            className="result__source"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <p className="result__source-label">Source image</p>
            <img src={previewUrl} alt="Uploaded receipt" />
          </motion.div>
        )}
      </div>

      <div className="result__actions">
        <button type="button" className="btn btn--ghost" onClick={() => setShowRaw((value) => !value)}>
          {showRaw ? 'Hide raw OCR text' : 'View raw OCR text'}
        </button>
        <button type="button" className="btn btn--primary" onClick={onReset}>
          Scan another receipt
        </button>
      </div>

      {showRaw && (
        <motion.pre
          className="result__raw"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          {rawText.trim() || '(no text detected)'}
        </motion.pre>
      )}
    </motion.div>
  );
}
