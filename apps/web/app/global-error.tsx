'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Must render its own <html>/<body> — this replaces the ENTIRE root
// layout when it fires, since the root layout is what failed. Every
// other error.tsx in this app (e.g. app/admin/error.tsx) can assume
// layout.tsx rendered fine and just replace the page content; this one
// can't make that assumption.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong.</h1>
          <p>Please try refreshing the page.</p>
        </div>
      </body>
    </html>
  );
}
