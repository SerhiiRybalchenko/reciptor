import { motion } from 'framer-motion';
import type { EngineStatus } from '../hooks/useEngineStatus';

const STACK = ['Python', 'FastAPI', 'Tesseract OCR', 'React', 'TypeScript', 'Vite'];

const STATUS_COPY: Record<EngineStatus, string> = {
  checking: 'Checking OCR engine…',
  ready: 'OCR engine ready',
  unavailable: 'OCR engine not installed',
  unreachable: 'Backend unreachable',
};

interface HeaderProps {
  engineStatus: EngineStatus;
}

export function Header({ engineStatus }: HeaderProps) {
  return (
    <motion.header
      className="site-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="site-header__row">
        <div className="site-header__brand">
          <span className="site-header__mark" aria-hidden="true">
            <MarkIcon />
          </span>
          <div>
            <p className="site-header__name">Reciptor</p>
            <p className="site-header__tagline">Paper receipts → structured data, via OCR</p>
          </div>
        </div>

        <div className={`engine-pill engine-pill--${engineStatus}`}>
          <span className="engine-pill__dot" aria-hidden="true" />
          {STATUS_COPY[engineStatus]}
        </div>
      </div>

      <ul className="stack-badges" aria-label="Technology stack">
        {STACK.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
    </motion.header>
  );
}

function MarkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 2h9l3 3v17H6z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  );
}
