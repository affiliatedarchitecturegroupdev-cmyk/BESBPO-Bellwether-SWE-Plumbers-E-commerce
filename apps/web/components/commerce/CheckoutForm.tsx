'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitCheckoutAction, CheckoutResult } from '@/lib/actions/checkout-actions';
import { PayfastRedirectForm } from './PayfastRedirectForm';
import { Address } from '@/lib/types';

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

interface Props {
  savedAddresses: Address[];
  // Only true when the account has an approved TradeCreditAccount — see
  // the checkout page's server-side check against GET /v1/trade-credit/me.
  // A retail account never sees the trade-credit option at all, rather
  // than seeing it and having the API reject it.
  hasTradeCredit: boolean;
}

export function CheckoutForm({ savedAddresses, hasTradeCredit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<CheckoutResult['payfast'] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'trade_credit'>('payfast');
  const router = useRouter();

  // Fields stay uncontrolled — the saved-address picker sets .value
  // directly via these refs rather than lifting everything into React
  // state, since FormData reads whatever's actually in the DOM at submit
  // time regardless of how it got there.
  const line1Ref = useRef<HTMLInputElement>(null);
  const line2Ref = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const postalCodeRef = useRef<HTMLInputElement>(null);
  const provinceRef = useRef<HTMLSelectElement>(null);

  function applySavedAddress(addressId: string) {
    const address = savedAddresses.find((a) => a.id === addressId);
    if (!address) return;
    if (line1Ref.current) line1Ref.current.value = address.line1;
    if (line2Ref.current) line2Ref.current.value = address.line2 ?? '';
    if (cityRef.current) cityRef.current.value = address.city;
    if (postalCodeRef.current) postalCodeRef.current.value = address.postalCode;
    if (provinceRef.current) provinceRef.current.value = address.province;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('paymentMethod', paymentMethod);

    startTransition(async () => {
      const result = await submitCheckoutAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Checkout failed. Please try again.');
        return;
      }

      // Trade credit confirms immediately server-side — there's no
      // PayFast page to redirect to, so this goes straight to the same
      // confirmation page PayFast's own return_url lands on.
      if (result.confirmedOrderId) {
        router.push(`/checkout/success?orderId=${result.confirmedOrderId}`);
        return;
      }

      if (result.payfast) {
        // Order is created at this point — setting this state renders
        // PayfastRedirectForm, which submits itself on mount. There's no
        // "cancel" from here; the browser is about to leave for PayFast.
        setRedirect(result.payfast);
      }
    });
  }

  if (redirect) {
    return (
      <div>
        <p className="text-sm text-steel mb-2">Redirecting to PayFast to complete your payment…</p>
        <PayfastRedirectForm actionUrl={redirect.actionUrl} fields={redirect.fields} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {hasTradeCredit && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3">Payment Method</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('payfast')}
              className={`flex-1 border rounded-sm py-2.5 text-sm ${
                paymentMethod === 'payfast' ? 'border-hydra bg-[#EAF3F8]' : 'border-black/15'
              }`}
            >
              Pay with PayFast
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('trade_credit')}
              className={`flex-1 border rounded-sm py-2.5 text-sm ${
                paymentMethod === 'trade_credit' ? 'border-hydra bg-[#EAF3F8]' : 'border-black/15'
              }`}
            >
              Pay via Trade Credit
            </button>
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold mb-4">Delivery Address</h2>

      {savedAddresses.length > 0 && (
        <div className="mb-5">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Use a saved address
          </label>
          <select
            defaultValue=""
            onChange={(e) => e.target.value && applySavedAddress(e.target.value)}
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          >
            <option value="">— Enter manually —</option>
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.line1}, {address.city} {address.isDefault ? '(default)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Address Line 1
        </label>
        <input
          ref={line1Ref}
          name="line1"
          required
          defaultValue={savedAddresses.find((a) => a.isDefault)?.line1 ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Address Line 2 (optional)
        </label>
        <input
          ref={line2Ref}
          name="line2"
          defaultValue={savedAddresses.find((a) => a.isDefault)?.line2 ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">City</label>
          <input
            ref={cityRef}
            name="city"
            required
            defaultValue={savedAddresses.find((a) => a.isDefault)?.city ?? ''}
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Postal Code
          </label>
          <input
            ref={postalCodeRef}
            name="postalCode"
            required
            defaultValue={savedAddresses.find((a) => a.isDefault)?.postalCode ?? ''}
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Province
        </label>
        <select
          ref={provinceRef}
          name="province"
          required
          defaultValue={savedAddresses.find((a) => a.isDefault)?.province ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
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

      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          PO / Reference Number (optional)
        </label>
        <input
          name="poNumber"
          placeholder="Your own internal reference, if you use one"
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-ink text-white font-mono text-[12.5px] uppercase tracking-wide py-3.5 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Processing…' : paymentMethod === 'trade_credit' ? 'Confirm Order' : 'Pay with PayFast'}
      </button>
    </form>
  );
}
