const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bellwether-swe-catalog.s3.af-south-1.amazonaws.com',
      },
    ],
  },
  // Required on Next.js 14.x for instrumentation.ts to be picked up at
  // all — it's what wires sentry.server.config.ts/sentry.edge.config.ts
  // in (see instrumentation.ts). This flag became stable and default-on
  // in Next.js 15; explicit here since this project is still on 14.x and
  // the file would otherwise silently never run.
  experimental: {
    instrumentationHook: true,
  },
};

// withSentryConfig wraps the build to upload source maps and inject
// instrumentation — safe to apply even with no DSN configured (see
// sentry.server.config.ts and sentry.client.config.ts): those check for
// SENTRY_DSN themselves and simply don't call Sentry.init() if it's
// unset, same as apps/api's src/instrument.ts.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
