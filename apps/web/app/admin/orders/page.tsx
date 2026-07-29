import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { updateOrderStatusAction } from '@/lib/actions/admin-orders';

interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  account: { email: string };
  createdAt: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const orders = await apiClient.get<Paginated<AdminOrderItem>>('/v1/orders/admin?pageSize=100', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Orders</h1>

      {orders.items.length === 0 ? (
        <p className="text-sm text-steel">No orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Order</th>
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal">Date</th>
              <th className="pb-2 font-normal text-right">Total</th>
              <th className="pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.items.map((order) => (
              <tr key={order.id} className="border-b border-black/5">
                <td className="py-2.5">
                  <Link href={`/admin/orders/${order.id}`} className="hover:text-hydra">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2.5 text-steel">{order.account.email}</td>
                <td className="py-2.5 text-[#4A5157]">{dateFormatter.format(new Date(order.createdAt))}</td>
                <td className="py-2.5 text-right font-mono">{zar.format(Number(order.total))}</td>
                <td className="py-2.5">
                  <StatusSelect
                    id={order.id}
                    currentStatus={order.status}
                    options={STATUS_OPTIONS}
                    action={updateOrderStatusAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
