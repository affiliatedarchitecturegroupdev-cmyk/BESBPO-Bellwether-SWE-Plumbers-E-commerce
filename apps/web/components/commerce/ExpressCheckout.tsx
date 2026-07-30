'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Address } from '@/lib/types';

interface SavedAddress extends Address {
  label?: string;
}

interface ExpressCheckoutProps {
  savedAddresses: SavedAddress[];
  hasTradeCredit?: boolean;
  onSelectAddress?: (address: SavedAddress) => void;
  selectedAddressId?: string;
}

export function ExpressCheckoutPanel({
  savedAddresses,
  hasTradeCredit = false,
  onSelectAddress,
  selectedAddressId,
}: ExpressCheckoutProps) {
  const [showAll, setShowAll] = useState(false);

  const displayAddresses = showAll ? savedAddresses : savedAddresses.slice(0, 3);
  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];

  return (
    <div className="bg-[#FAFAFA] border border-black/10 rounded-sm p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Express Checkout
      </h3>

      {savedAddresses.length === 0 ? (
        <div className="text-sm text-steel">
          <p className="mb-3">Speed up your checkout by saving your addresses.</p>
          <Link href="/account/addresses" className="text-hydra hover:underline text-xs">
            Manage addresses →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayAddresses.map((address) => (
            <button
              key={address.id}
              onClick={() => onSelectAddress?.(address)}
              className={`w-full text-left p-3 rounded-sm border transition-colors ${
                selectedAddressId === address.id || (!selectedAddressId && address.id === defaultAddress?.id)
                  ? 'border-hydra bg-white'
                  : 'border-black/10 bg-white hover:border-steel'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {address.label && (
                    <p className="text-xs font-medium text-ink mb-0.5">{address.label}</p>
                  )}
                  <p className="text-sm text-[#4A5157] truncate">{address.line1}</p>
                  <p className="text-xs text-steel">
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                </div>
                {(address.id === defaultAddress?.id || address.isDefault) && (
                  <span className="text-[10px] font-mono text-hydra bg-hydra/10 px-1.5 py-0.5 rounded">
                    DEFAULT
                  </span>
                )}
              </div>
            </button>
          ))}

          {savedAddresses.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-hydra hover:underline w-full text-left py-1"
            >
              {showAll ? 'Show less' : `Show ${savedAddresses.length - 3} more addresses`}
            </button>
          )}
        </div>
      )}

      {hasTradeCredit && (
        <div className="mt-4 pt-4 border-t border-black/10">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-hydra/10 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-ink text-sm">Trade Credit Available</p>
              <p className="text-xs text-steel">Pay on your trade account terms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PaymentMethodOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

interface PaymentMethodSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
  showTradeCredit?: boolean;
}

export function PaymentMethodSelector({ selected, onSelect, showTradeCredit = false }: PaymentMethodSelectorProps) {
  const methods: PaymentMethodOption[] = [
    {
      id: 'payfast',
      label: 'Credit/Debit Card',
      description: 'Pay securely via PayFast',
      recommended: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'ozow',
      label: 'Instant EFT',
      description: 'Pay directly from your bank account',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    ...(showTradeCredit
      ? [
          {
            id: 'trade_credit',
            label: 'Trade Credit',
            description: 'Pay on your approved trade terms',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          } as PaymentMethodOption,
        ]
      : []),
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-3">Payment Method</h3>
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-sm border transition-colors ${
            selected === method.id
              ? 'border-hydra bg-[#EAF3F8]'
              : 'border-black/10 bg-white hover:border-steel'
          }`}
        >
          <div className={`${selected === method.id ? 'text-hydra' : 'text-steel'}`}>{method.icon}</div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-ink">{method.label}</p>
              {method.recommended && (
                <span className="text-[10px] font-mono text-hydra bg-hydra/10 px-1.5 py-0.5 rounded">
                  RECOMMENDED
                </span>
              )}
            </div>
            <p className="text-xs text-steel">{method.description}</p>
          </div>
          <div
            className={`w-4 h-4 rounded-full border-2 ${
              selected === method.id ? 'border-hydra bg-hydra' : 'border-steel'
            }`}
          >
            {selected === method.id && (
              <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// Saved payment methods indicator (placeholder for future Stripe integration)
interface SavedPaymentMethodsProps {
  hasSavedCard?: boolean;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export function SavedPaymentMethodBadge({ hasSavedCard, last4, expiryMonth, expiryYear }: SavedPaymentMethodsProps) {
  if (!hasSavedCard) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-sm">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>•••• {last4} (exp {expiryMonth}/{expiryYear})</span>
    </div>
  );
}
