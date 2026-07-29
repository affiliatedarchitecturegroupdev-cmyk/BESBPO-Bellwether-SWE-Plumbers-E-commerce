'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <h1 className="font-display text-xl font-bold mb-2">Something went wrong.</h1>
      <p className="text-sm text-steel mb-6">{error.message || 'An unexpected error occurred.'}</p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
