import { useEffect, useId, useRef, useState } from 'react';
import { inputClass } from './FormField.jsx';

function QrScanner({ onScan, onError }) {
  const elementId = `qr-${useId().replace(/:/g, '')}`;
  // Refs, not effect deps: a new callback identity on re-render must not
  // restart the camera.
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    let scanner;
    let handled = false;
    // The scanner library is loaded only when someone opens the camera. start()
    // is async; cleanup must wait for it, or React StrictMode's
    // mount-unmount-mount leaves a camera stream running.
    const started = import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        scanner = new Html5Qrcode(elementId);
        return scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (text) => {
          if (handled) return;
          handled = true;
          onScanRef.current(text);
        },
        () => {},
        );
      })
      .catch(() => onErrorRef.current('Could not open the camera. Allow camera access, or type the code instead.'));

    return () => {
      started.then(() => (scanner?.isScanning ? scanner.stop() : null)).catch(() => {});
    };
  }, [elementId]);

  return <div id={elementId} className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border" />;
}

// Scan-or-type input for a handover code. Camera scanning needs a secure
// origin (https, or localhost), so typing the 8-character code is always offered.
export default function CodeEntry({ submitLabel, onSubmit }) {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(value) {
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(value.trim());
      setCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleScan(text) {
    setScanning(false);
    setCode(text);
    submit(text);
  }

  return (
    <div className="mt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="8-character code"
          maxLength={16}
          className={`${inputClass} max-w-[12rem] font-mono tracking-widest`}
        />
        <button
          type="submit"
          disabled={isSubmitting || code.trim().length < 4}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Checking...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => setScanning((s) => !s)}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          {scanning ? 'Stop camera' : 'Scan QR'}
        </button>
      </form>
      {scanning && <QrScanner onScan={handleScan} onError={setError} />}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
