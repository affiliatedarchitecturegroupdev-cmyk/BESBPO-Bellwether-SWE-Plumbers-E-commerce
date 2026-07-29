'use client';

import { useState, useTransition } from 'react';
import { trackOrderAction, TrackOrderResult } from '@/lib/actions/track-order-actions';

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
    <div className="max-w-[520px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Track Your Order</h1>
      <p className="text-sm text-steel mb-8">
        Enter your order number (from your confirmation email) and the email address you used at checkout.
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
          placeholder="Order number (e.g. BSWE-1042)"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm mb-2"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Email used at checkout"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm mb-4"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-3 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Looking up…' : 'Track Order'}
        </button>
      </form>

      {result && !result.ok && <p className="text-[13px] text-red-600 mb-4">{result.error}</p>}

      {result?.ok && result.order && (
        <div className="border border-black/10 rounded-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm">{result.order.orderNumber}</span>
            <span className="font-mono text-[11px] uppercase tracking-wide text-hydra">
              {STATUS_LABELS[result.order.status] ?? result.order.status}
            </span>
          </div>
          <ul className="text-sm mb-3">
            {result.order.lineItems.map((item, i) => (
              <li key={i} className="flex justify-between py-1">
                <span>
                  {item.quantity} × {item.productName}
                </span>
                <span className="font-mono">{zar.format(Number(item.lineTotal))}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold text-sm border-t border-black/10 pt-2">
            <span>Total</span>
            <span>{zar.format(Number(result.order.total))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
