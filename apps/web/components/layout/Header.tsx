'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { PricedCart } from '@/lib/types';
import { ADMIN_SCOPES } from '@/lib/admin-scopes';
import { BrandMark } from './BrandMark';
import { SearchAutocomplete } from '@/components/commerce/SearchAutocomplete';

// Client component for interactive header with mobile menu
export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const isAdmin = ADMIN_SCOPES.some((scope) => session?.scopes?.includes(scope));

  // Fetch cart count on mount
  useEffect(() => {
    if (session?.accessToken) {
      fetchCartCount(session.accessToken).then(setCartCount).catch(() => {});
    }
  }, [session?.accessToken]);

  return (
    <header className="bg-ink text-porcelain sticky top-0 z-50 border-b border-white/10">
      {/* Main Header */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0">
            <BrandMark className="w-8 h-10 sm:w-[38px] sm:h-[50px]" />
            <span className="leading-tight hidden sm:block">
              <span className="block font-display font-bold text-sm sm:text-[15px]">BELLWETHER</span>
              <span className="font-mono text-[7px] sm:text-[8.5px] tracking-wide text-cyan">SHOP · TRADE & RETAIL</span>
            </span>
          </Link>

          {/* Search - Desktop with Autocomplete */}
          <div className="hidden md:block flex-1 max-w-[460px] mx-4">
            <SearchAutocomplete />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-[13px]">
            {session ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="hover:text-cyan transition-colors">
                    Admin
                  </Link>
                )}
                <Link href="/account/orders" className="hover:text-cyan transition-colors">
                  Account
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-steel hover:text-cyan transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/checkout/guest" className="hover:text-cyan transition-colors hidden xl:inline">
                  Checkout as Guest
                </Link>
                <Link href="/signin" className="hover:text-cyan transition-colors">
                  Sign in
                </Link>
              </>
            )}
            <Link
              href="/trade/dashboard"
              className="font-mono text-[10.5px] bg-hydra text-white px-3 py-1.5 rounded-sm hover:bg-hydra/90 transition-colors"
            >
              Trade Portal
            </Link>
            <Link href="/cart" className="relative hover:text-cyan transition-colors">
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3.5 bg-cyan text-ink font-mono text-[10px] w-[17px] h-[17px] rounded-full flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 text-porcelain hover:text-cyan"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="current情感">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Search with Autocomplete */}
        <div className="md:hidden pb-3">
          <SearchAutocomplete />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-ink-2 border-t border-white/10">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4 space-y-4">
            {session ? (
              <>
                <div className="text-steel text-xs mb-2">
                  Signed in as {session.user?.email}
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block py-2 hover:text-cyan transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/account/orders"
                  className="block py-2 hover:text-cyan transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Account
                </Link>
                <Link
                  href="/account/profile"
                  className="block py-2 hover:text-cyan transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/account/addresses"
                  className="block py-2 hover:text-cyan transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Addresses
                </Link>
                <hr className="border-white/10" />
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left py-2 text-steel hover:text-cyan transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="block py-2 hover:text-cyan transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block py-2 text-cyan hover:text-porcelain transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Account
                </Link>
                <Link
                  href="/checkout/guest"
                  className="block py-2 hover:text-cyan transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Checkout as Guest
                </Link>
              </>
            )}
            <hr className="border-white/10" />
            <Link
              href="/trade/dashboard"
              className="block py-2 font-mono text-sm bg-hydra text-white px-4 py-2 rounded-sm text-center hover:bg-hydra/90 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Trade Portal
            </Link>
            <Link
              href="/cart"
              className="flex items-center justify-between py-2 hover:text-cyan transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="bg-cyan text-ink font-mono text-xs px-2 py-0.5 rounded-full font-semibold">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
              )}
            </Link>
            <hr className="border-white/10" />
            <Link href="/category/toilets" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Toilets</Link>
            <Link href="/category/basins" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Basins</Link>
            <Link href="/category/baths" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Baths</Link>
            <Link href="/category/showers" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Showers</Link>
            <Link href="/category/taps" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Taps</Link>
            <Link href="/category/geysers" className="block py-2 hover:text-cyan transition-colors" onClick={() => setMobileMenuOpen(false)}>Geysers</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// Every line item, not units summed
async function fetchCartCount(accessToken: string): Promise<number> {
  try {
    const cart = await apiClient.get<PricedCart>('/v1/cart', { accessToken });
    return cart.lines.length;
  } catch {
    return 0;
  }
}
