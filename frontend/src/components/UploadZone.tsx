import { motion } from 'framer-motion';
import type { DragEvent, KeyboardEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED_PREFIX = 'image/';

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith(ACCEPTED_PREFIX)) {
        setRejection(`"${file.name}" isn't an image. Try a JPG, PNG, or WebP photo of a receipt.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setRejection(`"${file.name}" is too large — the 15MB limit keeps scans snappy.`);
        return;
      }
      setRejection(null);
      onFile(file);
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      validateAndEmit(event.dataTransfer.files[0]);
    },
    [disabled, validateAndEmit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  return (
    <motion.div
      className={`upload-zone${isDragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload a receipt image"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(event) => {
          validateAndEmit(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="upload-zone__corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="upload-zone__icon" aria-hidden="true">
        <ScanIcon />
      </div>
      <p className="upload-zone__title">Drop a receipt photo here</p>
      <p className="upload-zone__hint">or click to browse — JPG, PNG, WebP, up to 15MB</p>

      {rejection && (
        <motion.p
          className="upload-zone__rejection"
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {rejection}
        </motion.p>
      )}
    </motion.div>
  );
}

function ScanIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h16" strokeLinecap="round" strokeDasharray="1.5 3" />
    </svg>
  );
}
