'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBookingAction,
  requestEstimateAction,
  EstimateResult,
} from '@/lib/actions/booking-actions';

export function BookingRequestForm() {
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [isEstimating, startEstimating] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleGetEstimate() {
    if (description.trim().length < 10) {
      setError('Describe the issue in a bit more detail to get an estimate.');
      return;
    }
    setError(null);
    startEstimating(async () => {
      const result = await requestEstimateAction(description);
      setEstimate(result);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startSubmitting(async () => {
      const result = await createBookingAction(estimate, formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not submit booking request');
        return;
      }
      router.push(`/account/bookings/${result.bookingId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Describe the issue
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. There's a leaking pipe under my kitchen sink and water is pooling on the floor"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[90px]"
        />
      </div>
      <button
        type="button"
        onClick={handleGetEstimate}
        disabled={isEstimating}
        className="font-mono text-[11.5px] text-hydra mb-5 disabled:opacity-60"
      >
        {isEstimating ? 'Estimating…' : 'Get an instant estimate'}
      </button>

      {estimate && (
        <div className="border border-black/10 rounded-sm p-4 mb-6 bg-[#F9FAFA]">
          {estimate.confidence === 'unavailable' ? (
            <p className="text-[13px] text-steel">{estimate.note}</p>
          ) : (
            <>
              <p className="text-[13px] mb-1">
                <span className="font-semibold">{estimate.matchedSector}</span> — {estimate.matchedServiceCode}
              </p>
              <p className="text-[12px] text-steel">{estimate.note}</p>
            </>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Site Address
        </label>
        <input
          name="siteAddress"
          required
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Additional Notes (optional)
        </label>
        <textarea name="notes" className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[70px]" />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-ink text-white font-mono text-[12.5px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting…' : 'Request Booking'}
      </button>
    </form>
  );
}
