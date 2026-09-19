import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAGES = [
  'Reading pixels…',
  'Detecting text blocks…',
  'Running Tesseract OCR…',
  'Parsing merchant & totals…',
];

interface ProcessingViewProps {
  previewUrl: string;
  fileName: string;
}

export function ProcessingView({ previewUrl, fileName }: ProcessingViewProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStageIndex((index) => (index + 1) % STAGES.length);
    }, 1300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      className="processing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
    >
      <div className="processing__frame">
        <img src={previewUrl} alt={fileName} className="processing__image" />
        <div className="processing__grid" aria-hidden="true" />
        <div className="processing__laser" aria-hidden="true" />
        <div className="processing__vignette" aria-hidden="true" />
      </div>

      <div className="processing__status">
        <span className="processing__dot" aria-hidden="true" />
        <AnimatePresence mode="wait">
          <motion.span
            key={stageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {STAGES[stageIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="processing__progress" aria-hidden="true">
        <motion.div
          className="processing__progress-bar"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 5.2, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
