import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { OrderFulfillmentForm } from '@/components/admin/OrderFulfillmentForm';

interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  account: { email: string };
  poNumber: string | null;
  placedByEmail: string | null;
  shippingAddress: { line1: string; line2?: string; city: string; province: string; postalCode: string };
  lineItems: { id: string; productName: string; quantity: number; lineTotal: string }[];
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  params: { id: string };
}

// Uses GET /v1/orders/admin/:id, not the customer-facing GET /v1/orders/:id
// — that one checks the order belongs to the CALLING account, which would
// 403 an admin viewing any order that isn't their own personal purchase
// history. See OrdersService.findOneAdmin's comment for how this was found.
export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const order = await fetchOrder(params.id, session.accessToken);
  if (!order) notFound();

  return (
    <div className="max-w-[600px]">
      <h1 className="font-display text-xl font-bold mb-1">{order.orderNumber}</h1>
      <p className="text-[12px] text-steel mb-6">{order.account.email}</p>
      {order.poNumber && <p className="text-[13px] text-steel mb-4">PO / Reference: {order.poNumber}</p>}
      {order.placedByEmail && order.placedByEmail !== order.account.email && (
        <p className="text-[13px] text-steel mb-4">Placed by: {order.placedByEmail}</p>
      )}

      <a
        href={`/api/admin/orders/${order.id}/invoice`}
        className="inline-block font-mono text-[11px] uppercase tracking-wide text-hydra mb-4"
      >
        Download Invoice
      </a>

      <div className="mb-6">
        <OrderFulfillmentForm
          orderId={order.id}
          currentStatus={order.status}
          courierName={order.courierName}
          trackingNumber={order.trackingNumber}
          trackingUrl={order.trackingUrl}
        />
      </div>

      <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">Items</h2>
      <ul className="mb-6">
        {order.lineItems.map((item) => (
          <li key={item.id} className="flex justify-between text-sm py-2 border-b border-black/5">
            <span>
              {item.quantity}× {item.productName}
            </span>
            <span className="font-mono">{zar.format(Number(item.lineTotal))}</span>
          </li>
        ))}
      </ul>

      <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">Delivery Address</h2>
      <p className="text-sm text-[#4A5157]">
        {order.shippingAddress.line1}
        {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
        <br />
        {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
      </p>
    </div>
  );
}

async function fetchOrder(id: string, accessToken: string): Promise<AdminOrderDetail | null> {
  try {
    return await apiClient.get<AdminOrderDetail>(`/v1/orders/admin/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
