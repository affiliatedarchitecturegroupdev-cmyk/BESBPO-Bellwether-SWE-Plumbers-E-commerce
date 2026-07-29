import * as Sentry from '@sentry/nextjs';

// Server components/route handlers/server actions run here — a plain
// (non-public) env var is fine since this never reaches the browser.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}
