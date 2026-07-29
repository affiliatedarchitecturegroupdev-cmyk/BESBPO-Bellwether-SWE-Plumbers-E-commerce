import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface TradeCreditAccount {
  creditLimit: string;
  creditUsed: string;
  paymentTermDays: number;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function TradeDashboardPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const [tradeCredit, orders] = await Promise.all([
    fetchTradeCredit(session.accessToken),
    apiClient.get<Paginated<OrderListItem>>('/v1/orders?pageSize=5', { accessToken: session.accessToken }),
  ]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-1 bg-black/10 border border-black/10 mb-10">
        <StatBox
          value={tradeCredit ? zar.format(Number(tradeCredit.creditLimit) - Number(tradeCredit.creditUsed)) : '—'}
          label="Credit Available"
        />
        <StatBox value={tradeCredit ? zar.format(Number(tradeCredit.creditLimit)) : '—'} label="Credit Limit" />
        <StatBox value={String(orders.total)} label="Total Orders" />
      </div>

      {!tradeCredit && (
        <p className="text-[12.5px] text-steel mb-8">
          No trade credit account set up yet — see{' '}
          <Link href="/trade/credit-terms" className="text-hydra">
            Credit Terms
          </Link>{' '}
          for details, or check out with PayFast in the meantime.
        </p>
      )}

      <div className="flex justify-between items-baseline mb-4">
        <h2 className="text-base font-semibold">Recent Orders</h2>
        <Link href="/account/orders" className="font-mono text-[11px] text-hydra">
          View all →
        </Link>
      </div>

      {orders.items.length === 0 ? (
        <p className="text-sm text-steel">No orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {orders.items.map((order) => (
              <tr key={order.id} className="border-b border-black/5">
                <td className="py-2.5">
                  <Link href={`/account/orders/${order.id}`} className="hover:text-hydra">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2.5 text-[#4A5157]">{dateFormatter.format(new Date(order.createdAt))}</td>
                <td className="py-2.5 font-mono text-[12px] text-steel">{order.status}</td>
                <td className="py-2.5 text-right font-mono">{zar.format(Number(order.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white p-5">
      <div className="font-display text-2xl font-bold text-hydra">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-steel mt-1">{label}</div>
    </div>
  );
}

async function fetchTradeCredit(accessToken: string): Promise<TradeCreditAccount | null> {
  try {
    return await apiClient.get<TradeCreditAccount>('/v1/trade-credit/me', { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
