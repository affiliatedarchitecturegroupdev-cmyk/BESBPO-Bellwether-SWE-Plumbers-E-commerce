'use client';

import { useState, useTransition } from 'react';
import { answerQuestionAction } from '@/lib/actions/question-actions';

interface Props {
  productSlug: string;
  questionId: string;
}

export function AnswerQuestionForm({ productSlug, questionId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await answerQuestionAction(productSlug, questionId, formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not submit your answer');
        return;
      }
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="font-mono text-[11px] text-hydra mt-1">
        Answer this
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        name="answer"
        required
        placeholder="Share what you know"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm min-h-[60px] mb-2"
      />
      {error && <p className="text-[12px] text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
        >
          {isPending ? 'Submitting…' : 'Submit'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="font-mono text-[11px] text-steel px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
