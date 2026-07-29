import * as Sentry from '@sentry/node';

// A real Sentry account/DSN doesn't exist for this project yet — same
// situation as PayFast/AWS SES before real credentials were available.
// Sentry.init() is simply skipped when SENTRY_DSN isn't set, rather than
// this file assuming a DSN exists; every other piece of error-tracking
// code (the exception filter's capture calls) works the same either way,
// since Sentry.captureException() is a safe no-op when the SDK was never
// initialized.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1, // 10% of requests — enough to spot trends without the cost of tracing every request on a low-traffic platform
  });
}

export { Sentry };
