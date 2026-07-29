import * as Sentry from '@sentry/nextjs';

// Next.js's own instrumentation convention (not Sentry-specific) — this
// register() function runs once, early, before the app starts serving
// requests. Without this file, sentry.server.config.ts and
// sentry.edge.config.ts exist but nothing ever imports them.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors from server components, route handlers, and server
// actions that Next.js's own error handling would otherwise swallow
// before a plain try/catch in application code ever sees them.
export const onRequestError = Sentry.captureRequestError;
