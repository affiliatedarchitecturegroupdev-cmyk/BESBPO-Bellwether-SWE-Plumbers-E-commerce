'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

async function requireAccessToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.accessToken;
}

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function updateOrderStatusAction(orderId: string, status: string): Promise<AdminActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(`/v1/orders/${orderId}/status`, { status }, { accessToken });
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update order status' };
  }
}

// Separate from updateOrderStatusAction (used by the plain StatusSelect on
// the orders list) — this one submits status alongside courier/tracking
// fields together, for the richer form on the order detail page.
export async function updateOrderFulfillmentAction(formData: FormData): Promise<AdminActionResult> {
  const orderId = formData.get('orderId') as string;
  const trackingUrl = formData.get('trackingUrl') as string;

  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(
      `/v1/orders/${orderId}/status`,
      {
        status: formData.get('status'),
        courierName: formData.get('courierName') || undefined,
        trackingNumber: formData.get('trackingNumber') || undefined,
        // Empty string would fail the API's @IsUrl() validation — omit
        // entirely rather than send a blank string through.
        ...(trackingUrl ? { trackingUrl } : {}),
      },
      { accessToken },
    );
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update order' };
  }
}
