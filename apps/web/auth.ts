import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { decodeJwtPayload } from './lib/decode-jwt';

// Same Keycloak realm apps/api validates JWTs against (KEYCLOAK_ISSUER_URL
// there, AUTH_KEYCLOAK_ISSUER here) — one identity provider, two clients.
// This is intentionally the only place OIDC config lives; don't duplicate
// provider setup in individual routes.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    // Carry the raw access token through to the session so server
    // components/route handlers can attach it to apiClient calls
    // (see lib/api-client.ts's `accessToken` option) — without this, every
    // authenticated fetch to apps/api would need its own token plumbing.
    // Also decode scope_keys from it — see lib/decode-jwt.ts for why
    // decoding without verification is fine here specifically.
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        const payload = decodeJwtPayload<{ scope_keys?: string[] }>(account.access_token);
        token.scopes = payload?.scope_keys ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
        session.scopes = token.scopes ?? [];
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
});
