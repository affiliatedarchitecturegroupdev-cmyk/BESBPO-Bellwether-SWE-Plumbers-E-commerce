'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product } from '@/lib/types';

interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  product?: {
    id: string;
    slug: string;
    name: string;
    sku: string;
    retailPrice: string;
    stockQty: number;
    images: { id: string; url: string; sortOrder: number }[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  lineItems: OrderLineItem[];
}

interface QuickReorderTableProps {
  orders: Order[];
  accessToken: string;
}

export function QuickReorderTable({ orders, accessToken }: QuickReorderTableProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function toggleItem(productId: string, maxQty: number, currentQty: number) {
    setSelectedItems((prev) => {
      if (prev[productId]) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: currentQty > 0 ? currentQty : 1 };
    });
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) {
      setSelectedItems((prev) => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setSelectedItems((prev) => ({ ...prev, [productId]: qty }));
    }
  }

  function handleAddToCart() {
    const items = Object.entries(selectedItems);
    if (items.length === 0) return;

    startTransition(async () => {
      setError(null);
      try {
        for (const [productId, qty] of items) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cart/lines`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ productId, quantity: qty }),
          });
        }
        setSuccess(true);
        setSelectedItems({});
        setTimeout(() => {
          setSuccess(false);
          router.push('/cart');
        }, 1500);
      } catch {
        setError('Failed to add items to cart. Please try again.');
      }
    });
  }

  const selectedCount = Object.keys(selectedItems).length;
  const selectedTotal = Object.entries(selectedItems).reduce((sum, [productId, qty]) => {
    const item = orders.flatMap((o) => o.lineItems).find((li) => li.productId === productId);
    return sum + (item ? Number(item.unitPrice) * qty : 0);
  }, 0);

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-black/15 rounded-sm">
        <svg className="w-12 h-12 text-steel mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-steel text-sm">No past orders found.</p>
        <Link href="/search" className="text-hydra text-sm hover:underline mt-2 inline-block">
          Browse products →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Items Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-hydra/5 border border-hydra/20 rounded-sm p-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-steel">Selected</p>
            <p className="font-display text-xl font-bold">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</p>
          </div>
          {selectedCount > 0 && (
            <div className="h-8 w-px bg-black/10 hidden sm:block" />
          )}
          {selectedCount > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-steel">Est. Total</p>
              <p className="font-mono text-sm">R{selectedTotal.toFixed(2)}</p>
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <button
            onClick={handleAddToCart}
            disabled={isPending}
            className="bg-hydra text-white font-mono text-[11px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60 hover:bg-hydra/90 transition-colors"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding to cart…
              </span>
            ) : (
              `Add ${selectedCount} item${selectedCount !== 1 ? 's' : ''} to Cart`
            )}
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 text-sm">Items added to cart! Redirecting to cart...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-8">
        {orders.map((order) => (
          <div key={order.id} className="border border-black/10 rounded-sm overflow-hidden">
            {/* Order Header */}
            <div className="bg-black/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <Link href={`/account/orders/${order.id}`} className="font-mono text-sm font-semibold hover:text-hydra">
                  {order.orderNumber}
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-wide text-steel">{order.status}</span>
              </div>
              <span className="text-xs text-steel">
                {new Date(order.createdAt).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Line Items */}
            <div className="divide-y divide-black/5">
              {order.lineItems.map((item) => {
                const isSelected = !!selectedItems[item.productId];
                const qty = selectedItems[item.productId] ?? item.quantity;
                const inStock = item.product?.stockQty ?? 0 > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 flex items-start gap-4 transition-colors ${
                      isSelected ? 'bg-hydra/5' : 'hover:bg-black/[0.02]'
                    }`}
                  >
                    {/* Checkbox */}
                    <label className="flex-shrink-0 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.productId, item.product?.stockQty ?? 0, item.quantity)}
                        className="w-4 h-4 rounded border-black/20 text-hydra focus:ring-hydra cursor-pointer"
                      />
                    </label>

                    {/* Product Image */}
                    <div className="w-16 h-16 bg-black/5 rounded-sm flex-shrink-0 overflow-hidden">
                      {item.product?.images?.[0]?.url ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-steel text-xs">No img</div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm truncate">{item.productName}</p>
                          <p className="font-mono text-[10px] text-steel mt-0.5">SKU: {item.sku}</p>
                        </div>
                        <p className="font-mono text-sm flex-shrink-0">
                          R{Number(item.unitPrice).toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-black/15 rounded-sm">
                          <button
                            onClick={() => updateQuantity(item.productId, qty - 1)}
                            className="w-8 h-8 flex items-center justify-center text-steel hover:bg-black/5 transition-colors"
                            disabled={qty <= 1}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-12 h-8 text-center text-sm border-x border-black/15 focus:outline-none"
                          />
                          <button
                            onClick={() => updateQuantity(item.productId, qty + 1)}
                            className="w-8 h-8 flex items-center justify-center text-steel hover:bg-black/5 transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {inStock ? (
                          <span className="font-mono text-[10px] text-green-600">In stock</span>
                        ) : (
                          <span className="font-mono text-[10px] text-red-500">Out of stock</span>
                        )}

                        <span className="font-mono text-[10px] text-steel ml-auto">
                          Subtotal: R{(Number(item.unitPrice) * qty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
