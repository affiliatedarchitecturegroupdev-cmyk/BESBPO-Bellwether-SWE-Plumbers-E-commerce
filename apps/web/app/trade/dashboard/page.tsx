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

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionCard
            href="/trade/quick-order"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            title="Quick Reorder"
            description="Reorder from past orders"
          />
          <QuickActionCard
            href="/trade/recurring-orders"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Standing Orders"
            description="Manage recurring orders"
          />
          <QuickActionCard
            href="/trade/bulk-order"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
            title="Bulk Order"
            description="Order multiple products"
          />
          <QuickActionCard
            href="/trade/quotes/new"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Request Quote"
            description="Get a custom quote"
          />
        </div>
      </div>

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

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-black/10 rounded-sm p-4 hover:border-hydra hover:text-hydra transition-colors group"
    >
      <div className="text-steel group-hover:text-hydra mb-2">{icon}</div>
      <p className="font-semibold text-sm mb-0.5">{title}</p>
      <p className="font-mono text-[10px] text-steel">{description}</p>
    </Link>
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
