'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { trackOrderAction, TrackOrderResult } from '@/lib/actions/track-order-actions';
import { OrderTrackingCard, OrderStatusTimeline } from '@/components/commerce/OrderTracking';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Payment pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

// Public, no sign-in required — the whole point of guest order tracking.
// Looks up by order number + email together (POST /v1/orders/track), not
// by order number alone, matching the API's own deliberate design: a
// wrong email gets the exact same generic "not found" as a wrong order
// number, so this page never implies which one was wrong either.
export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TrackOrderResult | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const outcome = await trackOrderAction(orderNumber.trim(), email.trim());
      setResult(outcome);
    });
  }

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-sm sm:text-base text-steel max-w-md mx-auto">
          Enter your order number and email to see real-time updates on your delivery.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
              Order Number
            </label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              placeholder="e.g. BSWE-1042"
              className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
              Email Address
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="your@email.com"
              className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-8 py-3 rounded-sm disabled:opacity-60 hover:bg-ink/90 transition-colors"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Looking up…
            </span>
          ) : (
            'Track Order'
          )}
        </button>
      </form>

      {result && !result.ok && (
        <div className="text-center py-8 px-4 border border-red-100 bg-red-50 rounded-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-700 mb-2">Order not found</p>
          <p className="text-xs text-red-600">
            Please check your order number and email, then try again.
          </p>
        </div>
      )}

      {result?.ok && result.order && (
        <div className="space-y-4">
          {/* Order Header */}
          <div className="bg-white border border-black/10 rounded-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="font-mono text-lg font-semibold">{result.order.orderNumber}</p>
                <p className="text-xs text-steel">
                  Placed on {new Date(result.order.createdAt).toLocaleDateString('en-ZA', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-sm bg-hydra/10 text-hydra font-mono text-xs uppercase tracking-wide">
                {STATUS_LABELS[result.order.status] ?? result.order.status}
              </span>
            </div>

            {/* Order Tracking & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OrderTrackingCard
                courierName={result.order.courierName}
                trackingNumber={result.order.trackingNumber}
                trackingUrl={result.order.trackingUrl}
                orderNumber={result.order.orderNumber}
              />
              <div className="border border-black/10 rounded-sm p-4">
                <OrderStatusTimeline
                  currentStatus={result.order.status}
                  statuses={[]}
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-black/10 rounded-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-3">Order Items</h2>
            <ul className="divide-y divide-black/5">
              {result.order.lineItems.map((item, i) => (
                <li key={i} className="flex justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-steel">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-mono text-sm flex-shrink-0">{zar.format(Number(item.lineTotal))}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-sm border-t border-black/10 pt-3 mt-3">
              <span>Total</span>
              <span>{zar.format(Number(result.order.total))}</span>
            </div>
          </div>

          {/* Need Help */}
          <div className="text-center py-4">
            <p className="text-xs text-steel">
              Need help with your order?{' '}
              <Link href="/contact" className="text-hydra hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
