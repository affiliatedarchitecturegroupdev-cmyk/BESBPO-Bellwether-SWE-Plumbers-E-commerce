'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RecurringOrderItem {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockQty: number;
    images: { id: string; url: string; sortOrder: number }[];
  };
}

interface RecurringOrder {
  id: string;
  name: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  poNumber: string | null;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
  items: RecurringOrderItem[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

interface StandingOrdersClientProps {
  orders: RecurringOrder[];
  accessToken: string;
  hasTradeCredit: boolean;
}

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 Weeks',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
};

export function StandingOrdersClient({ orders: initialOrders, accessToken, hasTradeCredit }: StandingOrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this standing order?')) return;

    setDeletingId(id);
    setError(null);

    startTransition(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/recurring-orders/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } catch {
        setError('Failed to delete standing order. Please try again.');
      } finally {
        setDeletingId(null);
      }
    });
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    setTogglingId(id);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/recurring-orders/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ isActive: !currentActive }),
        });
        const updated = await response.json();
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, isActive: updated.data?.isActive ?? !currentActive } : o)));
      } catch {
        setError('Failed to update standing order. Please try again.');
      } finally {
        setTogglingId(null);
      }
    });
  }

  if (!hasTradeCredit) {
    return (
      <div className="text-center py-12 border border-dashed border-black/15 rounded-sm">
        <svg className="w-12 h-12 text-steel mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-steel text-sm mb-3">Standing orders require an approved trade account.</p>
        <Link href="/trade/apply" className="text-hydra text-sm hover:underline">
          Apply for a Trade Account →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-steel">
            {orders.length} standing order{orders.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Link
          href="/trade/recurring-orders/new"
          className="bg-hydra text-white font-mono text-[11px] uppercase tracking-wide px-6 py-3 rounded-sm hover:bg-hydra/90 transition-colors inline-block text-center"
        >
          + New Standing Order
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-black/15 rounded-sm">
          <svg className="w-12 h-12 text-steel mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-steel text-sm mb-3">No standing orders yet.</p>
          <p className="text-xs text-steel mb-4">
            Set up recurring orders for products you buy regularly.
          </p>
          <Link href="/trade/recurring-orders/new" className="text-hydra text-sm hover:underline">
            Create your first standing order →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-black/10 rounded-sm overflow-hidden">
              {/* Order Header */}
              <div className="bg-black/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-sm">{order.name}</p>
                    {order.poNumber && (
                      <p className="font-mono text-[10px] text-steel mt-0.5">PO: {order.poNumber}</p>
                    )}
                  </div>
                  <div className="h-6 w-px bg-black/10 hidden sm:block" />
                  <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 bg-cyan/10 text-cyan rounded-sm">
                    {frequencyLabels[order.frequency] ?? order.frequency}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="font-mono text-[10px] text-steel hidden sm:inline">
                      {order.isActive ? 'Active' : 'Paused'}
                    </span>
                    <button
                      onClick={() => handleToggleActive(order.id, order.isActive)}
                      disabled={togglingId === order.id}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        order.isActive ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === order.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          order.isActive ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>

                  {/* Next Run */}
                  <div className="text-right hidden md:block">
                    <p className="font-mono text-[10px] text-steel">Next run</p>
                    <p className="text-xs">
                      {new Date(order.nextRunAt).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(order.id)}
                    disabled={deletingId === order.id}
                    className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete standing order"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="p-4">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black/5 rounded-sm flex-shrink-0 overflow-hidden">
                        {item.product?.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.product.images[0].url}
                            alt={item.product?.name ?? 'Product'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-steel text-[8px]">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product?.name ?? 'Unknown Product'}</p>
                        <p className="font-mono text-[10px] text-steel">{item.product?.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">×{item.quantity}</p>
                        <p className="font-mono text-[10px] text-steel">
                          {item.product?.stockQty ?? 0 > 0 ? 'In stock' : 'Out of stock'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Address */}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-start gap-2">
                  <svg className="w-4 h-4 text-steel mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-xs text-steel">
                    <p>{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
