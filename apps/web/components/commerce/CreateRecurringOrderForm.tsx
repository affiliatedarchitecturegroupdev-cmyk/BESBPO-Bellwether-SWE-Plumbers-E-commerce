'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRecurringOrderAction } from '@/lib/actions/recurring-order-actions';
import { ProductCombobox } from './ProductCombobox';

interface SelectedItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

// Rebuilt around ProductCombobox instead of a server-fetched, static
// <select> of up to 200 products — see that component's own comment for
// why (the old fetch was silently failing against the API's own
// pageSize cap, and even a working dropdown would have been unusable at
// this catalog's real size).
export function CreateRecurringOrderForm() {
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    const form = e.currentTarget;
    formData.set('itemCount', String(items.length));
    items.forEach((item, i) => {
      formData.set(`items[${i}].productId`, item.productId);
      formData.set(`items[${i}].quantity`, String(item.quantity));
    });

    setError(null);
    startTransition(async () => {
      const result = await createRecurringOrderAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not create the recurring order');
        return;
      }
      form.reset();
      setItems([]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-black/10 rounded-sm p-5 mb-8">
      <h2 className="text-base font-semibold mb-4">New Recurring Order</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          name="name"
          required
          placeholder="Name (e.g. Monthly consumables)"
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <select name="frequency" required className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm">
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2 mt-4">Items</p>
      <ProductCombobox onSelect={addItem} excludeIds={items.map((i) => i.productId)} />

      {items.length > 0 && (
        <div className="mt-3 mb-4">
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

      <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2 mt-4">Delivery Address</p>
      <input
        name="line1"
        required
        placeholder="Address line 1"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
      />
      <input
        name="line2"
        placeholder="Address line 2 (optional)"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
      />
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
      <select
        name="province"
        required
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-4"
      >
        <option value="" disabled>
          Select a province
        </option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <input
        name="poNumber"
        placeholder="PO / Reference number (optional)"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-4"
      />

      {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11.5px] uppercase tracking-wide bg-ink text-white px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Recurring Order'}
      </button>
    </form>
  );
}
