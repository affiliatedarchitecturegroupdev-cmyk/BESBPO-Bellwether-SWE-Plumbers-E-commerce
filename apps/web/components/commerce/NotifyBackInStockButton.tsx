'use client';

import { useState, useTransition } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';

export function NotifyBackInStockButton({ productId }: { productId: string }) {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Public endpoint, called directly client-side — no session/token
  // involved, same reasoning as ProductCombobox/NewsletterBanner calling
  // apiClient directly rather than going through a server action.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await apiClient.post<{ alreadyRequested: boolean }>('/v1/back-in-stock', {
          productId,
          email,
        });
        setMessage({
          text: result.alreadyRequested
            ? "You're already on the list for this one."
            : "Got it — we'll email you when it's back.",
          isError: false,
        });
        setEmail('');
      } catch (err) {
        setMessage({ text: err instanceof ApiError ? err.message : 'Could not save that', isError: true });
      }
    });
  }

  return (
    <div className="mt-5 max-w-[280px]">
      <p className="text-[12.5px] text-steel mb-2">Out of stock — want to know when it&apos;s back?</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="flex-1 border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-3 py-1.5 rounded-sm disabled:opacity-60 whitespace-nowrap"
        >
          {isPending ? '…' : 'Notify Me'}
        </button>
      </form>
      {message && (
        <p className={`text-[12px] mt-2 ${message.isError ? 'text-red-600' : 'text-hydra'}`}>{message.text}</p>
      )}
    </div>
  );
}
