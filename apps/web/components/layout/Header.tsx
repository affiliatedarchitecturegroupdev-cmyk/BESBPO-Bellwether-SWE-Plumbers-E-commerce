import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { PricedCart } from '@/lib/types';
import { ADMIN_SCOPES } from '@/lib/admin-scopes';
import { BrandMark } from './BrandMark';

// Server component — auth() reads the session server-side, so there's no
// client-side flash of "not logged in" before the real state resolves.

export async function Header() {
  const session = await auth();
  const isAdmin = ADMIN_SCOPES.some((scope) => session?.scopes?.includes(scope));
  const cartCount = session?.accessToken ? await fetchCartCount(session.accessToken) : 0;

  return (
    <header className="bg-ink text-porcelain sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-[1240px] mx-auto flex items-center gap-8 px-8 py-3.5">
        <Link href="/" className="flex items-center gap-3.5 flex-shrink-0">
          <BrandMark className="w-[38px] h-[50px]" />
          <span className="leading-tight">
            <span className="block font-display font-bold text-[15px]">BELLWETHER</span>
            <span className="font-mono text-[8.5px] tracking-wide text-cyan">SHOP · TRADE &amp; RETAIL</span>
          </span>
        </Link>

        <form action="/search" className="flex-1 max-w-[460px]">
          <input
            name="q"
            placeholder="Search 10,500+ products"
            className="w-full bg-white/[0.08] border border-white/15 rounded-sm px-3.5 py-2 text-[13.5px] outline-none focus:border-cyan"
          />
        </form>

        <nav className="flex items-center gap-6 ml-auto text-[13px]">
          {session ? (
            <>
              {isAdmin && <Link href="/admin">Admin</Link>}
              <Link href="/account/orders">Account</Link>
              <form action={async () => { 'use server'; await signOut(); }}>
                <button type="submit" className="text-steel hover:text-cyan">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/checkout/guest">Checkout as Guest</Link>
              <Link href="/api/auth/signin">Sign in</Link>
            </>
          )}
          <Link
            href="/trade/dashboard"
            className="font-mono text-[10.5px] bg-hydra text-white px-3 py-1.5 rounded-sm"
          >
            Trade Portal
          </Link>
          <Link href="/cart" className="relative">
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3.5 bg-cyan text-ink font-mono text-[10px] w-[17px] h-[17px] rounded-full flex items-center justify-center font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

// Every line item, not units summed — matches what the cart page's
// heading ("Your Cart (N items)") counts, so the header badge and the
// page it links to never disagree on what N means.
async function fetchCartCount(accessToken: string): Promise<number> {
  try {
    const cart = await apiClient.get<PricedCart>('/v1/cart', { accessToken });
    return cart.lines.length;
  } catch {
    // A failed fetch here shouldn't break the whole header — every page
    // renders this component, so this must degrade gracefully to "no
    // badge" rather than taking down page rendering.
    return 0;
  }
}
