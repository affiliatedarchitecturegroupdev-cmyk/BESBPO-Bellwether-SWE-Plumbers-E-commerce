'use client';

import { useState, useTransition } from 'react';
import { askQuestionAction } from '@/lib/actions/question-actions';

interface Props {
  productId: string;
  productSlug: string;
}

export function AskQuestionForm({ productId, productSlug }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const outcome = await askQuestionAction(productSlug, formData);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  if (result?.ok) {
    return <p className="text-sm text-[#1E8E5A] py-4">Thanks — your question has been posted.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-black/10 pt-6 mt-6">
      <h3 className="text-sm font-semibold mb-3">Ask a Question</h3>
      <input type="hidden" name="productId" value={productId} />
      <textarea
        name="question"
        required
        placeholder="e.g. Does this fit a 15mm pipe?"
        className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm min-h-[70px] mb-3"
      />
      {result?.error && <p className="text-[12.5px] text-red-600 mb-3">{result.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11.5px] uppercase tracking-wide bg-ink text-white px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit Question'}
      </button>
    </form>
  );
}
