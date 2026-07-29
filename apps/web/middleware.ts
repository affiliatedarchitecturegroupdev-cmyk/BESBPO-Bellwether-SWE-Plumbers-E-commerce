import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { ADMIN_SCOPES } from '@/lib/admin-scopes';

// /admin needs more than "there's a session" — it needs at least one
// write scope. The API enforces this regardless on every request (see
// apps/api's KeycloakAuthGuard + @Scopes), so this is UI-level courtesy,
// not the real security boundary — but showing admin forms to someone
// whose every submission would be rejected server-side is still worth
// avoiding.

export default auth((req) => {
  const path = req.nextUrl.pathname;
  // /checkout/guest, /checkout/success, and /checkout/cancelled are
  // deliberately public — a guest never has a session at all, and
  // PayFast's own return_url/cancel_url land a guest back on
  // success/cancelled just like an authenticated customer. Only the main
  // /checkout page itself (the authenticated cart-checkout flow) needs a
  // session; a blanket path.startsWith('/checkout') would have swept all
  // three of these in too, making guest checkout impossible to even
  // reach.
  const isPublicCheckoutPath =
    path === '/checkout/guest' || path === '/checkout/success' || path === '/checkout/cancelled';
  const isAccountOrTrade =
    !isPublicCheckoutPath &&
    (path.startsWith('/account') || path.startsWith('/trade') || path.startsWith('/cart') || path.startsWith('/checkout'));
  const isAdmin = path.startsWith('/admin');

  if ((isAccountOrTrade || isAdmin) && !req.auth) {
    const signInUrl = new URL('/api/auth/signin', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  }

  if (isAdmin && req.auth) {
    const scopes = req.auth.scopes ?? [];
    const hasAdminAccess = ADMIN_SCOPES.some((scope) => scopes.includes(scope));
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/account/:path*', '/trade/:path*', '/admin/:path*', '/cart/:path*', '/checkout/:path*'],
};
