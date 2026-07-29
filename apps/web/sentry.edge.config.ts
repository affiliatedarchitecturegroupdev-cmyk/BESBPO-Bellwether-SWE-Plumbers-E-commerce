import * as Sentry from '@sentry/nextjs';

// middleware.ts runs on Next.js's edge runtime, which needs its own
// (lighter-weight) Sentry init separate from the Node.js server config.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}
