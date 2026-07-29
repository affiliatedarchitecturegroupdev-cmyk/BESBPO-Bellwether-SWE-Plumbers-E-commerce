'use client';

import { useState, useTransition } from 'react';
import { createReturnRequestAction } from '@/lib/actions/return-actions';

interface LineItem {
  id: string;
  productName: string;
  quantity: number;
}

interface Row {
  rowId: string;
  orderLineItemId: string;
  quantity: number;
}

const REASONS = [
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong item received' },
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in transit' },
  { value: 'NO_LONGER_NEEDED', label: 'No longer needed' },
  { value: 'OTHER', label: 'Other' },
];

export function RequestReturnForm({ orderId, lineItems }: { orderId: string; lineItems: LineItem[] }) {
  const [rows, setRows] = useState<Row[]>([{ rowId: crypto.randomUUID(), orderLineItemId: '', quantity: 1 }]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function addRow() {
    setRows((prev) => [...prev, { rowId: crypto.randomUUID(), orderLineItemId: '', quantity: 1 }]);
  }

  function updateRow(rowId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('itemCount', String(rows.length));
    rows.forEach((row, i) => {
      formData.set(`items[${i}].orderLineItemId`, row.orderLineItemId);
      formData.set(`items[${i}].quantity`, String(row.quantity));
    });

    startTransition(async () => {
      const outcome = await createReturnRequestAction(orderId, formData);
      setResult(outcome);
    });
  }

  if (result?.ok) {
    return (
      <p className="text-sm text-[#1E8E5A] py-3">
        Return request submitted — we&apos;ll review it and get back to you.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-black/10 pt-5 mt-5">
      <h3 className="text-sm font-semibold mb-3">Request a Return</h3>

      {rows.map((row) => (
        <div key={row.rowId} className="flex gap-2 mb-2">
          <select
            value={row.orderLineItemId}
            onChange={(e) => updateRow(row.rowId, { orderLineItemId: e.target.value })}
            required
            className="flex-1 border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
          >
            <option value="">Select an item…</option>
            {lineItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.productName} (qty {item.quantity})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={row.quantity}
            onChange={(e) => updateRow(row.rowId, { quantity: Number(e.target.value) })}
            className="w-16 border border-black/15 rounded-sm px-2 py-1.5 text-sm"
          />
        </div>
      ))}
      <button type="button" onClick={addRow} className="font-mono text-[11px] text-hydra mb-3">
        + Add another item
      </button>

      <select name="reason" required className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2">
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        name="reasonDetail"
        placeholder="Any more detail (optional)"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm min-h-[60px] mb-3"
      />

      {result?.error && <p className="text-[12.5px] text-red-600 mb-3">{result.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[11.5px] uppercase tracking-wide bg-ink text-white px-5 py-2.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit Return Request'}
      </button>
    </form>
  );
}
