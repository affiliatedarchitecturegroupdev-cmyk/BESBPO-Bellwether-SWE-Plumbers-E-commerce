import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { ButtonLink } from '@/components/ui/Button';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
}

interface Props {
  searchParams: { orderId?: string };
}

// PayFast redirects the browser here immediately after payment — but the
// actual order status update (PENDING -> CONFIRMED) happens separately,
// server-to-server, via PaymentsService.handleItn's ITN webhook. Those two
// events are independent and unordered: the browser redirect can arrive
// before, after, or (rarely) without the ITN ever landing yet. This page
// deliberately does NOT assume the order is confirmed just because the
// customer got here — it shows whatever status the order actually has
// right now, and says so honestly if that's still PENDING.
export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const session = await auth();
  const isGuest = !session?.accessToken;
  const order = session?.accessToken && searchParams.orderId
    ? await fetchOrder(searchParams.orderId, session.accessToken)
    : null;

  // A guest has no session to look their order up with at all — this
  // isn't "we couldn't find that order," which would wrongly suggest
  // something went wrong. Order and payment confirmation both went out
  // by email (see NotificationsService.queueOrderConfirmed, fired from
  // PaymentsService.handleItn on a CONFIRMED payment) — that's their
  // actual receipt, same as anyone else's, just without an account page
  // to also view it on afterward.
  if (isGuest) {
    return (
      <div className="max-w-[600px] mx-auto px-8 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-3">Thanks — payment received</h1>
        <p className="text-sm text-steel mb-8">
          We&apos;re confirming your payment with PayFast — this usually takes a few seconds. Check your
          email for order confirmation and tracking updates.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="font-mono text-[12px] text-hydra">
            Continue Shopping
          </Link>
          <Link href="/track-order" className="font-mono text-[12px] text-hydra">
            Track This Order
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-[600px] mx-auto px-8 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-3">We couldn&apos;t find that order.</h1>
        <ButtonLink href="/account/orders" variant="primary">
          View your orders
        </ButtonLink>
      </div>
    );
  }

  const isConfirmed = order.status === 'CONFIRMED';

  return (
    <div className="max-w-[600px] mx-auto px-8 py-20 text-center">
      <h1 className="font-display text-xl font-bold mb-3">
        {isConfirmed ? 'Order confirmed' : 'Thanks — payment received'}
      </h1>
      <p className="text-sm text-steel mb-1">Order {order.orderNumber}</p>
      <p className="text-sm text-steel mb-8">
        {isConfirmed
          ? "We're getting your order ready."
          : "We're confirming your payment with PayFast — this usually takes a few seconds. You'll receive an email once it's confirmed."}
      </p>
      <div className="flex gap-4 justify-center">
        <ButtonLink href={`/account/orders/${order.id}`} variant="primary">
          View Order
        </ButtonLink>
        <Link href="/" className="font-mono text-[12px] text-hydra self-center">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

async function fetchOrder(orderId: string, accessToken: string): Promise<OrderSummary | null> {
  try {
    return await apiClient.get<OrderSummary>(`/v1/orders/${orderId}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}
