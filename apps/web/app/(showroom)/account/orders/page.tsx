import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'text-steel',
  CONFIRMED: 'text-hydra',
  PROCESSING: 'text-hydra',
  DISPATCHED: 'text-[#1E8E5A]',
  DELIVERED: 'text-[#1E8E5A]',
  CANCELLED: 'text-red-600',
  REFUNDED: 'text-red-600',
};

// Protected by middleware.ts (/account/*). Not gated further here — every
// order returned by GET /v1/orders is already scoped to the caller's own
// account server-side (OrdersService.findMine), so there's nothing extra
// for this page to check.
export default async function OrderHistoryPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[900px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const orders = await apiClient.get<Paginated<OrderListItem>>('/v1/orders?pageSize=50', {
    accessToken: session.accessToken,
  });

  return (
    <div className="max-w-[900px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Your Orders</h1>

      {orders.items.length === 0 ? (
        <p className="text-sm text-steel">You haven&apos;t placed any orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Order</th>
              <th className="pb-2 font-normal">Date</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.items.map((order) => (
              <tr key={order.id} className="border-b border-black/5">
                <td className="py-3">
                  <Link href={`/account/orders/${order.id}`} className="hover:text-hydra font-medium">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-3 text-[#4A5157]">{dateFormatter.format(new Date(order.createdAt))}</td>
                <td className={`py-3 font-mono text-[12px] ${STATUS_STYLES[order.status] ?? 'text-steel'}`}>
                  {order.status}
                </td>
                <td className="py-3 text-right font-mono">{zar.format(Number(order.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
