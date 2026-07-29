// Decodes a JWT's payload without verifying its signature — deliberately.
// This is only ever used to read scope_keys for UI-level decisions (show
// or hide the admin nav link, redirect away from /admin early). The real
// enforcement is apps/api's KeycloakAuthGuard verifying the signature
// against Keycloak's JWKS on every request — this never substitutes for
// that. Trusting the payload here is safe specifically because the token
// arrived directly from Keycloak's token endpoint via NextAuth's own OIDC
// exchange in the same request, not from anything user-suppliable.
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
