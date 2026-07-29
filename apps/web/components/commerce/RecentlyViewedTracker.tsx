'use client';

import { useEffect } from 'react';
import { recordProductView } from '@/lib/recently-viewed';

// Renders nothing — the product page itself is a server component and
// can't touch localStorage directly, so this tiny client component's
// only job is the side effect of recording the view on mount.
export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordProductView(slug);
  }, [slug]);

  return null;
}
