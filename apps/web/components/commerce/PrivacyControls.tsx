'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { eraseMyDataAction, exportMyDataAction } from '@/lib/actions/privacy-actions';

export function PrivacyControls() {
  const [isExporting, startExport] = useTransition();
  const [isErasing, startErase] = useTransition();
  const [confirmingErase, setConfirmingErase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleExport() {
    setError(null);
    startExport(async () => {
      const result = await exportMyDataAction();
      if (!result.ok || !result.data) {
        setError(result.error ?? 'Export failed');
        return;
      }
      // The server action fetches the data; the actual file download has
      // to happen client-side — a server action can't push a file to the
      // browser directly, only return data for the client to act on.
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bellwether-swe-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleErase() {
    if (!confirmingErase) {
      setConfirmingErase(true);
      return;
    }
    setError(null);
    startErase(async () => {
      const result = await eraseMyDataAction();
      if (!result.ok) {
        setError(result.error ?? 'Request failed');
        setConfirmingErase(false);
        return;
      }
      router.push('/');
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold mb-2">Export Your Data</h2>
        <p className="text-sm text-steel mb-4">
          Download everything tied to your account — orders, bookings, warranties, certificates,
          addresses, and reviews — as a JSON file.
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60"
        >
          {isExporting ? 'Preparing…' : 'Download My Data'}
        </button>
      </div>

      <div className="border-t border-black/10 pt-8">
        <h2 className="text-base font-semibold mb-2 text-red-600">Delete Your Account</h2>
        <p className="text-sm text-steel mb-4">
          This removes your addresses, reviews, and saved cart, and anonymizes your profile. Orders,
          bookings, warranties, and certificates are kept for legal and financial record-keeping, but
          are no longer linked to identifying information. This can&apos;t be undone, and you&apos;ll be
          signed out immediately.
        </p>
        <button
          onClick={handleErase}
          disabled={isErasing}
          className={`font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm border disabled:opacity-60 ${
            confirmingErase ? 'bg-red-600 text-white border-red-600' : 'text-red-600 border-red-600'
          }`}
        >
          {isErasing ? 'Processing…' : confirmingErase ? 'Confirm deletion — this is permanent' : 'Delete My Account'}
        </button>
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
