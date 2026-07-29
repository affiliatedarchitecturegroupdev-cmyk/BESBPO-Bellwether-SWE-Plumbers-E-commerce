'use client';

import { useState, useTransition } from 'react';
import { guestCheckoutAction, GuestCheckoutResult } from '@/lib/actions/guest-checkout-actions';
import { PayfastRedirectForm } from './PayfastRedirectForm';
import { ProductCombobox } from './ProductCombobox';

interface SelectedItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

// Rebuilt around ProductCombobox instead of a server-fetched, static
// <select> of up to 200 products — see that component's own comment for
// why (the old fetch was silently failing against the API's own
// pageSize cap, and even a working dropdown would have been unusable at
// this catalog's real size).
export function GuestCheckoutForm() {
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<GuestCheckoutResult['payfast'] | null>(null);

  function addItem(product: { id: string; name: string; sku: string }) {
    setItems((prev) => [...prev, { productId: product.id, name: product.name, sku: product.sku, quantity: 1 }]);
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Add at least one item.');
      return;
    }

    const formData = new FormData(e.currentTarget);

    // Selected items are React state, not native form fields — encoded
    // onto the FormData manually here rather than trying to name them so
    // the browser's own form serialization would pick them up.
    formData.set('itemCount', String(items.length));
    items.forEach((item, i) => {
      formData.set(`items[${i}].productId`, item.productId);
      formData.set(`items[${i}].quantity`, String(item.quantity));
    });

    setError(null);
    startTransition(async () => {
      const result = await guestCheckoutAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Checkout failed. Please try again.');
        return;
      }
      if (result.payfast) {
        setRedirect(result.payfast);
      }
    });
  }

  if (redirect) {
    return <PayfastRedirectForm actionUrl={redirect.actionUrl} fields={redirect.fields} />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">What you need</p>
      <ProductCombobox onSelect={addItem} excludeIds={items.map((i) => i.productId)} />

      {items.length > 0 && (
        <div className="mt-3 mb-2">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 py-1.5 border-b border-black/5">
              <span className="flex-1 text-sm">
                {item.name} <span className="font-mono text-[11px] text-steel">({item.sku})</span>
              </span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                className="w-16 border border-black/15 rounded-sm px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="font-mono text-[11px] text-steel hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-6" />

      <div className="mb-3">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
        <p className="text-[12px] text-steel mt-1">Your order confirmation and receipt go here.</p>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3 mt-6">Delivery address</p>
      <div className="mb-2">
        <input
          name="line1"
          required
          placeholder="Address line 1"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="mb-2">
        <input
          name="line2"
          placeholder="Address line 2 (optional)"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          name="city"
          required
          placeholder="City"
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <input
          name="postalCode"
          required
          placeholder="Postal code"
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="mb-6">
        <input
          name="province"
          required
          placeholder="Province"
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-3 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Processing…' : 'Pay with PayFast'}
      </button>
    </form>
  );
}
