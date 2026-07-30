import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { CancelOrderButton } from '@/components/commerce/CancelOrderButton';
import { AmendAddressPanel } from '@/components/commerce/AmendAddressPanel';
import { RequestReturnForm } from '@/components/commerce/RequestReturnForm';
import { OrderTrackingCard, OrderStatusTimeline } from '@/components/commerce/OrderTracking';

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
  updatedAt?: string;
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
    return <p className="max-w-[700px] mx-auto px-4 sm:px-6 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const order = await fetchOrder(params.id, session.accessToken);
  if (!order) notFound();

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold mb-1">{order.orderNumber}</h1>
          <p className="font-mono text-[11px] text-steel">{order.status}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-hydra hover:text-hydra/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoice
          </a>
          <Link
            href={`/account/orders/${order.id}/refunds`}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-hydra hover:text-hydra/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Refunds
          </Link>
        </div>
      </div>

      {order.poNumber && <p className="text-[13px] text-steel mb-2">PO / Reference: {order.poNumber}</p>}
      {order.placedByEmail && <p className="text-[13px] text-steel mb-4">Placed by: {order.placedByEmail}</p>}

      {CANCELLABLE_STATUSES.includes(order.status) && (
        <div className="mb-6">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}

      {/* Enhanced Order Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <OrderTrackingCard
          courierName={order.courierName}
          trackingNumber={order.trackingNumber}
          trackingUrl={order.trackingUrl}
          orderNumber={order.orderNumber}
        />
        <div className="border border-black/10 rounded-sm p-4">
          <OrderStatusTimeline
            currentStatus={order.status}
            statuses={[]}
            currentDate={order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('en-ZA') : undefined}
          />
        </div>
      </div>

      <h2 className="text-base font-semibold mb-3">Items</h2>
      <ul className="mb-6">
        {order.lineItems.map((item) => (
          <li key={item.id} className="flex justify-between text-sm py-2 border-b border-black/5">
            <span className="truncate mr-2">
              {item.quantity}× {item.productName}
            </span>
            <span className="font-mono flex-shrink-0">{zar.format(Number(item.lineTotal))}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
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
