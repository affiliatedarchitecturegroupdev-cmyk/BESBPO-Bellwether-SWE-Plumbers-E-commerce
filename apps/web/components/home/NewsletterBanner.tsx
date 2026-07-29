'use client';

import { useState, useTransition } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';

// A separate component from the footer's NewsletterSignup rather than a
// shared one with style props — the footer version is compact and
// styled for a dark background; this one is a full-width, light-
// background section matching the rest of the homepage. Both call the
// same real /v1/newsletter/subscribe endpoint.
export function NewsletterBanner() {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await apiClient.post<{ alreadySubscribed: boolean }>('/v1/newsletter/subscribe', { email });
        setMessage({
          text: result.alreadySubscribed ? "You're already on the list." : "Thanks — you're subscribed.",
          isError: false,
        });
        setEmail('');
      } catch (err) {
        setMessage({ text: err instanceof ApiError ? err.message : 'Could not subscribe', isError: true });
      }
    });
  }

  return (
    <section className="bg-porcelain">
      <div className="max-w-[1240px] mx-auto px-8 py-16 text-center">
        <h2 className="text-2xl font-display font-bold mb-2">Stay in the Loop</h2>
        <p className="text-sm text-steel mb-7">
          New products, trade offers, and restocks — straight to your inbox, occasionally.
        </p>
        <form onSubmit={handleSubmit} className="flex justify-center gap-2 max-w-[420px] mx-auto">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="you@example.com"
            className="flex-1 border border-black/15 rounded-sm px-3.5 py-2.5 text-sm bg-white"
          />
          <button
            type="submit"
            disabled={isPending}
            className="font-mono text-[12px] uppercase tracking-wide bg-hydra text-white px-5 py-2.5 rounded-sm disabled:opacity-60"
          >
            {isPending ? '…' : 'Subscribe'}
          </button>
        </form>
        {message && (
          <p className={`text-[12.5px] mt-3 ${message.isError ? 'text-red-600' : 'text-hydra'}`}>{message.text}</p>
        )}
      </div>
    </section>
  );
}
