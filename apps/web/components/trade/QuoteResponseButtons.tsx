'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { respondToQuoteAction } from '@/lib/actions/quote-actions';

interface Props {
  quoteId: string;
}

export function QuoteResponseButtons({ quoteId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function respond(response: 'ACCEPTED' | 'DECLINED') {
    setError(null);
    startTransition(async () => {
      const result = await respondToQuoteAction(quoteId, response);
      if (!result.ok) {
        setError(result.error ?? 'Could not submit your response');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          onClick={() => respond('ACCEPTED')}
          disabled={isPending}
          className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Submitting…' : 'Accept Quote'}
        </button>
        <button
          onClick={() => respond('DECLINED')}
          disabled={isPending}
          className="border border-black/15 text-steel font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}
    </div>
  );
}
