'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface CancelOrderResult {
  ok: boolean;
  error?: string;
}

export async function cancelOrderAction(orderId: string): Promise<CancelOrderResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(`/v1/payments/orders/${orderId}/cancel`, {}, { accessToken: session.accessToken });
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath('/account/orders');
    return { ok: true };
  } catch (err) {
    // ApiError's message is the API's actual error text (e.g. "Order can
    // no longer be cancelled (status: DISPATCHED)") — surfacing that
    // directly is far more useful here than a generic failure string.
    const message = err instanceof ApiError ? err.message : 'Could not cancel order';
    return { ok: false, error: message };
  }
}
