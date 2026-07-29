'use client';

import { useState, useTransition } from 'react';
import { createReviewAction } from '@/lib/actions/review-actions';

interface Props {
  productId: string;
  productSlug: string;
}

export function WriteReviewForm({ productId, productSlug }: Props) {
  const [rating, setRating] = useState(5);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('rating', String(rating));

    startTransition(async () => {
      const outcome = await createReviewAction(productSlug, formData);
      setResult(outcome);
      if (outcome.ok) (e.target as HTMLFormElement).reset();
    });
  }

  if (result?.ok) {
    return <p className="text-sm text-[#1E8E5A] py-4">Thanks — your review has been posted.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-black/10 pt-6 mt-6">
      <h3 className="text-sm font-semibold mb-3">Write a Review</h3>
      <input type="hidden" name="productId" value={productId} />

      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-xl ${star <= rating ? 'text-[#E8B923]' : 'text-black/15'}`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      <input
        name="title"
        placeholder="Title (optional)"
        className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm mb-3"
      />
      <textarea
        name="body"
        required
        placeholder="Share your experience with this product"
        className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[90px] mb-3"
      />

      {result?.error && <p className="text-[12.5px] text-red-600 mb-3">{result.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11.5px] uppercase tracking-wide bg-ink text-white px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
