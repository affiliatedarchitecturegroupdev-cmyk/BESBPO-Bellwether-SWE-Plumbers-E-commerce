'use client';

import { useState, useTransition } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';

// Public endpoint, called directly client-side — no server action needed
// since there's no session/token involved at all, same reasoning as
// ProductCombobox calling apiClient directly for its own public search.
export function NewsletterSignup() {
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
    <div>
      <h5 className="font-mono text-[11px] tracking-wide uppercase text-steel mb-4">Stay Updated</h5>
      <p className="text-[13px] text-porcelain-dim mb-3 max-w-[240px]">
        New products and trade offers, occasionally.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="flex-1 bg-white/5 border border-white/15 rounded-sm px-2.5 py-1.5 text-[13px] text-porcelain placeholder:text-steel"
        />
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide bg-cyan text-ink px-3 py-1.5 rounded-sm disabled:opacity-60"
        >
          {isPending ? '…' : 'Join'}
        </button>
      </form>
      {message && (
        <p className={`text-[12px] mt-2 ${message.isError ? 'text-red-400' : 'text-cyan'}`}>{message.text}</p>
      )}
    </div>
  );
}
