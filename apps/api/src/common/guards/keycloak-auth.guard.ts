import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY, ANY_SCOPES_KEY } from '../decorators/scopes.decorator';
import { AuthenticatedAccount } from '../decorators/current-account.decorator';

// Two-stage guard: first runs Passport's 'jwt' strategy (KeycloakJwtStrategy)
// to authenticate the request, then — if the route carries @Scopes(...)
// and/or @AnyScope(...) — checks the token's scope_keys against what's
// required. A route with neither decorator only needs a valid token, not
// a specific scope.
@Injectable()
export class KeycloakAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const anyOfScopes = this.reflector.getAllAndOverride<string[]>(ANY_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if ((!requiredScopes || requiredScopes.length === 0) && (!anyOfScopes || anyOfScopes.length === 0)) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedAccount }>();
    const grantedScopes = new Set(request.user.scopes);

    // Both checks independently must pass when both happen to be present
    // on the same route (in practice a route uses one or the other, not
    // both, but this stays correct either way rather than silently
    // ignoring one of them).
    if (requiredScopes && requiredScopes.length > 0 && !requiredScopes.every((scope) => grantedScopes.has(scope))) {
      return false;
    }
    if (anyOfScopes && anyOfScopes.length > 0 && !anyOfScopes.some((scope) => grantedScopes.has(scope))) {
      return false;
    }
    return true;
  }
}
