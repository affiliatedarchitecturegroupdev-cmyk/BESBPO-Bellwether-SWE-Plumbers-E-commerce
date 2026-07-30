import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { Address, PricedCart } from '@/lib/types';
import { CheckoutForm } from '@/components/commerce/CheckoutForm';
import { ExpressCheckoutPanel } from '@/components/commerce/ExpressCheckout';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

// Protected by middleware.ts alongside /cart. Redirects to /cart rather
// than rendering an empty-checkout state — there's nothing useful to do
// on a checkout page with no order to place.
export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.accessToken) redirect('/cart');

  const cart = await apiClient.get<PricedCart>('/v1/cart', { accessToken: session.accessToken });
  if (cart.lines.length === 0) redirect('/cart');

  const savedAddresses = await apiClient.get<Address[]>('/v1/addresses', { accessToken: session.accessToken });
  const hasTradeCredit = await checkTradeCreditEligibility(session.accessToken);
  // A preview only — the actual charge at submission is a fresh quote
  // against whatever address the customer actually enters in the form
  // below (see checkout-actions.ts), which won't always match their
  // saved default. Shown when possible so the recap isn't silently wrong,
  // not because it's guaranteed to be the final figure.
  const deliveryEstimate = await getDeliveryEstimate(savedAddresses, session.accessToken);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">Checkout</h1>
      {hasTradeCredit && (
        <p className="text-[13px] text-steel mb-4 sm:mb-6">
          Ordering for more than one job site?{' '}
          <a href="/checkout/split" className="text-hydra">
            Split this order across two delivery addresses
          </a>
          .
        </p>
      )}
      
      {/* Express Checkout Panel - Quick address selection */}
      {savedAddresses.length > 0 && (
        <ExpressCheckoutPanel 
          savedAddresses={savedAddresses} 
          hasTradeCredit={hasTradeCredit} 
        />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6 lg:gap-10 xl:gap-14">
        <div>
          <CheckoutForm savedAddresses={savedAddresses} hasTradeCredit={hasTradeCredit} />
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start order-first lg:order-last mb-6 lg:mb-0">
          <CartRecap cart={cart} deliveryEstimate={deliveryEstimate} />
        </div>
      </div>
    </div>
  );
}

// GET /v1/trade-credit/me throws a 404 when no TradeCreditAccount exists —
// that's an entirely normal state for a retail account, not an error this
// page should surface. Approval also matters: an account with a pending,
// not-yet-approved trade credit application shouldn't see the option
// either (see OrdersService.checkout's own approvedAt check, which this
// mirrors so the option only appears when it would actually work).
async function checkTradeCreditEligibility(accessToken: string): Promise<boolean> {
  try {
    const account = await apiClient.get<{ approvedAt: string | null }>('/v1/trade-credit/me', { accessToken });
    return account.approvedAt !== null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false;
    throw err;
  }
}

async function getDeliveryEstimate(addresses: Address[], accessToken: string): Promise<number | null> {
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  if (!defaultAddress) return null; // no saved address at all yet — nothing to quote against until the customer types one into the form

  try {
    const quote = await apiClient.post<{ fee: number }>(
      '/v1/shipping/quote',
      {
        line1: defaultAddress.line1,
        line2: defaultAddress.line2,
        city: defaultAddress.city,
        province: defaultAddress.province,
        postalCode: defaultAddress.postalCode,
      },
      { accessToken },
    );
    return quote.fee;
  } catch {
    return null; // shipping quote failing shouldn't break the whole checkout page — CartRecap shows "calculated at checkout" instead
  }
}

function CartRecap({ cart, deliveryEstimate }: { cart: PricedCart; deliveryEstimate: number | null }) {
  const total = cart.total + (deliveryEstimate ?? 0);

  return (
    <div className="border border-black/10 rounded-sm p-4 sm:p-6 bg-white lg:bg-transparent">
      <h2 className="text-base font-semibold mb-3 sm:mb-4">Order Summary</h2>
      <ul className="mb-4 max-h-[200px] overflow-y-auto">
        {cart.lines.map((line) => (
          <li key={line.cartItemId} className="flex justify-between text-[13.5px] py-1.5">
            <span className="text-[#4A5157] truncate mr-2">
              {line.quantity}× {line.name}
            </span>
            <span className="font-mono flex-shrink-0">{zar.format(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-black/10 pt-3 space-y-1.5">
        <div className="flex justify-between text-[13.5px] text-[#4A5157]">
          <span>Subtotal</span>
          <span>{zar.format(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-[13.5px] text-[#4A5157]">
          <span>VAT (15%)</span>
          <span>{zar.format(cart.vatAmount)}</span>
        </div>
        <div className="flex justify-between text-[13.5px] text-[#4A5157]">
          <span>Delivery</span>
          <span>{deliveryEstimate !== null ? zar.format(deliveryEstimate) : 'Calculated at checkout'}</span>
        </div>
      </div>
      <div className="flex justify-between font-semibold text-[15px] border-t border-black/10 mt-3 pt-3">
        <span>Total</span>
        <span>{deliveryEstimate !== null ? zar.format(total) : `${zar.format(cart.total)} + delivery`}</span>
      </div>
    </div>
  );
}
