import { AnimatePresence, motion } from 'framer-motion';
import { BackgroundFX } from './components/BackgroundFX';
import { ErrorView } from './components/ErrorView';
import { Header } from './components/Header';
import { ProcessingView } from './components/ProcessingView';
import { ResultView } from './components/ResultView';
import { UploadZone } from './components/UploadZone';
import { useEngineStatus } from './hooks/useEngineStatus';
import { useReceiptScan } from './hooks/useReceiptScan';

function App() {
  const engineStatus = useEngineStatus();
  const { status, previewUrl, fileName, result, error, scan, reset } = useReceiptScan();

  return (
    <div className="app">
      <BackgroundFX />
      <Header engineStatus={engineStatus} />

      <main className="app__main">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" className="stage">
              <UploadZone onFile={scan} />
            </motion.div>
          )}

          {status === 'processing' && previewUrl && (
            <motion.div key="processing" className="stage">
              <ProcessingView previewUrl={previewUrl} fileName={fileName ?? 'receipt'} />
            </motion.div>
          )}

          {status === 'success' && result && (
            <motion.div key="success" className="stage stage--wide">
              <ResultView result={result} previewUrl={previewUrl} onReset={reset} />
            </motion.div>
          )}

          {status === 'error' && error && (
            <motion.div key="error" className="stage">
              <ErrorView error={error} onRetry={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="app__footer">
        <p>
          Built with FastAPI + Tesseract OCR on the backend, React + Vite + TypeScript on the front.
          Part of a vibe-coding portfolio.
        </p>
      </footer>
    </div>
  );
}

export default App;
