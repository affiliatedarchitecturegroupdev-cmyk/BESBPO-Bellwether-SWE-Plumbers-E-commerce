'use client';

import { useState, useTransition } from 'react';

interface PriceAlertButtonProps {
  productId: string;
  productName: string;
  currentPrice: string;
  hasAlert?: boolean;
  accessToken: string;
}

export function PriceAlertButton({ productId, productName, currentPrice, hasAlert = false, accessToken }: PriceAlertButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(hasAlert);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleAlert() {
    if (isSubscribed) {
      // Unsubscribe - would call DELETE /v1/price-alerts/:productId
      startTransition(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/price-alerts/${productId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setIsSubscribed(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } catch {
          setError('Failed to remove price alert.');
        }
      });
    } else {
      // Subscribe - would call POST /v1/price-alerts
      startTransition(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/price-alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ productId }),
          });
          setIsSubscribed(true);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } catch {
          setError('Failed to set price alert.');
        }
      });
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleToggleAlert}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
          isSubscribed
            ? 'text-green-600 hover:text-green-700'
            : 'text-steel hover:text-hydra'
        }`}
        title={isSubscribed ? 'Click to unsubscribe from price alerts' : 'Get notified when price drops'}
      >
        {isPending ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isSubscribed ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2 15l-5-5 1.414-1.414L10 14.172l7.07-7.071L18.485 8.51 10 17l-2-2z" fill="white" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )}
        <span className="font-mono text-[10px] uppercase tracking-wide">
          {isSubscribed ? 'Alert On' : 'Alert'}
        </span>
      </button>

      {showSuccess && (
        <span className="text-green-600 font-mono text-[10px]">
          {isSubscribed ? 'Alert set!' : 'Alert removed'}
        </span>
      )}

      {error && (
        <span className="text-red-500 font-mono text-[10px]">{error}</span>
      )}
    </div>
  );
}
