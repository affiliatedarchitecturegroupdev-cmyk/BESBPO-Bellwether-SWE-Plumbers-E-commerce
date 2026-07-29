'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitSplitCheckoutAction } from '@/lib/actions/split-checkout-actions';
import { PricedCartLine } from '@/lib/types';

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

type GroupKey = 'A' | 'B';

interface AddressFields {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
}

const emptyAddress: AddressFields = { line1: '', line2: '', city: '', province: '', postalCode: '' };

function AddressFieldset({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AddressFields;
  onChange: (fields: AddressFields) => void;
}) {
  return (
    <div className="border border-black/10 rounded-sm p-4">
      <h3 className="text-sm font-semibold mb-3">{label}</h3>
      <input
        value={value.line1}
        onChange={(e) => onChange({ ...value, line1: e.target.value })}
        placeholder="Address line 1"
        required
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
      />
      <input
        value={value.line2}
        onChange={(e) => onChange({ ...value, line2: e.target.value })}
        placeholder="Address line 2 (optional)"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          placeholder="City"
          required
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
        <input
          value={value.postalCode}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
          placeholder="Postal code"
          required
          className="border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
        />
      </div>
      <select
        value={value.province}
        onChange={(e) => onChange({ ...value, province: e.target.value })}
        required
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
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
    </div>
  );
}

// Deliberately two fixed destination groups, not an arbitrary number —
// covers the core "a couple of job sites in one order" case the
// original gap named, without the added complexity of a fully dynamic
// N-way split. A real, stated scope boundary, not an oversight — see
// docs/AGENTS.md's split checkout section.
export function SplitCheckoutForm({ lines }: { lines: PricedCartLine[] }) {
  const [assignments, setAssignments] = useState<Record<string, GroupKey>>(
    Object.fromEntries(lines.map((line) => [line.cartItemId, 'A' as GroupKey])),
  );
  const [addressA, setAddressA] = useState<AddressFields>(emptyAddress);
  const [addressB, setAddressB] = useState<AddressFields>(emptyAddress);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderIds: string[] } | null>(null);
  const router = useRouter();

  const groupAItems = lines.filter((line) => assignments[line.cartItemId] === 'A');
  const groupBItems = lines.filter((line) => assignments[line.cartItemId] === 'B');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const groups = [
      { ...addressA, cartItemIds: groupAItems.map((l) => l.cartItemId) },
      { ...addressB, cartItemIds: groupBItems.map((l) => l.cartItemId) },
    ].filter((g) => g.cartItemIds.length > 0);

    if (groups.length < 2) {
      setError('Assign at least one item to each destination to split checkout — otherwise use regular checkout.');
      return;
    }

    startTransition(async () => {
      const outcome = await submitSplitCheckoutAction(groups);
      if (!outcome.ok) {
        setError(
          `${outcome.error}${
            outcome.orderIds?.length
              ? ` (${outcome.orderIds.length} destination${outcome.orderIds.length === 1 ? '' : 's'} already checked out successfully before this failure — those orders are real and stand as-is.)`
              : ''
          }`,
        );
        return;
      }
      setResult({ orderIds: outcome.orderIds ?? [] });
      router.refresh();
    });
  }

  if (result) {
    return (
      <div className="max-w-lg">
        <h2 className="text-base font-semibold mb-2">Split order confirmed</h2>
        <p className="text-sm text-steel">
          {result.orderIds.length} separate orders were created, one per destination address, each confirmed
          against your trade credit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <h2 className="text-base font-semibold mb-1">Split Checkout</h2>
      <p className="text-sm text-steel mb-6">
        Assign each item to Destination A or B, then check out both — each becomes its own order, confirmed
        against your trade credit. Available for trade credit only; PayFast redirects away from this page, so it
        can&apos;t handle more than one destination in a single session.
      </p>

      <div className="mb-6">
        {lines.map((line) => (
          <div key={line.cartItemId} className="flex items-center justify-between py-2 border-b border-black/5">
            <span className="text-sm">
              {line.quantity} × {line.name}
            </span>
            <div className="flex gap-1">
              {(['A', 'B'] as GroupKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAssignments((prev) => ({ ...prev, [line.cartItemId]: key }))}
                  className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1 rounded-sm ${
                    assignments[line.cartItemId] === key ? 'bg-ink text-white' : 'border border-black/15'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <AddressFieldset
          label={`Destination A (${groupAItems.length} item${groupAItems.length === 1 ? '' : 's'})`}
          value={addressA}
          onChange={setAddressA}
        />
        <AddressFieldset
          label={`Destination B (${groupBItems.length} item${groupBItems.length === 1 ? '' : 's'})`}
          value={addressB}
          onChange={setAddressB}
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-ink text-white font-mono text-[12.5px] uppercase tracking-wide py-3.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Processing…' : 'Confirm Split Order'}
      </button>
    </form>
  );
}
