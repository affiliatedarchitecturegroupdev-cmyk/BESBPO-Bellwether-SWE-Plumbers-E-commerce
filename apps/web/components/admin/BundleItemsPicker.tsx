'use client';

import { useState } from 'react';
import { ProductCombobox } from '@/components/commerce/ProductCombobox';

interface SelectedItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

// FormData has no native way to represent a dynamic array of
// {productId, quantity} pairs — this manages that array as real React
// state, then serializes it into a hidden input on every change so the
// surrounding <form>'s FormData includes it as plain JSON (see
// lib/actions/admin-bundles.ts's parseItemsField). Rebuilt around
// ProductCombobox instead of a server-fetched, static <select> of up to
// 200 products — see that component's own comment for why (the old
// fetch was silently failing against the API's own pageSize cap).
export function BundleItemsPicker() {
  const [items, setItems] = useState<SelectedItem[]>([]);

  function addItem(product: { id: string; name: string; sku: string }) {
    setItems((prev) => [...prev, { productId: product.id, name: product.name, sku: product.sku, quantity: 1 }]);
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  return (
    <div>
      <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
        Bundle Items
      </label>
      <ProductCombobox onSelect={addItem} excludeIds={items.map((i) => i.productId)} />

      {items.length > 0 && (
        <div className="mt-2 mb-2">
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

      <input
        type="hidden"
        name="itemsJson"
        value={JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity })))}
      />
    </div>
  );
}
