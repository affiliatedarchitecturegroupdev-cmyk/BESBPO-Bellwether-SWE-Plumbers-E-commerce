'use client';

import { useState } from 'react';
import { getCourierInfo, CourierInfo } from '@/lib/courier';

interface OrderTrackingProps {
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  orderNumber: string;
  estimatedDelivery?: string;
}

export function OrderTrackingCard({
  courierName,
  trackingNumber,
  trackingUrl,
  orderNumber,
  estimatedDelivery,
}: OrderTrackingProps) {
  const [copied, setCopied] = useState(false);
  const courierInfo = getCourierInfo(courierName);

  const trackingUrlFinal = trackingUrl || (courierInfo?.trackingPage ?? null);

  async function copyTracking() {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="border border-black/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-hydra/5 to-transparent px-4 py-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-hydra/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-steel">Tracking</p>
              <h3 className="font-semibold text-sm">{courierInfo?.name || courierName || 'Pending Assignment'}</h3>
            </div>
          </div>
          {estimatedDelivery && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-steel uppercase tracking-wide">Est. Delivery</p>
              <p className="text-sm font-medium text-ink">{estimatedDelivery}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {trackingNumber ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wide text-steel mb-0.5">Tracking Number</p>
                <p className="font-mono text-sm font-semibold">{trackingNumber}</p>
              </div>
              <button
                onClick={copyTracking}
                className="text-xs text-hydra hover:text-hydra/80 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {trackingUrlFinal && (
              <a
                href={trackingUrlFinal}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-hydra text-white py-2.5 px-4 rounded-sm text-sm font-medium hover:bg-hydra/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Track on {courierInfo?.name || 'Courier'} Website
              </a>
            )}

            {courierInfo && (courierInfo.phone || courierInfo.email) && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <p className="text-[10px] font-mono uppercase tracking-wide text-steel mb-2">Need Help?</p>
                <div className="flex flex-wrap gap-3">
                  {courierInfo.phone && (
                    <a
                      href={`tel:${courierInfo.phone.replace(/\s/g, '')}`}
                      className="text-sm text-hydra flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {courierInfo.phone}
                    </a>
                  )}
                  {courierInfo.email && (
                    <a
                      href={`mailto:${courierInfo.email}`}
                      className="text-sm text-hydra flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {courierInfo.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-ink mb-1">Tracking Not Yet Available</p>
            <p className="text-xs text-steel">
              Your tracking number will be available once your order is dispatched.
            </p>
            <p className="text-xs text-steel mt-2">
              Order: <span className="font-mono">{orderNumber}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Order status timeline component
interface OrderStatus {
  status: string;
  label: string;
  description?: string;
  date?: string;
}

interface OrderStatusTimelineProps {
  currentStatus: string;
  statuses: OrderStatus[];
  currentDate?: string;
}

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_CONFIG: Record<string, { label: string; description: string; color: string }> = {
  PENDING: { label: 'Order Placed', description: 'Your order has been received', color: 'bg-blue-500' },
  CONFIRMED: { label: 'Confirmed', description: 'Your order has been confirmed', color: 'bg-blue-500' },
  PROCESSING: { label: 'Processing', description: 'Your order is being prepared', color: 'bg-indigo-500' },
  SHIPPED: { label: 'Shipped', description: 'Your order has been dispatched', color: 'bg-purple-500' },
  DELIVERED: { label: 'Delivered', description: 'Your order has been delivered', color: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', description: 'Your order has been cancelled', color: 'bg-red-500' },
};

export function OrderStatusTimeline({ currentStatus, statuses, currentDate }: OrderStatusTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="py-4">
      <h4 className="font-mono text-[10px] uppercase tracking-wide text-steel mb-4">Order Progress</h4>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />
        {!isCancelled && currentIndex >= 0 && (
          <div
            className="absolute left-[15px] top-0 w-0.5 bg-green-500 transition-all"
            style={{ height: `${Math.min((currentIndex / (STATUS_ORDER.length - 1)) * 100, 100)}%` }}
          />
        )}

        {/* Status steps */}
        <div className="space-y-6">
          {STATUS_ORDER.slice(0, isCancelled ? 1 : STATUS_ORDER.length).map((status, index) => {
            const config = STATUS_CONFIG[status];
            const isCompleted = !isCancelled && index < currentIndex;
            const isCurrent = !isCancelled && index === currentIndex;
            const statusData = statuses.find((s) => s.status === status);

            return (
              <div key={status} className="flex items-start gap-4 relative">
                {/* Dot */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    isCompleted || isCurrent ? config.color : 'bg-gray-200'
                  } ${isCancelled && status === 'PENDING' ? 'ring-4 ring-red-200' : ''}`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono text-gray-500">{index + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted || isCurrent ? 'text-ink' : 'text-steel'
                      }`}
                    >
                      {isCancelled ? 'Order Cancelled' : config.label}
                    </p>
                    {statusData?.date && (
                      <span className="text-xs text-steel">{statusData.date}</span>
                    )}
                    {isCurrent && currentDate && (
                      <span className="text-xs text-steel">{currentDate}</span>
                    )}
                  </div>
                  <p className="text-xs text-steel mt-0.5">
                    {isCancelled ? 'This order has been cancelled' : config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
