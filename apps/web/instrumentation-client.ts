import * as Sentry from '@sentry/nextjs';

// NEXT_PUBLIC_ prefix required — this file runs in the browser, and only
// env vars with that prefix are ever exposed there by Next.js. No DSN
// configured yet (see apps/api/src/instrument.ts for the same situation
// on the API side) — Sentry.init() is simply skipped until one exists.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // NODE_ENV specifically, not SENTRY_ENVIRONMENT — Next.js automatically
    // inlines NODE_ENV into client bundles at build time as a special case;
    // any other env var (including SENTRY_ENVIRONMENT, used server-side in
    // sentry.server.config.ts/sentry.edge.config.ts) would need an explicit
    // NEXT_PUBLIC_ prefix to ever reach the browser, which wasn't worth the
    // extra plumbing just for a client-side environment tag.
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Instruments App Router client-side navigations — required export for
// this specifically, not optional boilerplate.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
