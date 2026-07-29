import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { PricedCart } from '@/lib/types';
import { SplitCheckoutForm } from '@/components/commerce/SplitCheckoutForm';

// Protected by middleware.ts alongside /checkout and /cart. Trade-credit
// only (see SplitCheckoutForm's own comment on why) — redirects a
// non-trade-credit account straight to regular checkout rather than
// showing a page that would just fail at submission.
export default async function SplitCheckoutPage() {
  const session = await auth();
  if (!session?.accessToken) redirect('/cart');

  const cart = await apiClient.get<PricedCart>('/v1/cart', { accessToken: session.accessToken });
  if (cart.lines.length === 0) redirect('/cart');

  const hasTradeCredit = await checkTradeCreditEligibility(session.accessToken);
  if (!hasTradeCredit) redirect('/checkout');

  // A coupon applied to the cart would make OrdersService.checkout
  // reject any split attempt outright (see that method's own comment on
  // why splitting with an active coupon is genuinely ambiguous, not just
  // inconvenient) — surfaced here too, before the customer fills in two
  // whole address forms only to hit that error at the very end.
  if (cart.couponCode) {
    return (
      <div className="max-w-lg mx-auto px-8 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-3">Remove your coupon first</h1>
        <p className="text-sm text-steel mb-6">
          Split checkout can&apos;t currently be combined with an applied coupon — which destination would
          honestly keep the discount is genuinely unclear, not just an inconvenience to work around. Remove{' '}
          <span className="font-mono">{cart.couponCode}</span> from your cart, then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Split Checkout</h1>
      <SplitCheckoutForm lines={cart.lines} />
    </div>
  );
}

// Same eligibility check as the regular checkout page — kept as its own
// small copy here rather than extracting a shared helper for what's
// currently still just two call sites.
async function checkTradeCreditEligibility(accessToken: string): Promise<boolean> {
  try {
    const account = await apiClient.get<{ approvedAt: string | null }>('/v1/trade-credit/me', { accessToken });
    return account.approvedAt !== null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false;
    throw err;
  }
}
