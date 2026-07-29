import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'scopes';
export const ANY_SCOPES_KEY = 'anyScopes';

// Usage: @Scopes('products:write') above a controller method. Checked by
// ScopesGuard (common/guards/keycloak-auth.guard.ts) against the scope-key
// claims on the enriched Besbpo ID JWT — the same pattern used across the
// other Besbpo Group divisions' services.
export const Scopes = (...scopes: string[]): MethodDecorator & ClassDecorator => SetMetadata(SCOPES_KEY, scopes);

// AND semantics (Scopes, above) requires every listed scope — right for
// "this write action needs orders:manage." Read-only admin access needs
// the opposite: a caller with EITHER a dedicated read scope (e.g.
// orders:read, for a support role that should never be able to write)
// OR the existing write scope (an admin who can already write obviously
// shouldn't be locked out of viewing) should pass. @Scopes' own .every()
// check can't express "any one of these" — this is a genuinely separate
// decorator/guard check, not a variant of the same one, and existing
// @Scopes(...) usages are completely unaffected by this addition.
export const AnyScope = (...scopes: string[]): MethodDecorator & ClassDecorator => SetMetadata(ANY_SCOPES_KEY, scopes);
