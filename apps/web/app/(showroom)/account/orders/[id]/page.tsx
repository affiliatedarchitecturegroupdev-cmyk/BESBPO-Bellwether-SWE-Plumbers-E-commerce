import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { CancelOrderButton } from '@/components/commerce/CancelOrderButton';
import { AmendAddressPanel } from '@/components/commerce/AmendAddressPanel';
import { RequestReturnForm } from '@/components/commerce/RequestReturnForm';
import { resolveTrackingUrl } from '@/lib/courier';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  subtotal: string;
  vatAmount: string;
  deliveryFee: string;
  total: string;
  poNumber: string | null;
  placedByEmail: string | null;
  shippingAddress: { line1: string; line2?: string; city: string; province: string; postalCode: string };
  lineItems: { id: string; productName: string; quantity: number; unitPrice: string; lineTotal: string }[];
  createdAt: string;
}

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
// Wider than CANCELLABLE_STATUSES deliberately — an order already being
// prepared (PROCESSING) still allows an address fix, since that undoes
// nothing already in progress the way cancelling would. See
// OrdersService.amendAddress's own comment.
const AMENDABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING'];

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[700px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const order = await fetchOrder(params.id, session.accessToken);
  if (!order) notFound();

  const trackingLink = resolveTrackingUrl(order.courierName, order.trackingUrl);

  return (
    <div className="max-w-[700px] mx-auto px-8 py-10">
      <h1 className="font-display text-xl font-bold mb-1">{order.orderNumber}</h1>
      <p className="font-mono text-[11px] text-steel mb-3">{order.status}</p>
      {order.poNumber && <p className="text-[13px] text-steel mb-3">PO / Reference: {order.poNumber}</p>}
      {order.placedByEmail && <p className="text-[13px] text-steel mb-3">Placed by: {order.placedByEmail}</p>}
      <a
        href={`/api/orders/${order.id}/invoice`}
        className="inline-block font-mono text-[11px] uppercase tracking-wide text-hydra mb-3"
      >
        Download Invoice
      </a>
      {CANCELLABLE_STATUSES.includes(order.status) && (
        <div className="mb-8">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}

      {order.trackingNumber && (
        <div className="border border-black/10 rounded-sm p-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">Tracking</p>
          <p className="text-sm">
            {order.courierName && <span className="font-medium">{order.courierName}</span>}
            {order.courierName && ' — '}
            {order.trackingNumber}
          </p>
          {trackingLink && (
            <a href={trackingLink} target="_blank" rel="noreferrer" className="text-[13px] text-hydra">
              Track this delivery →
            </a>
          )}
        </div>
      )}

      <h2 className="text-base font-semibold mb-3">Items</h2>
      <ul className="mb-8">
        {order.lineItems.map((item) => (
          <li key={item.id} className="flex justify-between text-sm py-2 border-b border-black/5">
            <span>
              {item.quantity}× {item.productName}
            </span>
            <span className="font-mono">{zar.format(Number(item.lineTotal))}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-10">
        <div>
          <h2 className="text-base font-semibold mb-3">Delivery Address</h2>
          {AMENDABLE_STATUSES.includes(order.status) ? (
            <AmendAddressPanel orderId={order.id} address={order.shippingAddress} />
          ) : (
            <p className="text-sm text-[#4A5157]">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
            </p>
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold mb-3">Summary</h2>
          <div className="flex justify-between text-[13.5px] text-[#4A5157] py-1">
            <span>Subtotal</span>
            <span>{zar.format(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-[13.5px] text-[#4A5157] py-1">
            <span>VAT</span>
            <span>{zar.format(Number(order.vatAmount))}</span>
          </div>
          <div className="flex justify-between text-[13.5px] text-[#4A5157] py-1">
            <span>Delivery</span>
            <span>{zar.format(Number(order.deliveryFee))}</span>
          </div>
          <div className="flex justify-between font-semibold text-[14px] border-t border-black/10 mt-2 pt-2">
            <span>Total</span>
            <span>{zar.format(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {order.status === 'DELIVERED' && <RequestReturnForm orderId={order.id} lineItems={order.lineItems} />}
    </div>
  );
}

async function fetchOrder(id: string, accessToken: string): Promise<OrderDetail | null> {
  try {
    return await apiClient.get<OrderDetail>(`/v1/orders/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}
