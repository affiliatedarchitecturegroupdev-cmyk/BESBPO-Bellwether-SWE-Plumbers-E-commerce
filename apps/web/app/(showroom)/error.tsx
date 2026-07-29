'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Catches errors thrown by any (showroom) page or its data fetching —
// most commonly ApiError from lib/api-client.ts when apps/api is
// unreachable or returns a 5xx. Client component is a Next.js App Router
// requirement for error.tsx, not a style choice.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-24 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Something went wrong loading this page.</h1>
      <p className="text-steel text-sm mb-8">
        This is usually temporary. Try again, or come back in a moment.
      </p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
