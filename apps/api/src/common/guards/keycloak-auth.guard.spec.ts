import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KeycloakAuthGuard } from './keycloak-auth.guard';

// super.canActivate() (Passport's own JWT verification) is a separate,
// well-established concern from this guard's OWN scope-checking logic —
// mocked out here (always "already authenticated") so these tests
// exercise only the scope logic this file actually owns, not Passport's
// JWT verification itself.
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate = jest.fn().mockResolvedValue(true);
    },
}));

describe('KeycloakAuthGuard', () => {
  async function check(scopes: string[], metadata: Record<string, string[] | undefined>): Promise<boolean> {
    const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
    const guard = new KeycloakAuthGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { scopes } }) }),
    } as unknown as ExecutionContext;
    return guard.canActivate(context);
  }

  it('allows a route with neither @Scopes nor @AnyScope for any authenticated caller', async () => {
    expect(await check([], { scopes: undefined, anyScopes: undefined })).toBe(true);
  });

  describe('@Scopes (unchanged AND semantics)', () => {
    it('allows a caller with every required scope', async () => {
      expect(await check(['orders:manage', 'products:write'], { scopes: ['orders:manage'] })).toBe(true);
    });

    it('rejects a caller missing even one required scope', async () => {
      expect(await check(['products:write'], { scopes: ['orders:manage', 'products:write'] })).toBe(false);
    });

    it('rejects a caller with zero scopes at all', async () => {
      expect(await check([], { scopes: ['orders:manage'] })).toBe(false);
    });
  });

  describe('@AnyScope (new OR semantics)', () => {
    it('allows a caller with only the dedicated read scope, not the write scope', async () => {
      expect(await check(['orders:read'], { anyScopes: ['orders:read', 'orders:manage'] })).toBe(true);
    });

    it('allows a caller with only the write scope, not the read scope — a write-capable admin is never locked out of read access', async () => {
      expect(await check(['orders:manage'], { anyScopes: ['orders:read', 'orders:manage'] })).toBe(true);
    });

    it('rejects a caller with neither listed scope', async () => {
      expect(await check(['products:write'], { anyScopes: ['orders:read', 'orders:manage'] })).toBe(false);
    });

    it('rejects a caller with zero scopes at all', async () => {
      expect(await check([], { anyScopes: ['orders:read', 'orders:manage'] })).toBe(false);
    });
  });

  it('requires BOTH checks to pass when a route somehow carries both decorators', async () => {
    const metadata = { scopes: ['products:write'], anyScopes: ['orders:read', 'orders:manage'] };

    expect(await check(['products:write', 'orders:read'], metadata)).toBe(true);
    expect(await check(['products:write'], metadata)).toBe(false);
    expect(await check(['orders:read'], metadata)).toBe(false);
  });
});
