import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { PricedCart } from '@/lib/types';
import { CartLineRow } from '@/components/commerce/CartLineRow';
import { CouponForm } from '@/components/commerce/CouponForm';
import { ButtonLink } from '@/components/ui/Button';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

// Protected by middleware.ts (Cart is 1:1 with Account — there's no guest
// cart in this schema), so a session is guaranteed here. Still guards on
// session.accessToken defensively rather than asserting it with `!`,
// since a session existing doesn't strictly guarantee the token survived
// onto it (see auth.ts's jwt callback).
export default async function CartPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[1100px] mx-auto px-8 py-16 text-sm text-steel">Please sign in to view your cart.</p>;
  }

  const cart = await apiClient.get<PricedCart>('/v1/cart', { accessToken: session.accessToken });

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Your Cart ({cart.lines.length} items)</h1>

      {cart.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid grid-cols-[1.6fr_1fr] gap-14">
          <div>
            {cart.lines.map((line) => (
              <CartLineRow key={line.cartItemId} line={line} />
            ))}
          </div>
          <OrderSummary cart={cart} />
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="border border-dashed border-black/15 rounded-sm py-20 text-center">
      <p className="text-sm text-steel mb-5">Your cart is empty.</p>
      <ButtonLink href="/" variant="primary">
        Browse Products
      </ButtonLink>
    </div>
  );
}

function OrderSummary({ cart }: { cart: PricedCart }) {
  return (
    <div className="border border-black/10 rounded-sm p-6 h-fit">
      {cart.usingTradePricing && (
        <div className="bg-[#EAF3F8] border border-[#CFE3ED] text-hydra text-[12.5px] rounded-sm px-4 py-3 mb-5">
          Trade account detected — trade pricing applied.
        </div>
      )}

      <h2 className="text-base font-semibold mb-4">Order Summary</h2>

      <CouponForm couponCode={cart.couponCode} couponError={cart.couponError} />

      <div className="flex justify-between text-[13.5px] text-[#4A5157] py-2">
        <span>Subtotal</span>
        <span>{zar.format(cart.subtotal)}</span>
      </div>
      {cart.discountAmount > 0 && (
        <div className="flex justify-between text-[13.5px] text-hydra py-2">
          <span>Discount</span>
          <span>-{zar.format(cart.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-[13.5px] text-[#4A5157] py-2">
        <span>VAT (15%)</span>
        <span>{zar.format(cart.vatAmount)}</span>
      </div>
      <p className="text-[11.5px] text-steel py-1">Delivery calculated at checkout.</p>
      <div className="flex justify-between font-semibold text-[15px] border-t border-black/10 mt-2 pt-4 mb-5">
        <span>Total</span>
        <span>{zar.format(cart.total)}</span>
      </div>

      <ButtonLink href="/checkout" variant="primary" className="w-full justify-center">
        Proceed to Checkout
      </ButtonLink>
    </div>
  );
}
