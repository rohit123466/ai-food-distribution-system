import { useState } from 'react';
import api from '../services/api';
import { apiError } from '../utils/format';

// "Show QR" button that fetches a handover code (pickup or delivery) on demand
// and displays it with the typed fallback code underneath.
export default function QrCodePanel({ endpoint, buttonLabel, hint }) {
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');

  async function toggle() {
    if (code) {
      setCode(null);
      return;
    }
    try {
      const { data } = await api.get(endpoint);
      setCode(data);
      setError('');
    } catch (err) {
      setError(apiError(err, 'Could not load the code.'));
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {code ? 'Hide code' : buttonLabel}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {code && (
        <div className="mt-3 inline-block rounded-lg border bg-white p-3 text-center">
          <img src={code.qr} alt="Handover QR code" className="mx-auto h-48 w-48" />
          <p className="mt-2 font-mono text-lg tracking-widest text-gray-800">{code.code}</p>
          {hint && <p className="mt-1 max-w-[12rem] text-xs text-gray-500">{hint}</p>}
        </div>
      )}
    </div>
  );
}
