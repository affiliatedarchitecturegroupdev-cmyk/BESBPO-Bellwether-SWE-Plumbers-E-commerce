import { ButtonLink } from '@/components/ui/Button';
import { auth } from '@/auth';

// PayFast's cancel_url — reached if the customer backs out of payment on
// PayFast's hosted page before completing it.
//
// This page used to have to admit a real gap here: OrdersService.checkout
// cleared the cart at order-creation time, before payment happened at
// all, so a cancelled payment lost the customer's cart. That's fixed now
// — cart-clearing moved to PaymentsService.handleItn, only firing on a
// CONFIRMED payment (see the comment there). A cancelled payment leaves
// the cart exactly as it was, so this page can honestly send the customer
// back to it instead of asking them to start over.
//
// Residual, accepted trade-off (still true, documented in
// docs/GAP-ANALYSIS-ROADMAP.md): the PENDING order created before this
// cancellation is never cleaned up or resumed — checking out again from
// the same cart creates a new order rather than retrying the old one.
// Unpaid orders can accumulate. Smaller problem than losing the cart.
//
// A guest's own cancelled checkout has the same "cart survives" property
// technically (their temporary guest-account cart still has the items),
// but /cart itself requires a real session to view at all — a guest has
// none, so "Back to Cart" would just bounce them to sign-in, which makes
// no sense for someone who was never signing in. Sent back to guest
// checkout instead, which is something that actually works for them —
// re-entering their items is a real, accepted rough edge for this path
// specifically (payment cancellation), not fixed further this pass.
export default async function CheckoutCancelledPage() {
  const session = await auth();
  const isGuest = !session?.accessToken;

  return (
    <div className="max-w-[600px] mx-auto px-8 py-20 text-center">
      <h1 className="font-display text-xl font-bold mb-3">Payment cancelled</h1>
      <p className="text-sm text-steel mb-8">
        {isGuest
          ? "Your payment was cancelled and you haven't been charged."
          : "Your payment was cancelled and you haven't been charged. Your cart is exactly as you left it — you're welcome to try checking out again."}
      </p>
      <ButtonLink href={isGuest ? '/checkout/guest' : '/cart'} variant="primary">
        {isGuest ? 'Try Again' : 'Back to Cart'}
      </ButtonLink>
    </div>
  );
}
