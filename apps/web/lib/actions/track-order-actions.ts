'use server';

import { apiClient, ApiError } from '@/lib/api-client';

interface TrackedOrderLineItem {
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface TrackedOrder {
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  lineItems: TrackedOrderLineItem[];
  // Optional tracking fields (may not be available for all orders)
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export interface TrackOrderResult {
  ok: boolean;
  order?: TrackedOrder;
  error?: string;
}

// Deliberately no auth() call — this is the entire point of guest order
// tracking, matching guest checkout's own no-auth pattern. The API's own
// findByOrderNumberAndEmail throws the same generic error whether the
// order number is wrong or the email doesn't match; this surfaces that
// single, deliberately-generic message rather than trying to add its
// own more specific one that could leak which case it was.
export async function trackOrderAction(orderNumber: string, email: string): Promise<TrackOrderResult> {
  try {
    const order = await apiClient.post<TrackedOrder>('/v1/orders/track', { orderNumber, email });
    return { ok: true, order };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : 'Could not find a matching order',
    };
  }
}
